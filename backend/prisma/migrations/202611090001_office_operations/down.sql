DO $$ BEGIN IF EXISTS(SELECT 1 FROM office_operation_receipts) THEN RAISE EXCEPTION 'Preserve operational receipts before any rollback'; END IF; END $$;
DROP TABLE office_operation_receipts;
