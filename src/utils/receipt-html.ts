import { Sale, SaleItem } from '../database/types';
import { formatCurrency, formatDate } from './formatting';

export function generateReceiptHTML(sale: Sale, items: SaleItem[]): string {
  const itemRows = items.map((item, index) => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${index + 1}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;">${item.item_name}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${item.category}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(item.unit_price)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${formatCurrency(item.total_price)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; padding: 20px; color: #111; }
        .receipt { max-width: 400px; margin: 0 auto; border: 2px solid #021235; padding: 20px; border-radius: 8px; }
        .header { text-align: center; border-bottom: 2px dashed #021235; padding-bottom: 15px; margin-bottom: 15px; }
        .header h1 { font-size: 19px; font-weight: 800; color: #021235; letter-spacing: 1px; margin-bottom: 4px; }
        .header .sub { font-size: 12px; font-weight: 700; color: #d97706; margin-bottom: 4px; }
        .header .location { font-size: 11px; color: #4b5563; }
        .info { margin-bottom: 15px; font-size: 12px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 15px; }
        th { background: #021235; color: white; padding: 8px 6px; text-align: left; font-size: 10px; text-transform: uppercase; }
        .totals { border-top: 2px dashed #021235; padding-top: 12px; font-size: 13px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
        .total-row.grand { font-size: 16px; font-weight: 800; border-top: 1px solid #021235; padding-top: 8px; margin-top: 8px; color: #021235; }
        .total-row.balance { color: #dc2626; font-weight: 700; }
        .footer { margin-top: 25px; text-align: center; border-top: 2px dashed #021235; padding-top: 15px; font-size: 11px; }
        .signature { margin-top: 35px; border-top: 1px solid #4b5563; width: 200px; margin-left: auto; margin-right: auto; padding-top: 5px; text-align: center; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <h1>KING GEORGE ENTERPRISE</h1>
          <div class="sub">GENERAL MERCHANT & PROVISIONS</div>
          <div class="location">JUABEN ADUMASA, ASHANTI REGION</div>
          <div class="location" style="margin-top:2px;">Phone / MoMo: 0548809611</div>
        </div>

        <div class="info">
          <div class="info-row"><span><strong>Receipt #:</strong> ${String(sale.id).padStart(6, '0')}</span><span><strong>Date:</strong> ${formatDate(sale.receipt_date)}</span></div>
          <div class="info-row"><span><strong>Customer:</strong> ${sale.customer_name || 'Walk-in Customer'}</span></div>
          <div class="info-row"><span><strong>Phone:</strong> ${sale.phone_number || 'N/A'}</span></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align:center;">#</th>
              <th>Item</th>
              <th style="text-align:center;">Unit</th>
              <th style="text-align:center;">Qty</th>
              <th style="text-align:right;">Price</th>
              <th style="text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div class="totals">
          <div class="total-row grand">
            <span>TOTAL AMOUNT:</span>
            <span>${formatCurrency(sale.total_amount)}</span>
          </div>
          <div class="total-row">
            <span>Payment Method:</span>
            <span><strong>${sale.payment_method || 'Cash'}</strong></span>
          </div>
          <div class="total-row">
            <span>Amount Paid:</span>
            <span>${formatCurrency(sale.amount_paid)}</span>
          </div>
          ${sale.balance_due > 0 ? `
          <div class="total-row balance">
            <span>Balance Due:</span>
            <span>${formatCurrency(sale.balance_due)}</span>
          </div>
          <div style="font-size:10px;color:#666;margin-top:6px;text-align:right;">
            MoMo Settlement: 0548809611 (GEORGE GYAMFI)
          </div>
          ` : ''}
        </div>

        <div class="signature">
          King George / Manager Signature
        </div>

        <div class="footer">
          <p>Thank you for choosing King George Enterprise!</p>
          <p style="margin-top:4px;color:#888;">Honesty & Quality Service in Adumasa 🙏</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
