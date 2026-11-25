-- Preserve complete task descriptions, prompts and acceptance criteria.
-- Additive widening: existing values and nullability are preserved.
ALTER TABLE dbo.tasks ALTER COLUMN description nvarchar(max) NULL;
