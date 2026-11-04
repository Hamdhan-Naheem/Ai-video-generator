import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { restrictLocalBindings, verifyLocalBindings } from './local-docker.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const project = 'ai-video-studio-local';
const network = `${project}-network`;
const container = `supabase_db_${project}`;
const cli = resolve(root,'node_modules/supabase/dist/supabase.js');
const config = readFileSync(resolve(root,'supabase/config.toml'),'utf8');
if (!config.includes(`project_id = "${project}"`) || !config.includes('port = 55422')) {
  throw new Error('Local database safety check failed: unexpected project or database port.');
}
const command = process.argv[2];
const cache = resolve(root,'.cache');
mkdirSync(cache,{recursive:true});
const environment = {...process.env, DO_NOT_TRACK:'1'};

export function psql(sql) {
  return new Promise((done,reject) => {
    const child = spawn('docker',['exec','-i',container,'psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],
      {cwd:root,env:environment,windowsHide:true,stdio:['pipe','pipe','pipe']});
    let out='',err='';
    child.stdout.on('data',chunk=>out+=chunk);
    child.stderr.on('data',chunk=>err+=chunk);
    child.on('error',reject);
    child.on('close',code=>done({code,out,err}));
    child.stdin.end('\\set VERBOSITY sqlstate\n'+sql);
  });
}
function supabase(args) {
  if (!existsSync(cli)) {
    throw new Error('Supabase development CLI is missing. From the project root run: npm install --include=dev --include=optional. Then retry npm run db:start. Existing database containers and data are unaffected.');
  }
  // CLI 2.122 type generation runs in-process over the configured host port, not Docker.
  const networkArgs=args[0]==='gen'?[]:['--network-id',network];
  return spawnSync(process.execPath,[cli,...args,...networkArgs],{cwd:root,env:environment,encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
}
function verifyNetwork() {
  let result=spawnSync('docker',['network','inspect',network,'--format','{{json .Options}}'],{encoding:'utf8',windowsHide:true});
  if(result.status!==0) {
    result=spawnSync('docker',['network','create','-o','com.docker.network.bridge.host_binding_ipv4=127.0.0.1',network],{encoding:'utf8',windowsHide:true});
    if(result.status!==0) throw new Error('Cannot create application-local Docker network. Start Docker Desktop.');
    result=spawnSync('docker',['network','inspect',network,'--format','{{json .Options}}'],{encoding:'utf8',windowsHide:true});
  }
  if(JSON.parse(result.stdout)['com.docker.network.bridge.host_binding_ipv4']!=='127.0.0.1') throw new Error('Local Docker network must bind published ports to 127.0.0.1.');
}
function safeResult(result, name) {
  // CLI start/status/reset can print keys. Store these only in the ignored local cache.
  writeFileSync(resolve(cache,`supabase-${name}.log`),(result.stdout??'')+(result.stderr??''));
  if (result.status !== 0 && (result.stderr ?? '').includes('No matching Supabase CLI binary package found')) {
    throw new Error('Supabase CLI platform binary is missing. Run npm install --include=dev --include=optional, wait for it to finish, then retry npm run db:start.');
  }
  if(result.status!==0) throw new Error(`Local database ${name} failed. Inspect ignored .cache/supabase-${name}.log locally; do not share keys from it.`);
}
function schemaDump() {
  const result=spawnSync('docker',['exec',container,'pg_dump','-U','postgres','-d','postgres','--schema-only','--schema=public','--schema=private','--no-owner'],
    {encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024});
  if(result.status!==0) throw new Error('Local schema comparison dump failed.');
  // pg_dump adds a fresh random psql restriction token; it is not part of the schema.
  return result.stdout.split(/\r?\n/).filter(line=>!line.startsWith('\\restrict ')&&!line.startsWith('\\unrestrict ')).join('\n');
}
async function concurrency() {
  const user='a0000000-0000-4000-8000-000000000001';
  const draft='a0000000-0000-4000-8000-000000000002';
  const fixture=await psql(`begin; insert into auth.users(id,email,raw_user_meta_data) values('${user}','race@example.invalid','{"display_name":"Race fixture"}');
    insert into public.projects(id,owner_id,title,mode) values('${draft}','${user}','Race fixture','education'); commit;`);
  if(fixture.code!==0) throw new Error(`Concurrency fixture failed: ${fixture.err}`);
  try {
    const actor=`set local role authenticated; select set_config('request.jwt.claims','{"sub":"${user}","role":"authenticated"}',true);`;
    const writers=await Promise.all(['First','Second'].map(title=>psql(`begin; ${actor}
      select * from public.save_project_draft('${draft}',1,'${title}','education','{}','{}'); select pg_sleep(0.3); commit;`)));
    if(writers.filter(r=>r.code===0).length!==1 || writers.filter(r=>r.code!==0 && r.err.includes('40001')).length!==1) {
      throw new Error(`Concurrent optimistic writes did not produce one success and one conflict: ${JSON.stringify(writers)}`);
    }
    const version=await psql(`select draft_version from public.projects where id='${draft}';`);
    if(version.out.trim()!=='2') throw new Error('Concurrent write advanced draft more than once.');
    const rollback=await psql(`begin; ${actor} select * from public.save_project_draft('${draft}',2,'Rollback','education','{}','{}');
      do $$begin raise exception 'deliberate fixture rollback'; end$$; commit;`);
    const after=await psql(`select draft_version from public.projects where id='${draft}';`);
    if(rollback.code===0 || after.out.trim()!=='2') throw new Error('Failed transaction did not roll back draft version.');
    console.log('PASS: two real concurrent sessions: one edit commits, one conflicts; failed transaction rolls back.');
    const revisions=await psql(`insert into public.revisions(id,project_id,owner_id,revision_number,input_snapshot,input_hash,request_kind,target_seconds,orientation,voice_profile_id,schema_version,prompt_version,composition_version)
      select ('a0000000-0000-4000-8000-00000000000'||n)::uuid,'${draft}','${user}',n-2,'{}',repeat('a',64),'initial',60,'landscape','Kore',1,'v1','v1' from generate_series(3,4) n;`);
    if(revisions.code!==0) throw new Error(`Capacity fixture failed: ${revisions.err}`);
    const jobs=await Promise.all([3,4].map(n=>psql(`begin; insert into public.jobs(project_id,owner_id,revision_id,kind)
      values('${draft}','${user}','a0000000-0000-4000-8000-00000000000${n}','generation'); select pg_sleep(0.3); commit;`)));
    if(jobs.filter(r=>r.code===0).length!==1 || jobs.filter(r=>r.code!==0 && r.err.includes('23505')).length!==1) throw new Error('Concurrent active-job uniqueness guard failed.');
    console.log('PASS: two concurrent privileged job inserts cannot create two active jobs for one owner.');
  } finally {
    const clean=await psql(`begin; delete from public.jobs where project_id='${draft}' and owner_id='${user}';
      delete from public.revisions where project_id='${draft}' and owner_id='${user}';
      delete from public.projects where id='${draft}' and owner_id='${user}';
      delete from public.profiles where id='${user}'; delete from auth.users where id='${user}'; commit;`);
    if(clean.code!==0) throw new Error('Synthetic concurrency fixture cleanup failed.');
  }
}

if(command==='start') {
  verifyNetwork();
  safeResult(supabase(['start','--exclude','realtime,imgproxy,mailpit,edge-runtime,logflare,vector,supavisor']),'start');
  await restrictLocalBindings();
  console.log('Local Supabase ready. Studio: http://127.0.0.1:55423; API: http://127.0.0.1:55421; PostgreSQL: 127.0.0.1:55422.');

} else if(command==='migrate') {
  await verifyLocalBindings();
  safeResult(supabase(['migration','up','--local']),'migrate');
  console.log('Pending local migrations applied; existing application data preserved.');
} else if(command==='stop') {
  safeResult(supabase(['stop']),'stop');
  console.log('Application-local Supabase stopped; its database volume is preserved.');
} else if(command==='reset') {
  if(!process.argv.includes('--confirm-local-reset')) throw new Error('Reset deletes this disposable application-local database only. Pass --confirm-local-reset explicitly.');
  verifyNetwork();
  safeResult(supabase(['db','reset','--local','--yes']),'reset');
  await restrictLocalBindings();
  console.log('Disposable local database reset and migrations reapplied.');
} else if(command==='test') {
  await verifyLocalBindings();
  const result=supabase(['test','db']);
  process.stdout.write(result.stdout??'');
  process.stderr.write(result.stderr??'');
  if(result.status!==0) process.exit(result.status??1);
  await concurrency();
  const contracts=spawnSync(process.execPath,['--import','tsx','scripts/check-database-contracts.ts'],{cwd:root,env:environment,encoding:'utf8',windowsHide:true});
  process.stdout.write(contracts.stdout??''); process.stderr.write(contracts.stderr??'');
  if(contracts.status!==0) process.exit(contracts.status??1);
  const membership=spawnSync(process.execPath,['scripts/check-scene-membership.mjs'],{cwd:root,env:environment,encoding:'utf8',windowsHide:true});
  process.stdout.write(membership.stdout??''); process.stderr.write(membership.stderr??'');
  if(membership.status!==0) process.exit(membership.status??1);
  const expiry=spawnSync(process.execPath,['scripts/check-draft-expiry.mjs'],{cwd:root,env:environment,encoding:'utf8',windowsHide:true});
  process.stdout.write(expiry.stdout??''); process.stderr.write(expiry.stderr??'');
  if(expiry.status!==0) process.exit(expiry.status??1);
} else if(command==='verify-migrations') {
  if(!process.argv.includes('--confirm-local-reset')) throw new Error('Migration verification resets this disposable local database twice. Pass --confirm-local-reset explicitly.');
  verifyNetwork();
  safeResult(supabase(['db','reset','--local','--yes']),'verify-fresh');
  await restrictLocalBindings();
  const fresh=schemaDump();
  safeResult(supabase(['db','reset','--local','--yes','--version','20261027000001']),'verify-first');
  await restrictLocalBindings();
  safeResult(supabase(['migration','up','--local']),'verify-upgrade');
  const upgraded=schemaDump();
  if(fresh!==upgraded) {
    writeFileSync(resolve(cache,'database-fresh.sql'),fresh); writeFileSync(resolve(cache,'database-upgraded.sql'),upgraded);
    throw new Error('Fresh and incrementally migrated schema differ; inspect ignored schema dumps.');
  }
  console.log('PASS: fresh reset and first-migration → incremental upgrade produce identical schema, constraints, policies and grants.');
} else if(command==='types' || command==='types-check') {
  const result=supabase(['gen','types','typescript','--local','--schema','public']);
  if(result.status!==0 || !result.stdout.includes('export type Database')) {
    writeFileSync(resolve(cache,'supabase-types.log'),(result.stdout??'')+(result.stderr??''));
    throw new Error('Local database type generation failed; inspect ignored .cache/supabase-types.log.');
  }
  const destination=resolve(root,'shared/database/database.types.ts');
  const generated='// Generated from local migrations. Run npm run db:types; do not edit by hand.\n'+result.stdout.replaceAll('\r\n','\n');
  if(command==='types-check') {
    if(!existsSync(destination) || readFileSync(destination,'utf8').replaceAll('\r\n','\n')!==generated) throw new Error('Database types are stale. Run npm run db:types.');
    console.log('Database types match the running local schema.');
  } else {
    mkdirSync(dirname(destination),{recursive:true}); writeFileSync(destination,generated);
    console.log('Generated shared/database/database.types.ts (server data model; browser contracts remain separate).');
  }
} else if(command==='status') {
  await verifyLocalBindings();
  const result=await psql('select version(); select count(*) from supabase_migrations.schema_migrations;');
  if(result.code!==0) throw new Error('Local database unavailable. Run npm run db:start.');
  console.log(result.out.trim());
  console.log('Studio: http://127.0.0.1:55423 | API: http://127.0.0.1:55421 | PostgreSQL: 127.0.0.1:55422');
} else {
  throw new Error('Use start, migrate, stop, status, reset --confirm-local-reset, verify-migrations --confirm-local-reset, test, types, or types-check.');
}
