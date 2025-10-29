/**
 * Subscription Management Service
 * Handles plans, company subscriptions, billing, usage tracking
 */

export interface SubscriptionPlan {
  id?: number;
  plan_name: string;
  plan_code: string;
  plan_type: string;
  max_traders?: number;
  max_products?: number;
  max_monthly_trades?: number;
  base_price: number;
  per_trader_price?: number;
  per_product_price?: number;
  currency: string;
  billing_cycle: string;
  features?: string;
  is_active: number;
  is_public: number;
  description?: string;
}

export interface CompanySubscription {
  id?: number;
  company_id: number;
  plan_id: number;
  status: string;
  start_date: string;
  end_date?: string;
  next_billing_date?: string;
  trial_end_date?: string;
  monthly_price: number;
  discount_percentage: number;
  actual_price: number;
  current_traders_count: number;
  current_products_count: number;
  current_monthly_trades: number;
  requested_by?: number;
  approved_by?: number;
  auto_renew: number;
}

/**
 * Get all subscription plans
 */
export async function getPlans(db: any, activeOnly: boolean = true): Promise<any[]> {
  let query = `SELECT * FROM subscription_plans`;

  if (activeOnly) {
    query += ` WHERE is_active = 1`;
  }

  query += ` ORDER BY base_price ASC`;

  const result = await db.prepare(query).all();
  return result.results;
}

/**
 * Get company subscription
 */
export async function getCompanySubscription(db: any, companyId: number): Promise<any> {
  const result = await db.prepare(`
    SELECT
      cs.*,
      sp.plan_name,
      sp.plan_type,
      sp.max_traders,
      sp.max_products,
      sp.max_monthly_trades
    FROM company_subscriptions cs
    JOIN subscription_plans sp ON cs.plan_id = sp.id
    WHERE cs.company_id = ? AND cs.status = 'active'
    ORDER BY cs.created_at DESC
    LIMIT 1
  `).bind(companyId).first();

  return result;
}

/**
 * Create subscription request
 */
export async function requestSubscription(
  db: any,
  subscription: CompanySubscription
): Promise<number> {
  const result = await db.prepare(`
    INSERT INTO company_subscriptions (
      company_id, plan_id, status, start_date, end_date,
      next_billing_date, monthly_price, discount_percentage,
      actual_price, requested_by, auto_renew
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    subscription.company_id,
    subscription.plan_id,
    'pending',
    subscription.start_date,
    subscription.end_date || null,
    subscription.next_billing_date || null,
    subscription.monthly_price,
    subscription.discount_percentage || 0,
    subscription.actual_price,
    subscription.requested_by || null,
    subscription.auto_renew || 1
  ).run();

  return result.meta.last_row_id as number;
}

/**
 * Approve subscription
 */
export async function approveSubscription(
  db: any,
  subscriptionId: number,
  approvedBy: number
): Promise<void> {
  await db.prepare(`
    UPDATE company_subscriptions
    SET status = 'active',
        approved_by = ?,
        approved_at = datetime('now'),
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(approvedBy, subscriptionId).run();
}

/**
 * Update usage counters
 */
export async function updateUsageCounters(
  db: any,
  companyId: number,
  traders?: number,
  products?: number,
  trades?: number
): Promise<void> {
  const updates: string[] = [];
  const params: any[] = [];

  if (traders !== undefined) {
    updates.push('current_traders_count = ?');
    params.push(traders);
  }

  if (products !== undefined) {
    updates.push('current_products_count = ?');
    params.push(products);
  }

  if (trades !== undefined) {
    updates.push('current_monthly_trades = ?');
    params.push(trades);
  }

  if (updates.length === 0) return;

  params.push(companyId);

  await db.prepare(`
    UPDATE company_subscriptions
    SET ${updates.join(', ')}, updated_at = datetime('now')
    WHERE company_id = ? AND status = 'active'
  `).bind(...params).run();
}

/**
 * Check if company is within subscription limits
 */
export async function checkSubscriptionLimits(
  db: any,
  companyId: number
): Promise<{ within_limits: boolean; exceeded: string[] }> {
  const subscription = await getCompanySubscription(db, companyId);

  if (!subscription) {
    return { within_limits: false, exceeded: ['No active subscription'] };
  }

  const exceeded: string[] = [];

  if (subscription.max_traders && subscription.current_traders_count > subscription.max_traders) {
    exceeded.push('traders');
  }

  if (subscription.max_products && subscription.current_products_count > subscription.max_products) {
    exceeded.push('products');
  }

  if (subscription.max_monthly_trades && subscription.current_monthly_trades > subscription.max_monthly_trades) {
    exceeded.push('monthly_trades');
  }

  return {
    within_limits: exceeded.length === 0,
    exceeded,
  };
}
