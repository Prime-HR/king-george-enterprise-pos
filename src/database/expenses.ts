import { db } from './db';
import { Expense, ExpenseCategory, PaymentMethod } from './types';

export function addExpense(
  expense: Omit<Expense, 'id' | 'created_at'>
): number {
  const result = db.runSync(
    `INSERT INTO expenses (
      title, amount, category, payment_method, notes, expense_date
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      expense.title.trim(),
      expense.amount,
      expense.category || 'Other',
      expense.payment_method || 'Cash',
      expense.notes?.trim() || null,
      expense.expense_date,
    ]
  );
  return result.lastInsertRowId;
}

export function getExpensesByDate(date: string): Expense[] {
  return db.getAllSync<Expense>(
    'SELECT * FROM expenses WHERE expense_date LIKE ? ORDER BY id DESC',
    [`${date}%`]
  );
}

export function getRecentExpenses(limit: number = 20): Expense[] {
  return db.getAllSync<Expense>(
    'SELECT * FROM expenses ORDER BY id DESC LIMIT ?',
    [limit]
  );
}

export function getDailyExpenseTotal(date: string): number {
  const row = db.getFirstSync<{ total: number }>(
    'SELECT SUM(amount) as total FROM expenses WHERE expense_date LIKE ?',
    [`${date}%`]
  );
  return row?.total || 0;
}

export function getPeriodExpenses(
  filter: 'today' | 'week' | 'month' | 'all'
): { total: number; cashTotal: number; expenses: Expense[] } {
  let dateClause = '';
  const params: any[] = [];
  const today = new Date();

  if (filter === 'today') {
    const todayStr = today.toISOString().split('T')[0];
    dateClause = 'WHERE expense_date LIKE ?';
    params.push(`${todayStr}%`);
  } else if (filter === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);
    dateClause = 'WHERE expense_date >= ?';
    params.push(weekAgo.toISOString().split('T')[0]);
  } else if (filter === 'month') {
    const monthStr = today.toISOString().slice(0, 7);
    dateClause = 'WHERE expense_date LIKE ?';
    params.push(`${monthStr}%`);
  }

  const expenses = db.getAllSync<Expense>(
    `SELECT * FROM expenses ${dateClause} ORDER BY id DESC`,
    params
  );

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const cashTotal = expenses
    .filter((e) => e.payment_method === 'Cash')
    .reduce((sum, e) => sum + e.amount, 0);

  return { total, cashTotal, expenses };
}

export function deleteExpense(id: number): void {
  db.runSync('DELETE FROM expenses WHERE id = ?', [id]);
}
