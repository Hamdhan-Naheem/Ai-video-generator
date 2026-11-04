import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { GoogleSignInRequestSchema } from '../shared/contracts/auth.ts';

// Compare real PostgreSQL CHECK predicate behavior with the browser/server request contract.
const paths: Array<string | null> = [
  '/dashboard', '/videos', '/settings', '/projects/new',
  ...Array.from({ length: 8 }, (_, index) => `/projects/10000000-0000-${index + 1}000-8000-000000000001`),
  '/projects/ABCDEF01-ABCD-4000-ABCD-ABCDEF123456',
  '/projects/00000000-0000-0000-0000-000000000000',
  '/projects/ffffffff-ffff-ffff-ffff-ffffffffffff',
  '/projects/FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
  '/create', '/preview/create', '/projects/new/', '/projects/',
  '/projects/10000000-0000-9000-8000-000000000001',
  '/projects/10000000-0000-4000-7000-000000000001',
  '/projects/10000000000040008000000000000001',
  '/projects/10000000-0000-4000-8000-000000000001/',
  '/projects/10000000-0000-4000-8000-000000000001\n',
  '/projects/10000000-0000-4000-8000-000000000001?token=private',
  '/projects/10000000-0000-4000-8000-000000000001#fragment',
  '/projects/%31%30%30', '/projects/../settings', '/projects/new?next=https://evil.test',
  'https://evil.test', '//evil.test', '/\\evil.test', '/dashboard\n',
  "'/projects/new", '/settings?token=private', '', null,
];
const rows = paths.map((path, ordinal) => ({ path, ordinal }));
const literal = JSON.stringify(rows).replaceAll("'", "''");
const query = `select ordinal,private.valid_oauth_return_path(path)
  from jsonb_to_recordset('${literal}'::jsonb) as samples(ordinal integer,path text) order by ordinal;`;
const result = spawnSync('docker', ['exec', '-i', 'supabase_db_ai-video-studio-local',
  'psql', '-X', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'],
{ input: query, encoding: 'utf8', windowsHide: true, maxBuffer: 1024 * 1024 });
assert.equal(result.status, 0, 'Local database return-path comparison must execute successfully.');
const decisions = new Map(result.stdout.trim().split(/\r?\n/).map(line => {
  const [ordinal, accepted] = line.split('|');
  return [Number(ordinal), accepted === 't'] as const;
}));
assert.equal(decisions.size, paths.length);
paths.forEach((path, ordinal) => assert.equal(decisions.get(ordinal),
  GoogleSignInRequestSchema.safeParse({ nextPath: path }).success,
  `Database/shared-contract disagreement for return-path fixture ${ordinal}`));
console.log(`PASS: ${paths.length} OAuth return-path fixtures agree between PostgreSQL and the shared Zod contract.`);
