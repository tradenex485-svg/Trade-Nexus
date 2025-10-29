-- Migration 0013: Enhanced Position Aggregation
-- Phase 4: Cross-commodity aggregation, economic equivalence, hedge exemptions

-- ============================================================================
-- Aggregation Groups Table
-- Groups commodities that should be aggregated together for limit purposes
-- ============================================================================
CREATE TABLE IF NOT EXISTS aggregation_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_code TEXT UNIQUE NOT NULL,
  group_name TEXT NOT NULL,
  group_type TEXT NOT NULL, -- 'product_family', 'economic_equivalent', 'spread', 'hedge'

  -- Regulatory context
  exchange_id INTEGER,
  regulatory_body TEXT,

  -- Aggregation rules
  aggregation_method TEXT NOT NULL, -- 'simple_sum', 'net_equivalent', 'weighted_sum', 'max_single'
  conversion_required INTEGER DEFAULT 0, -- 1 if commodities need conversion factors

  -- Description
  description TEXT,
  rule_reference TEXT,

  -- Status
  is_active INTEGER DEFAULT 1,
  effective_from DATE,
  effective_to DATE,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (exchange_id) REFERENCES exchanges(id)
);

CREATE INDEX idx_aggregation_groups_code ON aggregation_groups(group_code);
CREATE INDEX idx_aggregation_groups_type ON aggregation_groups(group_type);
CREATE INDEX idx_aggregation_groups_active ON aggregation_groups(is_active, effective_from);

-- ============================================================================
-- Aggregation Group Members Table
-- Maps commodities to their aggregation groups
-- ============================================================================
CREATE TABLE IF NOT EXISTS aggregation_group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  commodity_code TEXT NOT NULL,

  -- Conversion factors for economic equivalence
  conversion_factor REAL DEFAULT 1.0, -- e.g., 1 crude oil = 1.0, 1 gasoline = 0.85 oil equivalent
  conversion_unit TEXT, -- 'barrels', 'bushels', 'contracts'

  -- Weight in aggregation (if using weighted sum)
  weight REAL DEFAULT 1.0,

  -- Role in group
  is_primary INTEGER DEFAULT 0, -- 1 if this is the primary/reference commodity
  position_type TEXT, -- 'long', 'short', 'both' - how this commodity contributes to group position

  -- Status
  is_active INTEGER DEFAULT 1,
  effective_from DATE,
  effective_to DATE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (group_id) REFERENCES aggregation_groups(id) ON DELETE CASCADE
);

CREATE INDEX idx_agg_members_group ON aggregation_group_members(group_id);
CREATE INDEX idx_agg_members_commodity ON aggregation_group_members(commodity_code);
CREATE UNIQUE INDEX idx_agg_members_unique ON aggregation_group_members(group_id, commodity_code, is_active);

-- ============================================================================
-- Commodity Relationships Table
-- Defines relationships between commodities (spreads, substitutes, hedges)
-- ============================================================================
CREATE TABLE IF NOT EXISTS commodity_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Relationship definition
  commodity_a TEXT NOT NULL,
  commodity_b TEXT NOT NULL,
  relationship_type TEXT NOT NULL, -- 'spread', 'substitute', 'hedge', 'correlated', 'deliverable'

  -- Correlation/conversion
  correlation_coefficient REAL, -- -1.0 to 1.0 for correlated relationships
  conversion_ratio REAL, -- For economically equivalent commodities

  -- Directional relationship
  is_bidirectional INTEGER DEFAULT 1, -- 1 if A→B and B→A are both valid

  -- Regulatory treatment
  netting_allowed INTEGER DEFAULT 0, -- 1 if positions can be netted for limit purposes
  exemption_eligible INTEGER DEFAULT 0, -- 1 if this relationship qualifies for exemptions

  -- Description
  description TEXT,
  rule_reference TEXT,

  -- Status
  is_active INTEGER DEFAULT 1,
  effective_from DATE,
  effective_to DATE,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_commodity_rel_a ON commodity_relationships(commodity_a);
CREATE INDEX idx_commodity_rel_b ON commodity_relationships(commodity_b);
CREATE INDEX idx_commodity_rel_type ON commodity_relationships(relationship_type);
CREATE UNIQUE INDEX idx_commodity_rel_unique ON commodity_relationships(commodity_a, commodity_b, relationship_type, is_active);

