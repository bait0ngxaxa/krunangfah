#!/usr/bin/env bash
set -euo pipefail

if [[ ! ${COMPOSE_PROJECT_NAME:-} =~ ^krunangfah-ci-[0-9]+-[0-9]+$ || -z ${GITHUB_ENV:-} ]]; then
  echo 'Expected a dedicated CI Compose project and GITHUB_ENV.' >&2
  exit 1
fi

compose=(docker compose --env-file /dev/null -f .github/ci/compose.integration.yml)
CI_POSTGRES_PASSWORD=$(openssl rand -hex 32)
runner_password=$(openssl rand -hex 32)
authorization=$(openssl rand -hex 32)
export CI_POSTGRES_PASSWORD
printf '::add-mask::%s\n' "$CI_POSTGRES_PASSWORD" "$runner_password" "$authorization"

"${compose[@]}" up --detach --wait --wait-timeout 90 db
address=$("${compose[@]}" port db 5432)
if [[ ! $address =~ ^127\.0\.0\.1:[0-9]+$ ]]; then
  echo 'Expected an isolated PostgreSQL port on IPv4 loopback.' >&2
  exit 1
fi

provision_url="postgresql://postgres:$CI_POSTGRES_PASSWORD@$address/krunangfah_integration"
DATABASE_URL="$provision_url" DIRECT_URL="$provision_url" \
  npm exec -- prisma migrate deploy --schema prisma/schema.prisma

"${compose[@]}" exec -T db psql -X --single-transaction --set ON_ERROR_STOP=1 \
  --username postgres --dbname krunangfah_integration \
  --set runner_password="$runner_password" --set marker="krunangfah-integration:$authorization" <<'SQL'
CREATE ROLE krunangfah_integration_runner LOGIN PASSWORD :'runner_password';
REVOKE ALL ON DATABASE krunangfah_integration, postgres, template1 FROM PUBLIC;
GRANT CONNECT ON DATABASE krunangfah_integration TO krunangfah_integration_runner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO krunangfah_integration_runner;

SELECT format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I.%I TO krunangfah_integration_runner',
              schemaname, tablename)
FROM pg_catalog.pg_tables
WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
\gexec
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO krunangfah_integration_runner;

COMMENT ON DATABASE krunangfah_integration IS :'marker';
SQL

{
  printf 'TEST_DATABASE_URL=postgresql://krunangfah_integration_runner:%s@%s/krunangfah_integration\n' "$runner_password" "$address"
  printf 'TEST_DATABASE_AUTHORIZATION=%s\n' "$authorization"
} >> "$GITHUB_ENV"
