import { db } from './db';
import { Sale, SaleItem, DailySummary, TopSellingItem, StorageStatus, PaymentMethod } from './types';
import { updateStock, getProductById } from './inventory';

export function createSale(
  sale: Omit<Sale, 'id' | 'created_at'>,
  items: Omit<SaleItem, 'id' | 'sale_id'>[]
): number {
  let saleId = 0;

  db.withTransactionSync(() => {
    const result = db.runSync(
      `INSERT INTO sales (
        customer_name, phone_number, receipt_date, total_amount, amount_paid,
        balance_due, payment_method, momo_ref, storage_status, storage_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sale.customer_name,
        sale.phone_number,
        sale.receipt_date,
        sale.total_amount,
        sale.amount_paid,
        sale.balance_due,
        sale.payment_method || 'Cash',
        sale.momo_ref || null,
        sale.storage_status || 'delivered',
        sale.storage_notes || null,
      ]
    );

    saleId = result.lastInsertRowId;

    for (const item of items) {
      let costPrice = item.cost_price || 0;
      if (item.product_id && costPrice === 0) {
        const prod = getProductById(item.product_id);
        if (prod && prod.cost_price) {
          costPrice = prod.cost_price;
        }
      }

      db.runSync(
        `INSERT INTO sale_items (
          sale_id, product_id, item_name, unit_price, cost_price, quantity, total_price, category
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          saleId,
          item.product_id || null,
          item.item_name,
          item.unit_price,
          costPrice,
          item.quantity,
          item.total_price,
          item.category,
        ]
      );

      if (item.product_id) {
        updateStock(item.product_id, -item.quantity);
      }
    }
  });

  return saleId;
}

export function getSaleById(id: number): Sale | null {
  return db.getFirstSync<Sale>('SELECT * FROM sales WHERE id = ?', [id]);
}

