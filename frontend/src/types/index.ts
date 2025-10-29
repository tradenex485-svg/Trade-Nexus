export interface User {
  id: number;
  name: string;
  email: string;
  scopes: string[];
}

export type PrioritizationStatus = 'Monitor' | 'Validate' | 'Remediate' | 'Breached' | 'Exemption Breached';

export interface PositionLimit {
  id: number;
  mkt_index: string;
  mkt_loc_name: string;
  net_future_equivalent_position: number;
  limit: number;
  utilization_pct: number;
  prioritization: PrioritizationStatus;
  exemption_status?: string;
  as_of_date: string;
}

export interface MarketLimit {
  id: number;
  mkt_index: string;
  limit_type: number;
  limit_value: number;
  effective_date: string;
  expiry_date?: string;
}

export interface Transaction {
  id: number;
  trade_date: string;
  mkt_loc: string;
  product: string;
  quantity: number;
  price: number;
  side: 'BUY' | 'SELL';
}

export interface LimitExemption {
  id: number;
  mkt_index: string;
  exemption_amount: number;
  start_date: string;
  end_date: string;
  status: 'Active' | 'Expired' | 'Pending';
  notes?: string;
}

export interface Alert {
  id: number;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
}

export interface StatusCount {
  monitor: number;
  validate: number;
  remediate: number;
  breached: number;
  total: number;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  utilization: number;
}