-- ============================================================================
-- Hedge Exemptions Table
-- Track hedge exemption applications and approvals
-- ============================================================================
CREATE TABLE IF NOT EXISTS hedge_exemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Exemption details
  exemption_type TEXT NOT NULL, -- 'bona_fide_hedge', 'spread_exemption', 'risk_management', 'swap_dealer'
  commodity_code TEXT NOT NULL,
  exchange_id INTEGER,

  -- Applicant
  company_id INTEGER NOT NULL,
  user_id INTEGER, -- Trader who requested

  -- Position details
  position_size INTEGER NOT NULL,
  hedge_rationale TEXT NOT NULL, -- Business justification
  underlying_exposure TEXT, -- Description of physical position/risk being hedged

  -- Supporting documentation
  documentation_provided TEXT, -- JSON array of document references

  -- Approval workflow
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'expired', 'revoked'
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  reviewed_by INTEGER,

  approval_notes TEXT,
  rejection_reason TEXT,

  -- Validity period
  effective_from DATE,
  effective_to DATE,

  -- Limits
  approved_limit INTEGER, -- Maximum position allowed under exemption
  current_utilization INTEGER DEFAULT 0,

  -- Regulatory filing
  filed_with_regulator INTEGER DEFAULT 0,
  filing_reference TEXT,
  regulator_approval_date DATE,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (exchange_id) REFERENCES exchanges(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (reviewed_by) REFERENCES users(id)
);

CREATE INDEX idx_hedge_exemptions_commodity ON hedge_exemptions(commodity_code);
CREATE INDEX idx_hedge_exemptions_company ON hedge_exemptions(company_id);
CREATE INDEX idx_hedge_exemptions_status ON hedge_exemptions(status);
CREATE INDEX idx_hedge_exemptions_dates ON hedge_exemptions(effective_from, effective_to);

