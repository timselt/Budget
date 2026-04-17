#!/usr/bin/env bash
# --------------------------------------------------------------------
# FinOps Tur — rotate the budget_app role password on the production DB.
# --------------------------------------------------------------------
# Required env-vars (supplied by the Railway deploy context):
#
#   DATABASE_URL             libpq connection string for a superuser
#                            (e.g. postgres://postgres:***@host:5432/dbname)
#   BUDGET_APP_DB_PASSWORD   the new password to set on the budget_app role
#
# The password is bound to psql via `-v` + `:'...'` so it is escaped by psql
# itself. This avoids any shell/sed interpolation vulnerability regardless of
# what characters the password contains (quotes, backslashes, unicode, etc.).
#
# Exit codes:
#   0  success
#   1  missing required env-var
#   2  psql not on PATH
#   3  ALTER ROLE failed

set -euo pipefail

if ! command -v psql >/dev/null 2>&1; then
  echo "[rotate-db-password] psql not found on PATH. Install postgresql-client first." >&2
  exit 2
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[rotate-db-password] DATABASE_URL is required (superuser connection string)." >&2
  exit 1
fi

if [[ -z "${BUDGET_APP_DB_PASSWORD:-}" ]]; then
  echo "[rotate-db-password] BUDGET_APP_DB_PASSWORD is required." >&2
  exit 1
fi

echo "[rotate-db-password] rotating budget_app password..."

# `-v new_pw="$BUDGET_APP_DB_PASSWORD"` binds the value as a psql variable.
# Referencing it as `:'new_pw'` applies psql's built-in literal quoting, so
# the password never has to be manually escaped in shell or SQL.
if ! PGAPPNAME="rotate-db-password" psql "$DATABASE_URL" \
    --quiet \
    --no-psqlrc \
    --set ON_ERROR_STOP=on \
    --set "new_pw=$BUDGET_APP_DB_PASSWORD" \
    --command "ALTER ROLE budget_app WITH PASSWORD :'new_pw';"
then
  echo "[rotate-db-password] ALTER ROLE failed." >&2
  exit 3
fi

echo "[rotate-db-password] done. Update the application ConnectionStrings:Default to match."
