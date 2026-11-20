# GitHub Actions CI

[Krunangfah CI](../../.github/workflows/full-integration.yml) runs for pull requests targeting `main` and supports manual dispatch. Each job runs independently on its own GitHub-hosted Ubuntu 24.04 x64 runner with Node.js 24.22.1. Every job checks out the repository with credential persistence disabled, restores the npm download cache and runs `npm ci` and `npm run prisma:generate`. GitHub Actions dependencies use immutable commit SHAs. The workflow has read-only contents permission and groups runs by workflow and PR number or ref. A running job can finish when a new revision arrives. Only the run applicable to the latest PR revision counts toward readiness.

| Job ID | Check name | Commands after install and generation | Timeout |
| --- | --- | --- | --- |
| `quality` | Code Quality | `npm run lint`, `npm run typecheck`, `npm exec -- prisma validate --schema prisma/schema.prisma`, and `npm run prisma:migrations:check` against the selected base commit | 20 min |
| `unit` | Unit Tests | `npm run test:ci` runs `vitest run` with the default config, which excludes `tests/integration` | 20 min |
| `integration` | Full PostgreSQL Integration | Provision PostgreSQL, apply migrations with `prisma migrate deploy`, then run `npm run test:integration`. Capture PostgreSQL logs on failure and remove the Compose project after provisioning was attempted. | 60 min |
| `build` | Production Build | `npm run build` compiles Next.js and generates its routes | 20 min |

Prisma validation uses loopback URLs on port 1 to satisfy the schema’s two environment variable declarations. It performs static validation without connecting. Migration SQL is exercised by replaying the committed history in the integration job. The production build uses committed local fonts and requires no application environment values or external runtime services. CI uses the runner’s default Node.js heap budget and generates no deployment.

## Migration history

A clean database can successfully replay edited SQL that differs from what an existing database already applied. The history guard compares committed Git blobs for every historical `migration.sql` and rejects edits, deletion, replacement and directory renames. It also checks the PostgreSQL lock and requires one ordinary, non-empty SQL file in each migration directory. The integration job separately checks SQL execution.

Create a new Prisma migration in an isolated development database. Use a valid UTC `YYYYMMDDHHMMSS_lower_snake_case` directory name with a timestamp strictly newer than the latest baseline migration and distinct from every other timestamp. Put corrections to applied migrations in a new migration. If two branches propose the same timestamp or the base advances past yours, reconcile the unmerged migration before delivery.

For a PR, Code Quality checks out full Git history. The guard uses the target branch's base SHA from the PR event and requires it to match the checked-out test merge commit's first parent. Manual dispatch compares the selected commit against the fetched remote default branch. A missing commit or migration tree fails the check.

To check locally, fetch the actual target branch and run the guard after committing the proposed migration. These commands need no database.

```bash
git fetch origin main
npm run prisma:migrations:check -- refs/remotes/origin/main
npm run test:ci -- tests/unit/infrastructure/migration-history.test.mjs
```

Substitute the target branch for `main` when applicable. Review the reported baseline SHA and use `git diff <base> HEAD -- prisma/migrations` to locate the offending path. The guard reads committed trees, so local staged or unstaged changes are outside its input.

## Disposable PostgreSQL

[The CI Compose file](../../.github/ci/compose.integration.yml) starts PostgreSQL 16 with tmpfs storage and an ephemeral host port bound to `127.0.0.1`. The Compose project is unique to the run and attempt. Startup, logs and teardown explicitly select that file and ignore the repository’s `.env` for Compose interpolation. Run this lifecycle on a disposable Ubuntu runner with Docker Engine, Compose v2 and OpenSSL.

[The provisioning script](../../.github/ci/provision-integration-db.sh) generates and masks one-time credentials and a random authorization value. Only the provisioning account applies migrations. The test account can connect to `krunangfah_integration`, use the public schema, perform DML on application tables, and use sequences. The account has no role memberships, ownership, administrative capabilities or access to `_prisma_migrations`. The script writes the authorization value into the database comment and passes the matching `TEST_DATABASE_AUTHORIZATION` and restricted `TEST_DATABASE_URL` to Vitest.

[The existing target checks](../../tests/integration/database-target.ts) require the loopback address, expected database and login, and a target distinct from configured application databases. [Worker setup](../../tests/integration/setup.ts) verifies the marker and privileges before handing the client to tests and [guarded cleanup](../../tests/integration/database-safety.ts). Use only the disposable database and keep those guards active. Keep application credentials, external databases and the root Compose project outside the test lifecycle.

