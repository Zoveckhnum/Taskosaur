-- Explicitly retain PostgreSQL text semantics alongside the SQL Server widening.
ALTER TABLE "tasks" ALTER COLUMN "description" TYPE TEXT;
