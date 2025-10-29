-- Update Alert Thresholds to Match Compliance Requirements
-- Changes thresholds from 75%/85%/95%/100% to 60%/80%/100%

-- Update existing alert rules to use new thresholds
UPDATE alert_rules
SET threshold_pct = 60.0
WHERE threshold_pct BETWEEN 70 AND 80;

UPDATE alert_rules
SET threshold_pct = 80.0
WHERE threshold_pct BETWEEN 81 AND 95;

UPDATE alert_rules
SET threshold_pct = 100.0
WHERE threshold_pct >= 96;

-- Add new alert rules for the updated threshold system if they don't exist
INSERT OR IGNORE INTO alert_rules (
  rule_name,
  alert_type,
  threshold_pct,
  severity,
  is_active,
  notify_email,
  notify_sms,
  description
) VALUES
  ('Early Warning - 60% Utilization', 'limit_breach', 60.0, 'warning', 1, 1, 0, 'Alert when position reaches 60-80% of regulatory limit'),
  ('High Risk - 80% Utilization', 'limit_breach', 80.0, 'error', 1, 1, 1, 'Alert when position reaches 80-100% of regulatory limit'),
  ('Limit Breach - 100% Utilization', 'limit_breach', 100.0, 'critical', 1, 1, 1, 'Alert when position exceeds regulatory limit');