export function getSaleItems(saleId: number): SaleItem[] {
  return db.getAllSync<SaleItem>('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);
}

export function getAllSales(): Sale[] {
  return db.getAllSync<Sale>('SELECT * FROM sales ORDER BY created_at DESC');
}

export function getRecentSales(limit: number = 20): Sale[] {
  return db.getAllSync<Sale>('SELECT * FROM sales ORDER BY created_at DESC LIMIT ?', [limit]);
}

export function getFrequentCustomers(): { customer_name: string; phone_number: string; count: number }[] {
  try {
    return db.getAllSync<{ customer_name: string; phone_number: string; count: number }>(
      `SELECT customer_name, phone_number, COUNT(id) as count
       FROM sales
       WHERE customer_name IS NOT NULL
         AND customer_name != ''
         AND customer_name != 'Walk-in Customer'
       GROUP BY customer_name, phone_number
       ORDER BY count DESC, id DESC
       LIMIT 10`
    );
  } catch (e) {
    return [];
  }
}

export function getPeriodSummary(filter: 'today' | 'week' | 'month' | 'all'): DailySummary {
  let salesDateClause = '';
  let dateParam = '';
  const today = new Date();

  if (filter === 'today') {
    dateParam = today.toISOString().split('T')[0];
    salesDateClause = 'WHERE receipt_date LIKE ?';
  } else if (filter === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    dateParam = weekAgo.toISOString().split('T')[0];
    salesDateClause = 'WHERE receipt_date >= ?';
  } else if (filter === 'month') {
    dateParam = today.toISOString().slice(0, 7);
    salesDateClause = 'WHERE receipt_date LIKE ?';
  }

  const querySalesParams = dateParam ? [filter === 'week' ? dateParam : `${dateParam}%`] : [];

  const result = db.getFirstSync<{ total_sales: number; total_transactions: number }>(
    `SELECT SUM(total_amount) as total_sales, COUNT(id) as total_transactions FROM sales ${salesDateClause}`,
    querySalesParams
  ) || { total_sales: 0, total_transactions: 0 };

  const itemsClause = salesDateClause ? salesDateClause.replace('receipt_date', 'sales.receipt_date') : '';
  const itemsResult = db.getFirstSync<{ total_items_sold: number; total_cogs: number }>(
    `SELECT SUM(sale_items.quantity) as total_items_sold,
            SUM(sale_items.quantity * sale_items.cost_price) as total_cogs
     FROM sale_items
     INNER JOIN sales ON sale_items.sale_id = sales.id
     ${itemsClause}`,
    querySalesParams
  ) || { total_items_sold: 0, total_cogs: 0 };

  const cashClause = salesDateClause ? `${salesDateClause} AND payment_method = 'Cash'` : "WHERE payment_method = 'Cash'";
  const momoClause = salesDateClause ? `${salesDateClause} AND payment_method IN ('MTN MoMo', 'Telecel Cash')` : "WHERE payment_method IN ('MTN MoMo', 'Telecel Cash')";
  const otherClause = salesDateClause ? `${salesDateClause} AND payment_method = 'Bank Transfer'` : "WHERE payment_method = 'Bank Transfer'";
  const creditClause = salesDateClause ? `${salesDateClause} AND balance_due > 0` : "WHERE balance_due > 0";

  const cashRow = db.getFirstSync<{ total: number }>(
    `SELECT SUM(amount_paid) as total FROM sales ${cashClause}`,
    querySalesParams
  );
  const momoRow = db.getFirstSync<{ total: number }>(
    `SELECT SUM(amount_paid) as total FROM sales ${momoClause}`,
    querySalesParams
  );
  const otherRow = db.getFirstSync<{ total: number }>(
    `SELECT SUM(amount_paid) as total FROM sales ${otherClause}`,
    querySalesParams
  );
  const creditRow = db.getFirstSync<{ total: number }>(
    `SELECT SUM(balance_due) as total FROM sales ${creditClause}`,
    querySalesParams
  );

  // Cash collections from debt payments in this period
  let debtDateClause = '';
  if (filter === 'today') {
    debtDateClause = "WHERE created_at LIKE ? AND payment_method = 'Cash'";
  } else if (filter === 'week') {
    debtDateClause = "WHERE created_at >= ? AND payment_method = 'Cash'";
  } else if (filter === 'month') {
    debtDateClause = "WHERE created_at LIKE ? AND payment_method = 'Cash'";
  } else {
    debtDateClause = "WHERE payment_method = 'Cash'";
  }
  const debtCashRow = db.getFirstSync<{ total: number }>(
    `SELECT SUM(amount) as total FROM debt_payments ${debtDateClause}`,
    querySalesParams
  );

  // Expenses in this period
  let expDateClause = '';
  if (filter === 'today') {
    expDateClause = 'WHERE expense_date LIKE ?';
  } else if (filter === 'week') {
    expDateClause = 'WHERE expense_date >= ?';
  } else if (filter === 'month') {
    expDateClause = 'WHERE expense_date LIKE ?';
  }
  const expRow = db.getFirstSync<{ total: number; cash_total: number }>(
    `SELECT SUM(amount) as total,
            SUM(CASE WHEN payment_method = 'Cash' THEN amount ELSE 0 END) as cash_total
     FROM expenses ${expDateClause}`,
    querySalesParams
  );

  const totalSales = result.total_sales || 0;
  const totalCogs = itemsResult.total_cogs || 0;
  const grossProfit = totalSales - totalCogs;
  const marginPercent = totalSales > 0 ? (grossProfit / totalSales) * 100 : 0;
  const totalCashSales = cashRow?.total || 0;
  const cashDebtCollected = debtCashRow?.total || 0;
  const totalExpenses = expRow?.total || 0;
  const cashExpenses = expRow?.cash_total || 0;

  // Drawer Net Cash = (Cash Sales + Cash Debt Collected) - Cash Expenses
  const netCashDrawer = totalCashSales + cashDebtCollected - cashExpenses;

  return {
    total_sales: totalSales,
    total_transactions: result.total_transactions || 0,
    total_items_sold: itemsResult.total_items_sold || 0,
    total_cash: totalCashSales,
    total_momo: momoRow?.total || 0,
    total_other: otherRow?.total || 0,
    total_credit_issued: creditRow?.total || 0,
    total_expenses: totalExpenses,
    net_cash_drawer: netCashDrawer,
    total_cogs: totalCogs,
    gross_profit: grossProfit,
    margin_percent: marginPercent,
  };
}

export function getDailySummary(date: string): DailySummary {
  return getPeriodSummary('today');
}

export function getPeriodTopSellingItems(
  filter: 'today' | 'week' | 'month' | 'all',
  limit: number = 5
): TopSellingItem[] {
  let dateClause = '';
  const params: any[] = [];
  const today = new Date();

  if (filter === 'today') {
    const todayStr = today.toISOString().split('T')[0];
    dateClause = 'WHERE sales.receipt_date LIKE ?';
    params.push(`${todayStr}%`);
  } else if (filter === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    dateClause = 'WHERE sales.receipt_date >= ?';
    params.push(weekAgo.toISOString().split('T')[0]);
  } else if (filter === 'month') {
    const monthStr = today.toISOString().slice(0, 7);
    dateClause = 'WHERE sales.receipt_date LIKE ?';
    params.push(`${monthStr}%`);
  }

  params.push(limit);

  return db.getAllSync<TopSellingItem>(
    `SELECT item_name,
            SUM(quantity) as total_quantity,
            SUM(total_price) as total_revenue,
            SUM(total_price - (cost_price * quantity)) as total_profit
     FROM sale_items
     INNER JOIN sales ON sale_items.sale_id = sales.id
     ${dateClause}
     GROUP BY item_name
     ORDER BY total_quantity DESC
     LIMIT ?`,
    params
  );
}

export function getTopSellingItems(date: string, limit: number = 5): TopSellingItem[] {
  return getPeriodTopSellingItems('today', limit);
}

export function exportSalesCSV(): string {
  const sales = getAllSales();
  const rows: string[] = [];
  rows.push(
    'Receipt ID,Date,Customer Name,Phone,Payment Method,MoMo Ref,Total (GHC),Paid (GHC),Balance (GHC),Storage Status,Storage Notes,Items'
  );

  for (const sale of sales) {
    const items = getSaleItems(sale.id!);
    const itemsDesc = items
      .map((i) => `${i.item_name} (${i.quantity} ${i.category} @ ${i.unit_price})`)
      .join(' | ');
    rows.push(
      `"${sale.id}","${sale.receipt_date}","${sale.customer_name || ''}","${sale.phone_number || ''}","${sale.payment_method || 'Cash'}","${sale.momo_ref || ''}","${sale.total_amount}","${sale.amount_paid}","${sale.balance_due}","${sale.storage_status || ''}","${sale.storage_notes || ''}","${itemsDesc.replace(/"/g, '""')}"`
    );
  }

  return rows.join('\n');
}

export function deleteSale(id: number): void {
  db.withTransactionSync(() => {
    const items = db.getAllSync<SaleItem>('SELECT * FROM sale_items WHERE sale_id = ?', [id]);
    for (const item of items) {
      if (item.product_id) {
        updateStock(item.product_id, item.quantity);
      }
    }
    db.runSync('DELETE FROM debt_payments WHERE sale_id = ?', [id]);
    db.runSync('DELETE FROM sale_items WHERE sale_id = ?', [id]);
    db.runSync('DELETE FROM sales WHERE id = ?', [id]);
  });
}

export function updateSale(
  id: number,
  sale: Partial<Pick<Sale, 'customer_name' | 'phone_number' | 'amount_paid' | 'balance_due' | 'payment_method' | 'momo_ref' | 'storage_status' | 'storage_notes'>>
): void {
  const updates: string[] = [];
  const params: any[] = [];

  if (sale.customer_name !== undefined) {
    updates.push('customer_name = ?');
    params.push(sale.customer_name);
  }
  if (sale.phone_number !== undefined) {
    updates.push('phone_number = ?');
    params.push(sale.phone_number);
  }
  if (sale.amount_paid !== undefined) {
    updates.push('amount_paid = ?');
    params.push(sale.amount_paid);
  }
  if (sale.balance_due !== undefined) {
    updates.push('balance_due = ?');
    params.push(sale.balance_due);
  }
  if (sale.payment_method !== undefined) {
    updates.push('payment_method = ?');
    params.push(sale.payment_method);
  }
  if (sale.momo_ref !== undefined) {
    updates.push('momo_ref = ?');
    params.push(sale.momo_ref);
  }
  if (sale.storage_status !== undefined) {
    updates.push('storage_status = ?');
    params.push(sale.storage_status);
  }
  if (sale.storage_notes !== undefined) {
    updates.push('storage_notes = ?');
    params.push(sale.storage_notes);
  }

  if (updates.length > 0) {
    params.push(id);
    db.runSync(`UPDATE sales SET ${updates.join(', ')} WHERE id = ?`, params);
  }
}

// Storage / Pending Pickup functions
export function getStoredSales(): Sale[] {
  return db.getAllSync<Sale>(
    "SELECT * FROM sales WHERE storage_status = 'stored' ORDER BY created_at DESC"
  );
}

export function getPickedUpSales(): Sale[] {
  return db.getAllSync<Sale>(
    "SELECT * FROM sales WHERE storage_status = 'picked_up' ORDER BY created_at DESC LIMIT 20"
  );
}

export function updateStorageStatus(saleId: number, status: StorageStatus, notes?: string): void {
  if (notes !== undefined) {
    db.runSync(
      'UPDATE sales SET storage_status = ?, storage_notes = ? WHERE id = ?',
      [status, notes, saleId]
    );
  } else {
    db.runSync(
      'UPDATE sales SET storage_status = ? WHERE id = ?',
      [status, saleId]
    );
  }
}

export function getStoredSalesCount(): number {
  const result = db.getFirstSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM sales WHERE storage_status = 'stored'"
  );
  return result?.count || 0;
}
