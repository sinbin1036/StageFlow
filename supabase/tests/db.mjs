// Supabase 대역(auth 스키마, 역할, Realtime publication)을 깐 PGlite를 만든다.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const pgliteDir = path.dirname(require.resolve('@electric-sql/pglite'));

const pgcrypto = {
  name: 'pgcrypto',
  setup: async () => ({ bundlePath: pathToFileURL(path.join(pgliteDir, 'pgcrypto.tar.gz')) }),
};

export const PRELUDE = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema public, auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
create publication supabase_realtime;
`;

export async function makeDb(migrationPaths, seedPath) {
  const db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(PRELUDE);
  for (const p of migrationPaths) await db.exec(readFileSync(p, 'utf8'));
  if (seedPath) await db.exec(readFileSync(seedPath, 'utf8'));
  return db;
}
