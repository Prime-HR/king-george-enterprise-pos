import { db } from './db';
import { Product } from './types';

export function getAllProducts(): Product[] {
  return db.getAllSync<Product>('SELECT * FROM products ORDER BY name ASC');
}

export function getProductById(id: number): Product | null {
  return db.getFirstSync<Product>('SELECT * FROM products WHERE id = ?', [id]);
}

export function findProductBySku(sku: string): Product | null {
  if (!sku || !sku.trim()) return null;
  return db.getFirstSync<Product>('SELECT * FROM products WHERE sku = ? COLLATE NOCASE', [sku.trim()]);
}

export function addProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): number {
  const result = db.runSync(
    `INSERT INTO products (
      name, unit_price, cost_price, stock_quantity, category, low_stock_threshold, sku, image_uri
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.name,
      product.unit_price,
      product.cost_price || 0,
      product.stock_quantity,
      product.category,
      product.low_stock_threshold,
      product.sku || null,
      product.image_uri || null,
    ]
  );
  return result.lastInsertRowId;
}

export function updateProduct(id: number, product: Partial<Product>): void {
  const updates: string[] = [];
  const params: any[] = [];

  if (product.name !== undefined) {
    updates.push('name = ?');
    params.push(product.name);
  }
  if (product.unit_price !== undefined) {
    updates.push('unit_price = ?');
    params.push(product.unit_price);
  }
  if (product.cost_price !== undefined) {
    updates.push('cost_price = ?');
    params.push(product.cost_price);
  }
  if (product.stock_quantity !== undefined) {
    updates.push('stock_quantity = ?');
    params.push(product.stock_quantity);
  }
  if (product.category !== undefined) {
    updates.push('category = ?');
    params.push(product.category);
  }
  if (product.low_stock_threshold !== undefined) {
    updates.push('low_stock_threshold = ?');
    params.push(product.low_stock_threshold);
  }
  if (product.sku !== undefined) {
    updates.push('sku = ?');
    params.push(product.sku);
  }
  if (product.image_uri !== undefined) {
    updates.push('image_uri = ?');
    params.push(product.image_uri);
  }

  if (updates.length > 0) {
    updates.push('updated_at = datetime("now","localtime")');
    params.push(id);
    db.runSync(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`, params);
  }
}

export function deleteProduct(id: number): void {
  db.runSync('DELETE FROM products WHERE id = ?', [id]);
}

export function updateStock(id: number, quantityChange: number): void {
  db.runSync(
    'UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = datetime("now","localtime") WHERE id = ?',
    [quantityChange, id]
  );
}

export function getLowStockProducts(): Product[] {
  return db.getAllSync<Product>(
    'SELECT * FROM products WHERE stock_quantity <= low_stock_threshold AND stock_quantity > 0 ORDER BY stock_quantity ASC'
  );
}

export function getOutOfStockProducts(): Product[] {
  return db.getAllSync<Product>(
    'SELECT * FROM products WHERE stock_quantity <= 0 ORDER BY name ASC'
  );
}

export function searchProducts(query: string): Product[] {
  const q = `%${query.trim()}%`;
  return db.getAllSync<Product>(
    'SELECT * FROM products WHERE name LIKE ? OR sku LIKE ? ORDER BY name ASC',
    [q, q]
  );
}

export function exportInventoryCSV(): string {
  const products = getAllProducts();
  const rows: string[] = [];
  rows.push('ID,SKU,Name,Category,Cost Price (GHC),Selling Price (GHC),Unit Profit (GHC),Stock Qty,Threshold,Total Stock Value (GHC)');

  for (const p of products) {
    const cost = p.cost_price || 0;
    const profit = p.unit_price - cost;
    const totalVal = p.stock_quantity * p.unit_price;
    rows.push(
      `"${p.id}","${p.sku || ''}","${p.name.replace(/"/g, '""')}","${p.category}","${cost}","${p.unit_price}","${profit.toFixed(2)}","${p.stock_quantity}","${p.low_stock_threshold}","${totalVal.toFixed(2)}"`
    );
  }

  return rows.join('\n');
}
