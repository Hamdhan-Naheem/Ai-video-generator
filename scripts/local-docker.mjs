import http from 'node:http';
import { spawnSync } from 'node:child_process';

const project='ai-video-studio-local';
const names=['db','kong','studio'].map(service=>`supabase_${service}_${project}`);
function socket() {
  const result=spawnSync('docker',['context','inspect','--format','{{.Endpoints.docker.Host}}'],{encoding:'utf8',windowsHide:true});
  const endpoint=process.env.DOCKER_HOST || result.stdout.trim();
  if(endpoint.startsWith('npipe:////./pipe/')) return '\\\\.\\pipe\\'+endpoint.slice('npipe:////./pipe/'.length);
  if(endpoint.startsWith('unix://')) return endpoint.slice('unix://'.length);
  throw new Error('Local database requires a local Docker socket; remote Docker endpoints are not accepted.');
}
function api(socketPath,method,path,body,raw=false) {
  return new Promise((done,reject)=>{
    const bytes=body===undefined?undefined:Buffer.isBuffer(body)?body:Buffer.from(JSON.stringify(body));
    const request=http.request({socketPath,path:'/v1.54'+path,method,headers:bytes?{'Content-Type':Buffer.isBuffer(body)?'application/x-tar':'application/json','Content-Length':bytes.length}:{}},response=>{
      const chunks=[]; response.on('data',part=>chunks.push(part));
      response.on('end',()=>{
        if(response.statusCode>=400) return reject(new Error(`Docker ${method} ${path.split('?')[0]} failed (${response.statusCode}); local containers may need attention.`));
        const buffer=Buffer.concat(chunks);
        done(raw?buffer:buffer.length?JSON.parse(buffer.toString('utf8')):null);
      });
    });
    request.setTimeout(60000,()=>request.destroy(new Error('Docker request timed out.')));
    request.on('error',reject); request.end(bytes);
  });
}
function scoped(info,name) {
  if(info.Name!=='/'+name || info.Config.Labels?.['com.supabase.cli.project']!==project) throw new Error('Refusing to alter a container outside this local application.');
}
function bindings(info) {
  return Object.values(info.NetworkSettings.Ports??{}).flatMap(value=>value??[]);
}
export async function verifyLocalBindings() {
  const pipe=socket();
  for(const name of names) {
    const info=await api(pipe,'GET',`/containers/${name}/json`); scoped(info,name);
    const ports=bindings(info);
    if(!info.State.Running || !ports.length || ports.some(port=>port.HostIp!=='127.0.0.1')) throw new Error(`Localhost-only port verification failed for ${name}. Run npm run db:start.`);
  }
}
export async function restrictLocalBindings() {
  const pipe=socket();
  for(const name of names) {
    const info=await api(pipe,'GET',`/containers/${name}/json`); scoped(info,name);
    if(bindings(info).length && bindings(info).every(port=>port.HostIp==='127.0.0.1')) continue;
    const hostConfig=structuredClone(info.HostConfig);
    for(const ports of Object.values(hostConfig.PortBindings??{})) {
      for(const port of ports??[]) port.HostIp='127.0.0.1';
    }
    if(!Object.keys(hostConfig.PortBindings??{}).length) throw new Error('Expected local service published ports are missing.');
    // Preserve named volumes and bind mounts; never delete a volume or alter global Docker settings.
    if(info.Mounts.some(mount=>mount.Type==='volume' && !hostConfig.Binds?.some(bind=>bind.startsWith(mount.Name+':')) && !hostConfig.Mounts?.some(bind=>bind.Source===mount.Name))) {
      throw new Error('Refusing container recreation with an unaccounted anonymous volume.');
    }
    const endpoints=Object.fromEntries(Object.entries(info.NetworkSettings.Networks).map(([network,value])=>[network,{Aliases:value.Aliases??[]} ]));
    // The CLI copies its local gateway config/certificate into the writable layer.
    // Keep that directory in memory across recreation; never write key material to source/logs/images.
    const gatewayFiles=name===`supabase_kong_${project}`
      ? await api(pipe,'GET',`/containers/${name}/archive?path=/home/kong`,undefined,true):null;
    const backup=`${name}-loopback-backup`;
    await api(pipe,'POST',`/containers/${name}/stop?t=10`);
    await api(pipe,'POST',`/containers/${name}/rename?name=${backup}`);
    let created=false;
    try {
      await api(pipe,'POST',`/containers/create?name=${name}`,{...info.Config,HostConfig:hostConfig,NetworkingConfig:{EndpointsConfig:endpoints}});
      created=true;
      if(gatewayFiles) await api(pipe,'PUT',`/containers/${name}/archive?path=/home`,gatewayFiles);
      await api(pipe,'POST',`/containers/${name}/start`);
      let replacement;
      for(let attempt=0;attempt<60;attempt++) {
        replacement=await api(pipe,'GET',`/containers/${name}/json`); scoped(replacement,name);
        if(replacement.State.Running && (!replacement.State.Health || replacement.State.Health.Status==='healthy')) break;
        await new Promise(done=>setTimeout(done,1000));
      }
      if(!replacement.State.Running || (replacement.State.Health && replacement.State.Health.Status!=='healthy')) throw new Error('Recreated local service did not become healthy; original container preserved stopped.');
      if(!bindings(replacement).length || bindings(replacement).some(port=>port.HostIp!=='127.0.0.1')) throw new Error('Explicit localhost publication failed.');
      await api(pipe,'DELETE',`/containers/${backup}?v=false`);
      console.log(`Restricted ${name} published ports to 127.0.0.1; existing data volume preserved.`);
    } catch(error) {
      if(created) await api(pipe,'DELETE',`/containers/${name}?force=true&v=false`).catch(()=>{});
      await api(pipe,'POST',`/containers/${backup}/rename?name=${name}`).catch(()=>{});
      // Leave the original stopped on failure rather than republish it to the LAN.
      throw error;
    }
  }
  await verifyLocalBindings();
}
