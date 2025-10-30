-- Trade Nexus - CFTC Subset Reports Table
-- Migration: 0032_create_subset_reports.sql
-- Description: Create table for storing CFTC subset report metadata and data

-- ============================================================================
-- SUBSET REPORT METADATA TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS subset_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL,
    report_date DATE NOT NULL,
    company_id INTEGER NOT NULL,
    generated_by_user_id INTEGER,
    report_data TEXT,
    generation_status TEXT DEFAULT 'PENDING',
    error_message TEXT,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id),
    FOREIGN KEY (generated_by_user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_subset_reports_type_date
ON subset_reports(report_type, report_date);

CREATE INDEX IF NOT EXISTS idx_subset_reports_company
ON subset_reports(company_id, report_date);

CREATE INDEX IF NOT EXISTS idx_subset_reports_status
ON subset_reports(generation_status);

-- Migration complete
