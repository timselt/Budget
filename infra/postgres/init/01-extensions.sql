-- Postgres 16 extension'ları (master spec §3.1 gereği)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- pgaudit production'da yüklenir (image değişikliği gerekir; dev'de log_statement=ddl yeterli)
