import { db } from './db';
import { Sale, SaleItem, DebtPayment, DebtorSummary, PaymentMethod } from './types';
import { getSaleById, getSaleItems } from './sales';
import { getShopPaymentInfo } from './settings';
import { formatCurrency, formatDate } from '../utils/formatting';

export function getDebtors(): DebtorSummary[] {
  const sales = db.getAllSync<Sale>(
    'SELECT * FROM sales WHERE balance_due > 0 ORDER BY receipt_date ASC, created_at ASC'
  );

  return sales.map((sale) => {
    const items = getSaleItems(sale.id!);
    const payments = db.getAllSync<DebtPayment>(
      'SELECT * FROM debt_payments WHERE sale_id = ? ORDER BY created_at DESC',
      [sale.id!]
    );

    const saleDate = new Date(sale.receipt_date).getTime();
    const now = Date.now();
    const daysOverdue = Math.max(0, Math.floor((now - saleDate) / (1000 * 60 * 60 * 24)));

    return {
      sale,
      items,
      payments,
      days_overdue: daysOverdue,
    };
  });
}

export function getTotalOutstandingDebt(): number {
  const row = db.getFirstSync<{ total: number }>(
    'SELECT SUM(balance_due) as total FROM sales WHERE balance_due > 0'
  );
  return row?.total || 0;
}

export function getTodayDebtCollected(): number {
  const todayStr = new Date().toISOString().split('T')[0];
  const row = db.getFirstSync<{ total: number }>(
    'SELECT SUM(amount) as total FROM debt_payments WHERE created_at LIKE ?',
    [`${todayStr}%`]
  );
  return row?.total || 0;
}

export function recordDebtPayment(
  saleId: number,
  amount: number,
  paymentMethod: PaymentMethod = 'Cash',
  notes: string = ''
): { success: boolean; newBalance: number; error?: string } {
  if (amount <= 0) {
    return { success: false, newBalance: 0, error: 'Payment amount must be greater than zero.' };
  }

  const sale = getSaleById(saleId);
  if (!sale) {
    return { success: false, newBalance: 0, error: 'Sale record not found.' };
  }

  let newBalance = 0;

  db.withTransactionSync(() => {
    db.runSync(
      'INSERT INTO debt_payments (sale_id, customer_name, amount, payment_method, notes) VALUES (?, ?, ?, ?, ?)',
      [saleId, sale.customer_name || 'Walk-in', amount, paymentMethod, notes || null]
    );

    const updatedPaid = sale.amount_paid + amount;
    newBalance = Math.max(0, sale.balance_due - amount);

    db.runSync(
      'UPDATE sales SET amount_paid = ?, balance_due = ? WHERE id = ?',
      [updatedPaid, newBalance, saleId]
    );
  });

  return { success: true, newBalance };
}

export function getDebtPaymentHistory(saleId: number): DebtPayment[] {
  return db.getAllSync<DebtPayment>(
    'SELECT * FROM debt_payments WHERE sale_id = ? ORDER BY created_at DESC',
    [saleId]
  );
}

export function generateDebtReminderMessage(sale: Sale): string {
  const shopInfo = getShopPaymentInfo();
  const divider = '─────────────────────────';

  let msg = `👑 *KING GEORGE ENTERPRISE*\n`;
  msg += `📍 Juaben Adumasa, Ashanti\n`;
  msg += `${divider}\n`;
  msg += `Hello *${sale.customer_name || 'Valued Customer'}*,\n\n`;
  msg += `This is a polite payment reminder regarding your purchase on *${formatDate(sale.receipt_date)}* (Receipt #${String(sale.id).padStart(6, '0')}).\n\n`;
  msg += `💰 *Total Bill:* ${formatCurrency(sale.total_amount)}\n`;
  msg += `✅ *Amount Paid:* ${formatCurrency(sale.amount_paid)}\n`;
  msg += `⚠️ *OUTSTANDING BALANCE:* *${formatCurrency(sale.balance_due)}*\n\n`;
  msg += `${divider}\n`;
  msg += `📱 *HOW TO SETTLE VIA MOBILE MONEY:*\n`;
  msg += `• Network: MTN MoMo\n`;
  msg += `• Number: *${shopInfo.momoNumber}*\n`;
  msg += `• Account Name: *${shopInfo.momoName}*\n`;
  msg += `• Reference: *Receipt #${String(sale.id).padStart(6, '0')}*\n\n`;
  msg += `You can also pay directly at our shop in Juaben Adumasa.\n`;
  msg += `Thank you for your business! 🙏\n`;
  msg += `God Bless You!`;

  return msg;
}
