IF EXISTS(SELECT 1 FROM dbo.office_operation_receipts) THROW 51000,'Preserve operational receipts before any rollback',1;
DROP TABLE dbo.office_operation_receipts;