Give each fixture scope its own year/semester keys. The fixture helper inserts a new term, records its returned ID for that scope and rejects an existing key. Pass the created term ID to term-aware operations when the test owns the term. A parallel onboarding run exposed a foreign-key failure when the implicit latest-term lookup selected a different suite's term during cleanup. Cleanup uses the verified client, removes owned rows and their dependent data, then deletes terms by tracked IDs. A repeated cleanup can safely match zero rows. If a duplicate key or foreign-key error occurs, trace the fixture creator and cleanup order before changing the test.

The affected files can be exercised together with `npm run test:integration -- --fileParallelism=true home-visit teacher-invite teacher-profile onboarding-flow database-safety activity-flow uploads-route-access worksheet-access-control` on a separately verified disposable database. Default execution remains sequential. Other paths still share database-wide academic state. For example, the student-status suite sets a current term and the school-class-term service reads `isCurrent` globally. Explicit concurrency inside test files remains active.

GitHub records the original failed step and exit code. PostgreSQL diagnostics are printed before cleanup, and cleanup has a separate step and conclusion. A runner forcibly terminated before cleanup is itself disposable. Avoid printing environment dumps, expanded Compose config or connection strings.

## Run and inspect CI

1. For normal delivery, open a Draft PR to `main` and open its **Checks** tab. For a manual run, open **Actions → Krunangfah CI → Run workflow** and select the intended branch. Manual dispatch becomes available once the workflow exists on the default branch.
2. Confirm the current PR HEAD with `gh pr view <number> --json headRefOid`. Find applicable PR runs with `gh run list --workflow full-integration.yml --event pull_request --commit <head-sha>`. The PR event tests GitHub’s test merge commit for that PR revision against its base.
3. Open the run or use `gh run view <run-id> --json url,headSha,status,conclusion,jobs`. Record each required job’s conclusion and check the actual logs for test totals, build completion and integration teardown. Use `gh run view <run-id> --log-failed` for failed steps, or open an individual job to see full logs. The integration job summary records the Vitest exit code and elapsed time when the test command ends normally.
4. Leave incomplete runs as `CI PENDING`. A cancelled or skipped required job needs a complete applicable run. Investigate failed checks and address the evidence on the same branch and PR. After any push, verify the new HEAD independently.

| Symptom | Where to look |
| --- | --- |
| No run or waiting for approval | Check the PR base, Actions enablement, action allowlist, contributor approval, runner availability and workflow concurrency. |
| Install or generation fails | Inspect Node setup, registry or engine download errors, and lockfile consistency. Keep `npm ci` and the pinned Node version while diagnosing. |
| Validation or migration fails | Check the migration guard's reported base, path and reason. Read the Prisma error separately for SQL or schema failures and reproduce SQL only on a disposable database. |
| PostgreSQL setup or attestation fails | Inspect startup logs, health check, port, role and marker. Resolve failures with the dedicated Compose project and preserve the existing guards. |
| Unit or integration test fails | Record the exact file, test, duration and error. Reproduce with `npm run test:ci -- <path>` or `npm run test:integration -- <path>` with a separately verified disposable database. |
| Build fails | Inspect the first compilation, type, route-generation or resource error. Add step-local synthetic values only for demonstrated build-time requirements and preserve application validation. |
| Cleanup fails | Inspect its separate step and the earlier test/provisioning result. Confirm the command targets the dedicated CI file and project. |

## Agent delivery and owner setup

[AGENTS.md Sections 9–10](../../AGENTS.md#9-testing-and-verification) define the required branch, Draft PR, latest-HEAD CI and reporting rules. Keep updates on the same PR. Mark it ready only after all four current checks succeed and blocking defects are resolved. The owner approves merging.

After the checks have reported successfully, a repository owner can open **Settings → Rules → Rulesets**, create an active branch ruleset targeting `main`, and enable **Require a pull request before merging** and **Require status checks to pass**. The equivalent controls are available in a branch protection rule under **Settings → Branches**.

1. Select the four exact check names shown in the table and choose GitHub Actions as their expected source where offered.
2. Require the branch to be up to date with `main` before merging so GitHub evaluates checks for the applicable PR revision. Require approval and dismiss stale approvals after additional commits.
3. Keep approval and merge under owner control. Review bypass permissions and keep auto-merge disabled for agent delivery.

This configuration is for the repository owner to perform. See [GitHub’s ruleset documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) and [manual workflow instructions](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).
