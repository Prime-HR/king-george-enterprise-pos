export type PaymentMethod = 'Cash' | 'MTN MoMo' | 'Telecel Cash' | 'Bank Transfer' | 'Credit';

export interface Product {
  id?: number;
  name: string;
  unit_price: number;
  cost_price?: number;
  stock_quantity: number;
  category: string;
  low_stock_threshold: number;
  sku?: string | null;
  image_uri?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Sale {
  id?: number;
  customer_name: string;
  phone_number: string;
  receipt_date: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_method?: PaymentMethod;
  storage_status: 'delivered' | 'stored' | 'picked_up';
  storage_notes?: string | null;
  created_at?: string;
}

export interface SaleItem {
  id?: number;
  sale_id: number;
  product_id?: number | null;
  item_name: string;
  unit_price: number;
  cost_price?: number;
  quantity: number;
  total_price: number;
  category: string;
}

export interface DebtPayment {
  id?: number;
  sale_id: number;
  customer_name?: string;
  amount: number;
  payment_method: PaymentMethod;
  notes?: string | null;
  created_at?: string;
}

export interface DebtorSummary {
  sale: Sale;
  items: SaleItem[];
  payments: DebtPayment[];
  days_overdue: number;
}

export interface DailySummary {
  total_sales: number;
  total_transactions: number;
  total_items_sold: number;
  total_cash?: number;
  total_momo?: number;
  total_other?: number;
  total_credit_issued?: number;
  total_cogs?: number;
  gross_profit?: number;
  margin_percent?: number;
}

export interface TopSellingItem {
  item_name: string;
  total_quantity: number;
  total_revenue: number;
  total_profit?: number;
}

export const CATEGORIES = [
  'Pieces',
  'Cartons',
  'Bags',
  'Crates',
  'Packs',
  'Gallons',
  'Tins',
  'Boxes'
] as const;

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'MTN MoMo',
  'Telecel Cash',
  'Bank Transfer',
  'Credit'
];

export type StorageStatus = 'delivered' | 'stored' | 'picked_up';
