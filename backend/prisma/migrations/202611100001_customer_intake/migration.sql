CREATE TABLE office_customer_companies(company_id UUID PRIMARY KEY,workspace_id UUID NOT NULL UNIQUE);
CREATE TABLE office_customer_receipts(request_id UUID PRIMARY KEY,company_id UUID NOT NULL,payload_hash CHAR(64) NOT NULL,receipt_json TEXT NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);