-- ============================================================================
-- Aggregated Positions Table
-- Stores calculated aggregated positions across commodity groups
-- ============================================================================
CREATE TABLE IF NOT EXISTS aggregated_positions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Aggregation group
  group_id INTEGER NOT NULL,
  group_code TEXT NOT NULL,

  -- Company/trader scope
  company_id INTEGER,
  user_id INTEGER,

  -- Aggregated position
  total_position REAL NOT NULL, -- Sum/net of all positions in group
  total_contracts INTEGER,
  position_unit TEXT, -- 'lots', 'contracts', 'equivalent_barrels'

  -- Component positions
  component_count INTEGER DEFAULT 0, -- Number of commodities included
  components TEXT, -- JSON: [{commodity_code, position, contribution}]

  -- Limit comparison
  applicable_limit REAL,
  utilization_pct REAL,

  -- Calculation metadata
  calculation_method TEXT,
  calculation_date DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Status
  is_active INTEGER DEFAULT 1,

  FOREIGN KEY (group_id) REFERENCES aggregation_groups(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_agg_positions_group ON aggregated_positions(group_id);
CREATE INDEX idx_agg_positions_company ON aggregated_positions(company_id);
CREATE INDEX idx_agg_positions_active ON aggregated_positions(is_active);

-- ============================================================================
-- Seed Data: Aggregation Groups
-- ============================================================================

-- Energy Products - Crude Oil Family
INSERT INTO aggregation_groups (
  group_code, group_name, group_type, aggregation_method,
  conversion_required, description, is_active
) VALUES (
  'ENERGY_CRUDE_FAMILY',
  'Crude Oil Product Family',
  'product_family',
  'weighted_sum',
  1,
  'Aggregates crude oil and refined products using barrel equivalents',
  1
);

-- Get the group_id for energy crude family
INSERT INTO aggregation_group_members (group_id, commodity_code, conversion_factor, conversion_unit, is_primary, is_active)
SELECT id, 'CL', 1.0, 'barrels', 1, 1 FROM aggregation_groups WHERE group_code = 'ENERGY_CRUDE_FAMILY'
UNION ALL
SELECT id, 'RB', 0.85, 'barrels', 0, 1 FROM aggregation_groups WHERE group_code = 'ENERGY_CRUDE_FAMILY'
UNION ALL
SELECT id, 'HO', 0.82, 'barrels', 0, 1 FROM aggregation_groups WHERE group_code = 'ENERGY_CRUDE_FAMILY';

-- Agricultural - Grains Family
INSERT INTO aggregation_groups (
  group_code, group_name, group_type, aggregation_method,
  conversion_required, description, is_active
) VALUES (
  'AG_GRAINS_FAMILY',
  'Agricultural Grains Family',
  'product_family',
  'simple_sum',
  0,
  'Aggregates corn, wheat, soybeans for feed grain limits',
  1
);

INSERT INTO aggregation_group_members (group_id, commodity_code, conversion_factor, is_primary, is_active)
SELECT id, 'C', 1.0, 1, 1 FROM aggregation_groups WHERE group_code = 'AG_GRAINS_FAMILY'
UNION ALL
SELECT id, 'W', 1.0, 0, 1 FROM aggregation_groups WHERE group_code = 'AG_GRAINS_FAMILY'
UNION ALL
SELECT id, 'S', 1.0, 0, 1 FROM aggregation_groups WHERE group_code = 'AG_GRAINS_FAMILY';

-- Precious Metals - Gold/Silver
INSERT INTO aggregation_groups (
  group_code, group_name, group_type, aggregation_method,
  conversion_required, description, is_active
) VALUES (
  'METALS_PRECIOUS',
  'Precious Metals Group',
  'product_family',
  'simple_sum',
  0,
  'Aggregates gold and silver positions',
  1
);

INSERT INTO aggregation_group_members (group_id, commodity_code, is_primary, is_active)
SELECT id, 'GC', 1, 1 FROM aggregation_groups WHERE group_code = 'METALS_PRECIOUS'
UNION ALL
SELECT id, 'SI', 0, 1 FROM aggregation_groups WHERE group_code = 'METALS_PRECIOUS';

-- ============================================================================
-- Seed Data: Commodity Relationships
-- ============================================================================

-- Crude Oil / Gasoline spread
INSERT INTO commodity_relationships (
  commodity_a, commodity_b, relationship_type,
  correlation_coefficient, netting_allowed, exemption_eligible,
  description, is_active
) VALUES
('CL', 'RB', 'spread', 0.85, 1, 1, 'Crude Oil / RBOB Gasoline crack spread', 1),
('CL', 'HO', 'spread', 0.88, 1, 1, 'Crude Oil / Heating Oil crack spread', 1),
('RB', 'HO', 'substitute', 0.75, 0, 0, 'Gasoline and Heating Oil are substitute refined products', 1);

-- Grain substitutes
INSERT INTO commodity_relationships (
  commodity_a, commodity_b, relationship_type,
  correlation_coefficient, conversion_ratio, netting_allowed,
  description, is_active
) VALUES
('C', 'W', 'substitute', 0.65, 1.0, 0, 'Corn and Wheat as feed grains', 1),
('C', 'S', 'correlated', 0.70, NULL, 0, 'Corn and Soybeans correlation', 1),
('W', 'S', 'correlated', 0.60, NULL, 0, 'Wheat and Soybeans correlation', 1);

-- Precious metals hedge
INSERT INTO commodity_relationships (
  commodity_a, commodity_b, relationship_type,
  correlation_coefficient, exemption_eligible,
  description, is_active
) VALUES
('GC', 'SI', 'hedge', 0.80, 1, 'Gold and Silver as precious metal hedges', 1);

-- Natural Gas related
INSERT INTO commodity_relationships (
  commodity_a, commodity_b, relationship_type,
  correlation_coefficient, netting_allowed,
  description, is_active
) VALUES
('NG', 'CL', 'correlated', 0.55, 0, 'Natural Gas and Crude Oil energy correlation', 1);

-- ============================================================================
-- Views for Aggregation Analysis
-- ============================================================================

-- View: Aggregated Position Summary
CREATE VIEW IF NOT EXISTS v_aggregated_position_summary AS
SELECT
  ap.id,
  ap.group_code,
  ag.group_name,
  ag.group_type,
  ag.aggregation_method,
  c.company_name,
  u.email as trader_email,
  ap.total_position,
  ap.total_contracts,
  ap.applicable_limit,
  ap.utilization_pct,
  ap.component_count,
  ap.calculation_date,
  CASE
    WHEN ap.utilization_pct >= 100 THEN 'breached'
    WHEN ap.utilization_pct >= 85 THEN 'warning'
    WHEN ap.utilization_pct >= 75 THEN 'caution'
    ELSE 'normal'
  END as status
FROM aggregated_positions ap
JOIN aggregation_groups ag ON ap.group_id = ag.id
LEFT JOIN companies c ON ap.company_id = c.id
LEFT JOIN users u ON ap.user_id = u.id
WHERE ap.is_active = 1
ORDER BY ap.utilization_pct DESC;

-- View: Active Hedge Exemptions
CREATE VIEW IF NOT EXISTS v_active_hedge_exemptions AS
SELECT
  he.*,
  c.company_name,
  u.email as trader_email,
  reviewer.email as reviewed_by_email,
  e.exchange_name,
  CASE
    WHEN he.effective_to < DATE('now') THEN 'expired'
    WHEN he.current_utilization >= he.approved_limit THEN 'limit_reached'
    WHEN he.current_utilization >= (he.approved_limit * 0.9) THEN 'near_limit'
    ELSE 'active'
  END as utilization_status
FROM hedge_exemptions he
JOIN companies c ON he.company_id = c.id
LEFT JOIN users u ON he.user_id = u.id
LEFT JOIN users reviewer ON he.reviewed_by = reviewer.id
LEFT JOIN exchanges e ON he.exchange_id = e.id
WHERE he.status = 'approved'
  AND he.effective_to >= DATE('now')
ORDER BY he.effective_to ASC;

-- View: Commodity Relationship Network
CREATE VIEW IF NOT EXISTS v_commodity_network AS
SELECT
  cr.id,
  cr.commodity_a,
  ml_a.contract_name as commodity_a_name,
  cr.commodity_b,
  ml_b.contract_name as commodity_b_name,
  cr.relationship_type,
  cr.correlation_coefficient,
  cr.conversion_ratio,
  cr.netting_allowed,
  cr.exemption_eligible,
  cr.is_bidirectional,
  cr.description
FROM commodity_relationships cr
LEFT JOIN market_limits ml_a ON cr.commodity_a = ml_a.commodity_code
LEFT JOIN market_limits ml_b ON cr.commodity_b = ml_b.commodity_code
WHERE cr.is_active = 1;

-- ============================================================================
-- Triggers for Audit Trail
-- ============================================================================

-- Trigger: Log hedge exemption status changes
CREATE TRIGGER IF NOT EXISTS trg_hedge_exemption_audit
AFTER UPDATE ON hedge_exemptions
FOR EACH ROW
WHEN OLD.status != NEW.status
BEGIN
  INSERT INTO compliance_audit_log (
    audit_type, entity_type, entity_id,
    action, old_value, new_value,
    regulatory_body, user_id, timestamp
  ) VALUES (
    'hedge_exemption',
    'exemption',
    NEW.id,
    'status_change',
    json_object('status', OLD.status, 'reviewed_at', OLD.reviewed_at),
    json_object('status', NEW.status, 'reviewed_at', NEW.reviewed_at),
    'CFTC',
    NEW.reviewed_by,
    CURRENT_TIMESTAMP
  );
END;

-- Trigger: Update aggregated position timestamp
CREATE TRIGGER IF NOT EXISTS trg_agg_position_update
AFTER UPDATE ON aggregated_positions
FOR EACH ROW
BEGIN
  UPDATE aggregated_positions
  SET calculation_date = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Summary of changes:
-- ✅ Created aggregation_groups table for commodity grouping
-- ✅ Created aggregation_group_members table for group membership
-- ✅ Created commodity_relationships table for spread/hedge/substitute relationships
-- ✅ Created hedge_exemptions table for exemption workflow
-- ✅ Created aggregated_positions table for calculated aggregates
-- ✅ Seeded example aggregation groups (Energy, Grains, Metals)
-- ✅ Seeded commodity relationships (spreads, substitutes, hedges)
-- ✅ Created views for aggregation analysis
-- ✅ Added triggers for audit trail
