/* ============================================================
   KING GEORGE ENTERPRISE - PWA FIELD APP
   Juaben Adumasa, Ashanti Region, Ghana
   Tel / MoMo: 0548809611 (GEORGE GYAMFI)
   ============================================================ */

// Register Service Worker for 100% Offline Capability
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.log('SW failed', err));
  });
}

// PWA Install Prompt Handler
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const banner = document.getElementById('install-banner');
  if (banner) banner.style.display = 'flex';
});

function installApp() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null;
      document.getElementById('install-banner').style.display = 'none';
    });
  }
}

function dismissInstall() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.style.display = 'none';
}

// ===== UTILITIES =====
function uuid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatMoney(amount) {
  return 'GH₵ ' + parseFloat(amount || 0).toFixed(2);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return dateStr;
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerText = msg;
  t.style.display = 'block';
  setTimeout(() => {
    t.style.display = 'none';
  }, 2500);
}

// ===== LOCAL DATABASE LAYER =====
const DB = {
  KEY: 'king_george_pos_data_v1',
  load() {
    try {
      const data = localStorage.getItem(this.KEY);
      if (data) return JSON.parse(data);
    } catch (e) {}
    return this.defaultData();
  },
  save(data) {
    localStorage.setItem(this.KEY, JSON.stringify(data));
    updateBadges();
  },
  defaultData() {
    return {
      products: [
        { id: '1', name: 'Royal Aroma Fragrant Rice 25kg', unit_price: 520, cost_price: 470, stock: 40, category: 'Bags', low_stock: 5 },
        { id: '2', name: 'Gino Pure Vegetable Oil 25L', unit_price: 680, cost_price: 620, stock: 25, category: 'Gallons', low_stock: 4 },
        { id: '3', name: 'St. Louis Cube Sugar Carton (50 boxes)', unit_price: 480, cost_price: 430, stock: 30, category: 'Cartons', low_stock: 5 },
        { id: '4', name: 'Ideal Evaporated Milk Crate (48 tins)', unit_price: 290, cost_price: 260, stock: 50, category: 'Crates', low_stock: 8 },
        { id: '5', name: 'Milo Tin Refill Pack 400g', unit_price: 45, cost_price: 38, stock: 80, category: 'Packs', low_stock: 15 },
        { id: '6', name: 'Voltic Mineral Water 500ml (Pack of 16)', unit_price: 35, cost_price: 28, stock: 100, category: 'Packs', low_stock: 20 },
        { id: '7', name: 'Frytol Premium Cooking Oil 5L', unit_price: 140, cost_price: 120, stock: 35, category: 'Gallons', low_stock: 6 },
        { id: '8', name: 'Geisha Soap Herbal Green Carton (48 pcs)', unit_price: 220, cost_price: 190, stock: 30, category: 'Cartons', low_stock: 5 },
        { id: '9', name: 'Omo Multi-Active Detergent 1kg', unit_price: 28, cost_price: 22, stock: 75, category: 'Packs', low_stock: 15 },
        { id: '10', name: 'Tasty Tom Tomato Paste Carton (50 sachets)', unit_price: 180, cost_price: 155, stock: 40, category: 'Cartons', low_stock: 8 },
        { id: '11', name: 'Key Soap Bar Long (1 piece)', unit_price: 18, cost_price: 14, stock: 120, category: 'Pieces', low_stock: 25 },
        { id: '12', name: 'Malta Guinness Crate (24 bottles)', unit_price: 190, cost_price: 165, stock: 30, category: 'Crates', low_stock: 5 },
        { id: '13', name: 'Spaghetti Gino Carton (20 packs)', unit_price: 160, cost_price: 140, stock: 45, category: 'Cartons', low_stock: 8 }
      ],
      sales: [],
      debtPayments: [],
      expenses: [],
      settings: {
        shopName: 'KING GEORGE ENTERPRISE',
        shopTagline: 'General Merchant & Provisions Depot',
        shopLocation: 'Juaben Adumasa, Ashanti Region',
        shopPhone: '0548809611',
        shopEmail: 'gyamfigeorge9990@gmail.com',
        momoNumber: '0548809611',
        momoName: 'GEORGE GYAMFI',
        adminPin: '1234'
      }
    };
  }
};

// Global State
let currentCart = [];
let activePeriod = 'today';
let showProfit = false;
let currentReceiptSale = null;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  const data = DB.load();
  if (!localStorage.getItem(DB.KEY)) {
    DB.save(data);
  }
  document.getElementById('sale-date').value = today();
  updateBadges();
  renderProductsList();
  renderDebtorsList();
  renderStoredList();
  renderDashboard();
  setupCustomerAutocomplete();
});

// Tab Switcher
function switchTab(tabId) {
  document.querySelectorAll('.tab-view').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach((el) => el.classList.remove('active'));

  const view = document.getElementById('view-' + tabId);
  const btn = document.getElementById('tab-' + tabId);
  if (view) view.classList.add('active');
  if (btn) btn.classList.add('active');

  if (tabId === 'inventory') renderProductsList();
  if (tabId === 'debtors') renderDebtorsList();
  if (tabId === 'storage') renderStoredList();
  if (tabId === 'dashboard') renderDashboard();
  updateBadges();
}

function updateBadges() {
  const data = DB.load();
  // Debtors count
  const debtors = data.sales.filter((s) => s.balance_due > 0);
  const debtorBadge = document.getElementById('badge-debtors');
  if (debtorBadge) {
    debtorBadge.innerText = debtors.length;
    debtorBadge.style.display = debtors.length > 0 ? 'inline-block' : 'none';
  }

  // Stored count
  const stored = data.sales.filter((s) => s.storage_status === 'stored');
  const storedBadge = document.getElementById('badge-stored');
  if (storedBadge) {
    storedBadge.innerText = stored.length;
    storedBadge.style.display = stored.length > 0 ? 'inline-block' : 'none';
  }
}

// ===== NEW SALE & CART LOGIC =====
function setupCustomerAutocomplete() {
  const input = document.getElementById('customer-name');
  const phoneInput = document.getElementById('customer-phone');
  const box = document.getElementById('customer-suggestions');

  input.addEventListener('input', () => {
    const val = input.value.toLowerCase().trim();
    const data = DB.load();
    const map = new Map();
    data.sales.forEach((s) => {
      if (s.customer_name && s.customer_name !== 'Walk-in Customer') {
        map.set(s.customer_name, s.phone_number || '');
      }
    });

    const matches = [];
    map.forEach((phone, name) => {
      if (!val || name.toLowerCase().includes(val) || phone.includes(val)) {
        matches.push({ name, phone });
      }
    });

    if (matches.length > 0 && document.activeElement === input) {
      box.innerHTML = matches
        .slice(0, 4)
        .map(
          (m) => `
        <div class="suggestion-item" onclick="pickCustomer('${m.name.replace(/'/g, "\\'")}', '${m.phone}')">
          <div><strong>${m.name}</strong><br><small style="color:#6b7280;">📞 ${m.phone || 'No phone'}</small></div>
          <span style="color:#021235;font-weight:bold;">→</span>
        </div>
      `
        )
        .join('');
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
    }
  });

  input.addEventListener('focus', () => input.dispatchEvent(new Event('input')));
}

function pickCustomer(name, phone) {
  document.getElementById('customer-name').value = name;
  document.getElementById('customer-phone').value = phone;
  document.getElementById('customer-suggestions').style.display = 'none';
}

function searchProductsLive(query) {
  const box = document.getElementById('product-suggestions');
  if (!query.trim()) {
    box.style.display = 'none';
    return;
  }
  const q = query.toLowerCase().trim();
  const data = DB.load();
  const matches = data.products.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 5);

  if (matches.length > 0) {
    box.innerHTML = matches
      .map(
        (p) => `
      <div class="suggestion-item" onclick="selectProductToForm('${p.id}')">
        <div>
          <strong>${p.name}</strong>
          <br><small style="color:#059669;font-weight:bold;">${formatMoney(p.unit_price)}</small>
          <small style="color:#6b7280;"> • In Stock: ${p.stock} ${p.category}</small>
        </div>
        <button class="btn-sm btn-gold">Pick</button>
      </div>
    `
      )
      .join('');
    box.style.display = 'block';
  } else {
    box.style.display = 'none';
  }
}

function selectProductToForm(productId) {
  const data = DB.load();
  const p = data.products.find((x) => x.id === productId);
  if (!p) return;
  document.getElementById('item-name').value = p.name;
  document.getElementById('item-price').value = p.unit_price;
  document.getElementById('item-category').value = p.category;
  document.getElementById('item-product-id').value = p.id;
  document.getElementById('item-qty').focus();
  document.getElementById('product-suggestions').style.display = 'none';
  calculateItemSubtotal();
}

function calculateItemSubtotal() {
  const price = parseFloat(document.getElementById('item-price').value) || 0;
  const qty = parseFloat(document.getElementById('item-qty').value) || 0;
  const subtotalEl = document.getElementById('item-subtotal-text');
  if (price > 0 && qty > 0) {
    subtotalEl.innerText = 'Subtotal: ' + formatMoney(price * qty);
    subtotalEl.style.display = 'block';
  } else {
    subtotalEl.style.display = 'none';
  }
}

function addItemToCart() {
  const name = document.getElementById('item-name').value.trim();
  const price = parseFloat(document.getElementById('item-price').value);
  const qty = parseFloat(document.getElementById('item-qty').value);
  const category = document.getElementById('item-category').value;
  const productId = document.getElementById('item-product-id').value;

  if (!name) return alert('Please enter or select a product.');
  if (isNaN(price) || price <= 0) return alert('Please enter a valid price.');
  if (isNaN(qty) || qty <= 0) return alert('Please enter a valid quantity.');

  const data = DB.load();
  let costPrice = 0;
  if (productId) {
    const p = data.products.find((x) => x.id === productId);
    if (p) costPrice = p.cost_price || 0;
  }

  currentCart.push({
    name,
    unit_price: price,
    cost_price: costPrice,
    quantity: qty,
    total_price: price * qty,
    category,
    product_id: productId || null
  });

  document.getElementById('item-name').value = '';
  document.getElementById('item-price').value = '';
  document.getElementById('item-qty').value = '';
  document.getElementById('item-product-id').value = '';
  document.getElementById('item-subtotal-text').style.display = 'none';

  renderCart();
  showToast('Added ' + name);
}

function renderCart() {
  const container = document.getElementById('cart-items-list');
  const cartCard = document.getElementById('cart-card');
  const totalEl = document.getElementById('cart-grand-total');

  if (currentCart.length === 0) {
    cartCard.style.display = 'none';
    document.getElementById('payment-card').style.display = 'none';
    return;
  }

  cartCard.style.display = 'block';
  document.getElementById('payment-card').style.display = 'block';

  let grandTotal = 0;
  container.innerHTML = currentCart
    .map((item, idx) => {
      grandTotal += item.total_price;
      return `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f3f4f6;">
        <div style="flex:1;">
          <div style="font-weight:700;font-size:13px;">${idx + 1}. ${item.name}</div>
          <div style="font-size:11px;color:#6b7280;">${item.quantity} ${item.category} × ${formatMoney(item.unit_price)}</div>
        </div>
        <div style="text-align:right;margin-right:10px;">
          <strong style="color:#021235;font-size:13px;">${formatMoney(item.total_price)}</strong>
        </div>
        <button onclick="removeFromCart(${idx})" style="background:#fee2e2;color:#ef4444;border:none;border-radius:8px;padding:4px 8px;font-size:12px;cursor:pointer;">🗑</button>
      </div>
    `;
    })
    .join('');

  totalEl.innerText = formatMoney(grandTotal);

  // Default amount paid to full if empty
  const amtPaidInput = document.getElementById('amount-paid');
  const currentMethod = document.getElementById('payment-method').value;
  if (!amtPaidInput.value || amtPaidInput.value === '0') {
    if (currentMethod !== 'Credit') {
      amtPaidInput.value = grandTotal.toFixed(2);
    }
  }
  calculateBalance();
}

function removeFromCart(index) {
  currentCart.splice(index, 1);
  renderCart();
}

function clearCart() {
  if (confirm('Clear all items in this sale?')) {
    currentCart = [];
    renderCart();
  }
}

function handlePaymentMethodChange() {
  const method = document.getElementById('payment-method').value;
  const momoBox = document.getElementById('momo-ref-box');
  const grandTotal = currentCart.reduce((s, i) => s + i.total_price, 0);

  if (method === 'MTN MoMo' || method === 'Telecel Cash') {
    momoBox.style.display = 'block';
  } else {
    momoBox.style.display = 'none';
  }

  if (method === 'Credit') {
    document.getElementById('amount-paid').value = '0';
  } else {
    document.getElementById('amount-paid').value = grandTotal.toFixed(2);
  }
  calculateBalance();
}

function calculateBalance() {
  const grandTotal = currentCart.reduce((s, i) => s + i.total_price, 0);
  const paid = parseFloat(document.getElementById('amount-paid').value) || 0;
  const balBox = document.getElementById('balance-due-box');
  const balText = document.getElementById('balance-due-text');

  const diff = grandTotal - paid;
  if (diff > 0.01) {
    balBox.style.display = 'block';
    balText.innerText = 'Balance Due (Debtor): ' + formatMoney(diff);
  } else {
    balBox.style.display = 'none';
  }
}

function setPaidFull() {
  const grandTotal = currentCart.reduce((s, i) => s + i.total_price, 0);
  document.getElementById('amount-paid').value = grandTotal.toFixed(2);
  if (document.getElementById('payment-method').value === 'Credit') {
    document.getElementById('payment-method').value = 'Cash';
    document.getElementById('momo-ref-box').style.display = 'none';
  }
  calculateBalance();
}

function setCreditFull() {
  document.getElementById('amount-paid').value = '0';
  document.getElementById('payment-method').value = 'Credit';
  document.getElementById('momo-ref-box').style.display = 'none';
  calculateBalance();
}

function generateSaleReceipt() {
  if (currentCart.length === 0) return alert('Please add at least one product.');

  const customerName = document.getElementById('customer-name').value.trim() || 'Walk-in Customer';
  const phoneNumber = document.getElementById('customer-phone').value.trim();
  const receiptDate = document.getElementById('sale-date').value || today();
  const paymentMethod = document.getElementById('payment-method').value;
  const momoRef = document.getElementById('momo-ref').value.trim();
  const storeAtShop = document.getElementById('store-at-shop').checked;
  const storageNotes = document.getElementById('storage-notes').value.trim();

  const grandTotal = currentCart.reduce((s, i) => s + i.total_price, 0);
  const paid = parseFloat(document.getElementById('amount-paid').value) || 0;
  const balanceDue = Math.max(0, grandTotal - paid);

  const sale = {
    id: Math.floor(10000 + Math.random() * 90000),
    customer_name: customerName,
    phone_number: phoneNumber,
    receipt_date: receiptDate,
    total_amount: grandTotal,
    amount_paid: paid,
    balance_due: balanceDue,
    payment_method: paymentMethod,
    momo_ref: momoRef || null,
    storage_status: storeAtShop ? 'stored' : 'delivered',
    storage_notes: storeAtShop ? storageNotes || null : null,
    items: [...currentCart],
    created_at: new Date().toISOString()
  };

  const data = DB.load();

  // Deduct inventory stock
  currentCart.forEach((item) => {
    if (item.product_id) {
      const p = data.products.find((x) => x.id === item.product_id);
      if (p) p.stock = Math.max(0, p.stock - item.quantity);
    }
  });

  data.sales.unshift(sale);
  DB.save(data);

  // Reset form
  currentCart = [];
  document.getElementById('customer-name').value = '';
  document.getElementById('customer-phone').value = '';
  document.getElementById('momo-ref').value = '';
  document.getElementById('store-at-shop').checked = false;
  document.getElementById('storage-notes-box').style.display = 'none';
  document.getElementById('storage-notes').value = '';
  renderCart();

  openReceiptModal(sale);
}

// ===== RECEIPT & WHATSAPP MODAL =====
function openReceiptModal(sale) {
  currentReceiptSale = sale;
  const modal = document.getElementById('receipt-modal');
  const body = document.getElementById('receipt-body');

  const itemsHtml = sale.items
    .map(
      (item, idx) => `
    <tr>
      <td style="padding:4px 0;">${idx + 1}. ${item.name}</td>
      <td style="text-align:center;">${item.quantity} ${item.category}</td>
      <td style="text-align:right;">${formatMoney(item.unit_price)}</td>
      <td style="text-align:right;font-weight:bold;">${formatMoney(item.total_price)}</td>
    </tr>
  `
    )
    .join('');

  body.innerHTML = `
    <div style="text-align:center;border-bottom:2px dashed #021235;padding-bottom:12px;margin-bottom:12px;">
      <h2 style="font-size:18px;font-weight:900;color:#021235;margin-bottom:2px;">👑 KING GEORGE ENTERPRISE</h2>
      <div style="font-size:11px;font-weight:bold;color:#d97706;">GENERAL MERCHANT & PROVISIONS DEPOT</div>
      <div style="font-size:10px;color:#4b5563;">Juaben Adumasa, Ashanti Region</div>
      <div style="font-size:10px;color:#021235;font-weight:bold;">Tel/MoMo: 0548809611</div>
    </div>

    <div style="font-size:11px;margin-bottom:12px;display:flex;justify-content:space-between;">
      <div>
        <div><strong>Receipt #:</strong> ${sale.id}</div>
        <div><strong>Customer:</strong> ${sale.customer_name}</div>
        ${sale.phone_number ? `<div><strong>Phone:</strong> ${sale.phone_number}</div>` : ''}
      </div>
      <div style="text-align:right;">
        <div><strong>Date:</strong> ${formatDate(sale.receipt_date)}</div>
        <div><strong>Method:</strong> ${sale.payment_method}</div>
      </div>
    </div>

    <table style="width:100%;font-size:11px;border-collapse:collapse;margin-bottom:12px;">
      <thead>
        <tr style="border-bottom:1px solid #e5e7eb;text-align:left;color:#6b7280;font-size:10px;">
          <th>ITEM</th>
          <th style="text-align:center;">QTY</th>
          <th style="text-align:right;">PRICE</th>
          <th style="text-align:right;">TOTAL</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="border-top:2px dashed #021235;padding-top:10px;font-size:12px;">
      <div style="display:flex;justify-content:space-between;font-weight:900;font-size:15px;color:#021235;margin-bottom:4px;">
        <span>TOTAL:</span>
        <span>${formatMoney(sale.total_amount)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;color:#059669;font-weight:bold;margin-bottom:2px;">
        <span>Paid:</span>
        <span>${formatMoney(sale.amount_paid)}</span>
      </div>
      ${
        sale.balance_due > 0
          ? `
        <div style="display:flex;justify-content:space-between;color:#dc2626;font-weight:bold;margin-bottom:4px;">
          <span>Balance Due:</span>
          <span>${formatMoney(sale.balance_due)}</span>
        </div>
      `
          : ''
      }
      ${
        sale.momo_ref
          ? `
        <div style="font-size:10px;color:#b45309;font-weight:bold;margin-top:4px;">
          MoMo Ref / TXN: ${sale.momo_ref}
        </div>
      `
          : ''
      }
    </div>

    <div style="text-align:center;margin-top:20px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:10px;color:#6b7280;">
      Thank you for shopping at King George Enterprise!<br>
      Adumasa • Honesty & Quality Service
    </div>
  `;

  modal.style.display = 'flex';
}

function closeReceiptModal() {
  document.getElementById('receipt-modal').style.display = 'none';
}

function printReceipt() {
  window.print();
}

function sendReceiptWhatsApp() {
  if (!currentReceiptSale) return;
  const s = currentReceiptSale;

  let msg = `👑 *KING GEORGE ENTERPRISE*\n`;
  msg += `📍 Juaben Adumasa, Ashanti\n`;
  msg += `📞 Tel/MoMo: 0548809611\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📄 *Receipt #${s.id}*\n`;
  msg += `📅 Date: ${formatDate(s.receipt_date)}\n`;
  msg += `👤 Customer: ${s.customer_name}\n`;
  if (s.phone_number) msg += `📞 Phone: ${s.phone_number}\n`;
  msg += `─────────────────────────\n`;
  msg += `*ITEMS PURCHASED:*\n`;

  s.items.forEach((item, idx) => {
    msg += `${idx + 1}. ${item.name}\n`;
    msg += `   ${item.quantity} ${item.category} × ${formatMoney(item.unit_price)} = *${formatMoney(item.total_price)}*\n`;
  });

  msg += `─────────────────────────\n`;
  msg += `💰 *TOTAL: ${formatMoney(s.total_amount)}*\n`;
  msg += `💳 *Method:* ${s.payment_method}\n`;
  if (s.momo_ref) msg += `🔖 *MoMo Ref:* ${s.momo_ref}\n`;
  msg += `✅ *Paid:* ${formatMoney(s.amount_paid)}\n`;

  if (s.balance_due > 0) {
    msg += `⚠️ *BALANCE DUE:* *${formatMoney(s.balance_due)}*\n`;
    msg += `📱 MoMo: 0548809611 (GEORGE GYAMFI)\n`;
  }

  msg += `─────────────────────────\n`;
  msg += `🙏 Thank you for your business in Adumasa!`;

  let cleanPhone = (s.phone_number || '').replace(/[\s\-\(\)]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '233' + cleanPhone.substring(1);

  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// ===== INVENTORY LOGIC =====
function renderProductsList() {
  const data = DB.load();
  const search = (document.getElementById('inventory-search')?.value || '').toLowerCase().trim();
  const listEl = document.getElementById('inventory-list');
  if (!listEl) return;

  const filtered = data.products.filter((p) => !search || p.name.toLowerCase().includes(search));

  listEl.innerHTML = filtered
    .map(
      (p) => `
    <div class="card" style="margin-bottom:8px;padding:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div style="flex:1;">
          <div style="font-weight:800;font-size:14px;color:#021235;">${p.name}</div>
          <div style="font-size:12px;color:#059669;font-weight:bold;margin-top:2px;">
            ${formatMoney(p.unit_price)} <span style="font-size:10px;color:#6b7280;font-weight:normal;">/ ${p.category}</span>
          </div>
          <div style="font-size:10px;color:#6b7280;margin-top:2px;">
            Cost: ${formatMoney(p.cost_price || 0)} • Profit/unit: ${formatMoney(p.unit_price - (p.cost_price || 0))}
          </div>
        </div>
        <div style="text-align:right;">
          <span style="font-size:11px;font-weight:bold;padding:3px 8px;border-radius:8px;background:${
            p.stock <= p.low_stock ? '#fee2e2;color:#dc2626;' : '#ecfdf5;color:#059669;'
          }">
            ${p.stock} in stock
          </span>
          <div style="margin-top:8px;">
            <button onclick="openEditProductModal('${p.id}')" class="btn-sm btn-gold">Edit</button>
            <button onclick="deleteProduct('${p.id}')" class="btn-sm" style="background:#fee2e2;color:#dc2626;">🗑</button>
          </div>
        </div>
      </div>
    </div>
  `
    )
    .join('');
}

function openAddProductModal() {
  document.getElementById('edit-product-id').value = '';
  document.getElementById('edit-product-name').value = '';
  document.getElementById('edit-product-price').value = '';
  document.getElementById('edit-product-cost').value = '';
  document.getElementById('edit-product-stock').value = '';
  document.getElementById('edit-product-category').value = 'Pieces';
  document.getElementById('edit-product-threshold').value = '5';
  document.getElementById('product-modal-title').innerText = 'Add New Product';
  document.getElementById('product-modal').style.display = 'flex';
}

function openEditProductModal(id) {
  const data = DB.load();
  const p = data.products.find((x) => x.id === id);
  if (!p) return;
  document.getElementById('edit-product-id').value = p.id;
  document.getElementById('edit-product-name').value = p.name;
  document.getElementById('edit-product-price').value = p.unit_price;
  document.getElementById('edit-product-cost').value = p.cost_price || 0;
  document.getElementById('edit-product-stock').value = p.stock;
  document.getElementById('edit-product-category').value = p.category;
  document.getElementById('edit-product-threshold').value = p.low_stock || 5;
  document.getElementById('product-modal-title').innerText = 'Edit Product';
  document.getElementById('product-modal').style.display = 'flex';
}

function saveProductFromModal() {
  const id = document.getElementById('edit-product-id').value;
  const name = document.getElementById('edit-product-name').value.trim();
  const price = parseFloat(document.getElementById('edit-product-price').value) || 0;
  const cost = parseFloat(document.getElementById('edit-product-cost').value) || 0;
  const stock = parseFloat(document.getElementById('edit-product-stock').value) || 0;
  const category = document.getElementById('edit-product-category').value;
  const lowStock = parseFloat(document.getElementById('edit-product-threshold').value) || 5;

  if (!name) return alert('Product name is required.');
  if (price <= 0) return alert('Valid selling price is required.');

  const data = DB.load();
  if (id) {
    const p = data.products.find((x) => x.id === id);
    if (p) {
      p.name = name;
      p.unit_price = price;
      p.cost_price = cost;
      p.stock = stock;
      p.category = category;
      p.low_stock = lowStock;
    }
  } else {
    data.products.push({
      id: uuid(),
      name,
      unit_price: price,
      cost_price: cost,
      stock,
      category,
      low_stock: lowStock
    });
  }
  DB.save(data);
  document.getElementById('product-modal').style.display = 'none';
  renderProductsList();
  showToast('Product saved successfully');
}

function deleteProduct(id) {
  const pin = prompt('Enter manager PIN to delete product (Default: 1234):');
  const data = DB.load();
  if (pin !== data.settings.adminPin) return alert('Incorrect PIN');

  if (confirm('Delete this product permanently?')) {
    data.products = data.products.filter((p) => p.id !== id);
    DB.save(data);
    renderProductsList();
    showToast('Product deleted');
  }
}

// ===== DEBTORS LOGIC =====
function renderDebtorsList() {
  const data = DB.load();
  const debtors = data.sales.filter((s) => s.balance_due > 0);
  const container = document.getElementById('debtors-list');
  const totalDebtEl = document.getElementById('total-debt-amount');

  const totalDebt = debtors.reduce((s, d) => s + d.balance_due, 0);
  totalDebtEl.innerText = formatMoney(totalDebt);

  if (debtors.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:#9ca3af;">
        <div style="font-size:40px;margin-bottom:8px;">🎉</div>
        <strong>No Outstanding Debts!</strong>
        <p style="font-size:12px;margin-top:4px;">All customer accounts are fully paid.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = debtors
    .map((d) => {
      const days = Math.floor((Date.now() - new Date(d.receipt_date).getTime()) / (1000 * 60 * 60 * 24));
      return `
      <div class="card" style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-weight:800;font-size:14px;color:#021235;">${d.customer_name}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">
              Receipt #${d.id} • ${formatDate(d.receipt_date)} (${days}d ago)
            </div>
            ${d.phone_number ? `<div style="font-size:11px;color:#0284c7;margin-top:2px;">📞 ${d.phone_number}</div>` : ''}
          </div>
          <div style="text-align:right;">
            <div style="font-size:15px;font-weight:900;color:#dc2626;">${formatMoney(d.balance_due)}</div>
            <div style="font-size:10px;color:#6b7280;">of ${formatMoney(d.total_amount)}</div>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:12px;">
          <button onclick="openRepaymentModal(${d.id})" class="btn-primary btn-emerald flex-1 btn-sm">
            💵 Record Payment
          </button>
          <button onclick="sendDebtReminderWhatsApp(${d.id})" class="btn-primary btn-gold flex-1 btn-sm">
            📲 WhatsApp Reminder
          </button>
        </div>
      </div>
    `;
    })
    .join('');
}

let activeDebtorSaleId = null;
function openRepaymentModal(saleId) {
  activeDebtorSaleId = saleId;
  const data = DB.load();
  const sale = data.sales.find((s) => s.id === saleId);
  if (!sale) return;

  document.getElementById('repay-customer-name').innerText = sale.customer_name;
  document.getElementById('repay-balance-due').innerText = formatMoney(sale.balance_due);
  document.getElementById('repay-amount').value = sale.balance_due.toFixed(2);
  document.getElementById('repayment-modal').style.display = 'flex';
}

function submitRepayment() {
  const amt = parseFloat(document.getElementById('repay-amount').value) || 0;
  const method = document.getElementById('repay-method').value;
  if (amt <= 0) return alert('Please enter a valid amount.');

  const data = DB.load();
  const sale = data.sales.find((s) => s.id === activeDebtorSaleId);
  if (!sale) return;

  sale.amount_paid += amt;
  sale.balance_due = Math.max(0, sale.balance_due - amt);

  data.debtPayments.push({
    sale_id: sale.id,
    customer_name: sale.customer_name,
    amount: amt,
    payment_method: method,
    created_at: new Date().toISOString()
  });

  DB.save(data);
  document.getElementById('repayment-modal').style.display = 'none';
  renderDebtorsList();
  renderDashboard();
  showToast('Payment of ' + formatMoney(amt) + ' recorded!');
}

function sendDebtReminderWhatsApp(saleId) {
  const data = DB.load();
  const sale = data.sales.find((s) => s.id === saleId);
  if (!sale) return;

  let msg = `👑 *KING GEORGE ENTERPRISE*\n`;
  msg += `📍 Juaben Adumasa, Ashanti\n`;
  msg += `─────────────────────────\n`;
  msg += `Hello *${sale.customer_name}*,\n\n`;
  msg += `Friendly reminder of your balance at King George Enterprise (Receipt #${sale.id}, ${formatDate(sale.receipt_date)}):\n\n`;
  msg += `💰 *Total Bill:* ${formatMoney(sale.total_amount)}\n`;
  msg += `✅ *Paid:* ${formatMoney(sale.amount_paid)}\n`;
  msg += `⚠️ *OUTSTANDING BALANCE:* *${formatMoney(sale.balance_due)}*\n\n`;
  msg += `📱 MoMo Settlement: *0548809611* (GEORGE GYAMFI)\n`;
  msg += `Thank you for your business!`;

  let cleanPhone = (sale.phone_number || '').replace(/[\s\-\(\)]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '233' + cleanPhone.substring(1);

  const url = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

// ===== STORED ITEMS (PENDING PICKUP) =====
function renderStoredList() {
  const data = DB.load();
  const stored = data.sales.filter((s) => s.storage_status === 'stored');
  const container = document.getElementById('stored-items-list');

  if (stored.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:#9ca3af;">
        <div style="font-size:40px;margin-bottom:8px;">📦</div>
        <strong>No Stored Items Awaiting Pickup</strong>
        <p style="font-size:12px;margin-top:4px;">Products paid for but kept at the shop will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = stored
    .map(
      (s) => `
    <div class="card" style="margin-bottom:10px;background:#fffbeb;border-color:#fde68a;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div style="font-weight:800;font-size:14px;color:#92400e;">📦 ${s.customer_name}</div>
          <div style="font-size:11px;color:#b45309;margin-top:2px;">
            Receipt #${s.id} • ${formatDate(s.receipt_date)}
          </div>
          ${s.phone_number ? `<div style="font-size:11px;color:#0284c7;margin-top:2px;">📞 ${s.phone_number}</div>` : ''}
          ${s.storage_notes ? `<div style="font-size:11px;color:#4b5563;margin-top:4px;font-style:italic;">Notes: ${s.storage_notes}</div>` : ''}
        </div>
        <div style="text-align:right;">
          <span style="background:#fef3c7;color:#b45309;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:6px;">
            Awaiting Pickup
          </span>
        </div>
      </div>

      <div style="margin-top:10px;padding:8px;background:white;border-radius:8px;font-size:11px;">
        ${s.items.map((i) => `<div>• ${i.name} (<strong>${i.quantity} ${i.category}</strong>)</div>`).join('')}
      </div>

      <div style="display:flex;gap:8px;margin-top:12px;">
        <button onclick="markSalePickedUp(${s.id})" class="btn-primary btn-emerald flex-1 btn-sm">
          ✅ Mark Picked Up
        </button>
        ${
          s.phone_number
            ? `<button onclick="window.open('tel:${s.phone_number}')" class="btn-primary flex-1 btn-sm">📞 Call</button>`
            : ''
        }
      </div>
    </div>
  `
    )
    .join('');
}

function markSalePickedUp(saleId) {
  if (confirm('Mark this order as picked up by the customer?')) {
    const data = DB.load();
    const s = data.sales.find((x) => x.id === saleId);
    if (s) {
      s.storage_status = 'picked_up';
      DB.save(data);
      renderStoredList();
      showToast('Items marked as picked up!');
    }
  }
}

// ===== OWNER DASHBOARD & DRAWER RECONCILIATION =====
function setDashboardPeriod(period) {
  activePeriod = period;
  document.querySelectorAll('.period-btn').forEach((b) => b.classList.remove('active'));
  document.getElementById('period-' + period).classList.add('active');
  renderDashboard();
}

function renderDashboard() {
  const data = DB.load();
  const todayStr = today();

  let filteredSales = data.sales;
  let filteredExpenses = data.expenses;
  let filteredRepayments = data.debtPayments;

  if (activePeriod === 'today') {
    filteredSales = data.sales.filter((s) => s.receipt_date.startsWith(todayStr));
    filteredExpenses = data.expenses.filter((e) => e.expense_date.startsWith(todayStr));
    filteredRepayments = data.debtPayments.filter((p) => p.created_at.startsWith(todayStr));
  } else if (activePeriod === 'week') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const minDate = weekAgo.toISOString().split('T')[0];
    filteredSales = data.sales.filter((s) => s.receipt_date >= minDate);
    filteredExpenses = data.expenses.filter((e) => e.expense_date >= minDate);
    filteredRepayments = data.debtPayments.filter((p) => p.created_at >= minDate);
  } else if (activePeriod === 'month') {
    const monthPrefix = todayStr.substring(0, 7);
    filteredSales = data.sales.filter((s) => s.receipt_date.startsWith(monthPrefix));
    filteredExpenses = data.expenses.filter((e) => e.expense_date.startsWith(monthPrefix));
    filteredRepayments = data.debtPayments.filter((p) => p.created_at.startsWith(monthPrefix));
  }

  // Totals
  const totalRevenue = filteredSales.reduce((s, x) => s + x.total_amount, 0);
  const totalOrders = filteredSales.length;

  let cashSales = 0;
  let momoSales = 0;
  let creditSales = 0;

  filteredSales.forEach((s) => {
    if (s.payment_method === 'Cash') cashSales += s.amount_paid;
    else if (s.payment_method === 'MTN MoMo' || s.payment_method === 'Telecel Cash') momoSales += s.amount_paid;
    if (s.balance_due > 0) creditSales += s.balance_due;
  });

  const cashRepayments = filteredRepayments
    .filter((p) => p.payment_method === 'Cash')
    .reduce((s, p) => s + p.amount, 0);

  const cashExpenses = filteredExpenses
    .filter((e) => e.payment_method === 'Cash')
    .reduce((s, e) => s + e.amount, 0);

  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  // Physical Net Cash in Drawer
  const netCashInDrawer = cashSales + cashRepayments - cashExpenses;

  // Gross profit
  let totalCogs = 0;
  filteredSales.forEach((s) => {
    s.items.forEach((item) => {
      totalCogs += (item.cost_price || 0) * item.quantity;
    });
  });
  const grossProfit = totalRevenue - totalCogs;
  const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  document.getElementById('dash-revenue').innerText = formatMoney(totalRevenue);
  document.getElementById('dash-orders').innerText = totalOrders;
  document.getElementById('dash-drawer-cash').innerText = formatMoney(netCashInDrawer);
  document.getElementById('dash-cash-sales').innerText = formatMoney(cashSales);
  document.getElementById('dash-cash-expenses').innerText = '-' + formatMoney(cashExpenses);

  document.getElementById('dash-momo').innerText = formatMoney(momoSales);
  document.getElementById('dash-credit').innerText = formatMoney(creditSales);
  document.getElementById('dash-expenses-total').innerText = formatMoney(totalExpenses);

  // Profit section
  const profitBox = document.getElementById('profit-reveal-box');
  if (showProfit) {
    profitBox.innerHTML = `
      <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:12px;margin-top:8px;">
        <div style="display:flex;justify-content:space-between;color:#065f46;font-size:12px;font-weight:bold;">
          <span>Gross Profit:</span>
          <span style="font-size:16px;font-weight:900;">${formatMoney(grossProfit)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:#047857;font-size:11px;margin-top:4px;">
          <span>Profit Margin:</span>
          <strong>${marginPercent.toFixed(1)}%</strong>
        </div>
      </div>
    `;
  } else {
    profitBox.innerHTML = `
      <div style="font-size:11px;color:#9ca3af;font-style:italic;margin-top:6px;">
        🔒 Profit metrics hidden. Tap 'Reveal Profit' to enter your 4-digit PIN.
      </div>
    `;
  }

  // Top selling products
  const productMap = new Map();
  filteredSales.forEach((s) => {
    s.items.forEach((i) => {
      const curr = productMap.get(i.name) || { qty: 0, revenue: 0 };
      curr.qty += i.quantity;
      curr.revenue += i.total_price;
      productMap.set(i.name, curr);
    });
  });

  const sortedProducts = Array.from(productMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5);

  const topEl = document.getElementById('dash-top-products');
  if (sortedProducts.length === 0) {
    topEl.innerHTML = '<div style="font-size:11px;color:#9ca3af;padding:10px 0;">No sales recorded in this period.</div>';
  } else {
    topEl.innerHTML = sortedProducts
      .map(
        ([name, d], idx) => `
      <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:12px;">
        <div><strong>${idx + 1}. ${name}</strong><br><small style="color:#6b7280;">${d.qty} units sold</small></div>
        <strong style="color:#021235;">${formatMoney(d.revenue)}</strong>
      </div>
    `
      )
      .join('');
  }
}

function toggleProfitReveal() {
  if (showProfit) {
    showProfit = false;
    renderDashboard();
    return;
  }
  const pin = prompt('Enter 4-Digit Manager Security PIN (Default: 1234):');
  const data = DB.load();
  if (pin === data.settings.adminPin) {
    showProfit = true;
    renderDashboard();
  } else {
    alert('Incorrect PIN');
  }
}

function openAddExpenseModal() {
  document.getElementById('expense-title').value = '';
  document.getElementById('expense-amount').value = '';
  document.getElementById('expense-modal').style.display = 'flex';
}

function saveExpense() {
  const title = document.getElementById('expense-title').value.trim();
  const amt = parseFloat(document.getElementById('expense-amount').value) || 0;
  const category = document.getElementById('expense-category').value;
  if (!title) return alert('Expense description is required.');
  if (amt <= 0) return alert('Valid expense amount is required.');

  const data = DB.load();
  data.expenses.push({
    id: uuid(),
    title,
    amount: amt,
    category,
    payment_method: 'Cash',
    expense_date: today()
  });

  DB.save(data);
  document.getElementById('expense-modal').style.display = 'none';
  renderDashboard();
  showToast('Recorded expense of ' + formatMoney(amt));
}

function sendShiftCloseoutWhatsApp() {
  const data = DB.load();
  const todayStr = today();
  const sales = data.sales.filter((s) => s.receipt_date.startsWith(todayStr));
  const expenses = data.expenses.filter((e) => e.expense_date.startsWith(todayStr));
  const repayments = data.debtPayments.filter((p) => p.created_at.startsWith(todayStr));

  const totalRev = sales.reduce((s, x) => s + x.total_amount, 0);
  let cashSales = 0;
  let momoSales = 0;
  sales.forEach((s) => {
    if (s.payment_method === 'Cash') cashSales += s.amount_paid;
    else if (s.payment_method === 'MTN MoMo' || s.payment_method === 'Telecel Cash') momoSales += s.amount_paid;
  });

  const cashRepay = repayments
    .filter((p) => p.payment_method === 'Cash')
    .reduce((s, p) => s + p.amount, 0);
  const cashExp = expenses
    .filter((e) => e.payment_method === 'Cash')
    .reduce((s, e) => s + e.amount, 0);
  const netDrawer = cashSales + cashRepay - cashExp;

  const outstandingDebt = data.sales.reduce((s, x) => s + x.balance_due, 0);

  let msg = `👑 *KING GEORGE ENTERPRISE - DAILY CLOSEOUT*\n`;
  msg += `📍 Juaben Adumasa, Ashanti\n`;
  msg += `📅 Date: ${formatDate(todayStr)}\n`;
  msg += `─────────────────────────\n`;
  msg += `💰 *TOTAL REVENUE:* *${formatMoney(totalRev)}*\n`;
  msg += `🧾 *Orders Count:* ${sales.length} transactions\n\n`;
  msg += `💵 *DRAWER RECONCILIATION:*\n`;
  msg += `• Cash Sales: *${formatMoney(cashSales)}*\n`;
  msg += `• Debt Cash Collected: *+${formatMoney(cashRepay)}*\n`;
  msg += `• Petty Cash / Expenses Out: *- ${formatMoney(cashExp)}*\n`;
  msg += `👉 *NET PHYSICAL CASH IN DRAWER:* *${formatMoney(netDrawer)}*\n\n`;
  msg += `📱 *DIGITAL PAYMENTS:*\n`;
  msg += `• MTN / Telecel MoMo: *${formatMoney(momoSales)}*\n\n`;
  msg += `⚠️ *OUTSTANDING DEBT:* *${formatMoney(outstandingDebt)}*\n`;
  msg += `─────────────────────────\n`;
  msg += `Generated from King George POS App.`;

  const phone = data.settings.shopPhone || '0548809611';
  let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = '233' + cleanPhone.substring(1);

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
}

function exportCsvBackup() {
  const data = DB.load();
  let csv = 'Receipt ID,Date,Customer,Phone,Method,Total,Paid,Balance,Status,Items\n';
  data.sales.forEach((s) => {
    const items = s.items.map((i) => `${i.name} (${i.quantity} ${i.category})`).join(' | ');
    csv += `"${s.id}","${s.receipt_date}","${s.customer_name}","${s.phone_number || ''}","${s.payment_method}","${s.total_amount}","${s.amount_paid}","${s.balance_due}","${s.storage_status}","${items}"\n`;
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `king_george_sales_${today()}.csv`;
  a.click();
}

// ===== SETTINGS LOGIC =====
function openSettingsModal() {
  const data = DB.load();
  document.getElementById('settings-momo-num').value = data.settings.momoNumber || '';
  document.getElementById('settings-momo-name').value = data.settings.momoName || '';
  document.getElementById('settings-phone').value = data.settings.shopPhone || '';
  document.getElementById('settings-location').value = data.settings.shopLocation || '';
  document.getElementById('settings-modal').style.display = 'flex';
}

function saveSettings() {
  const data = DB.load();
  data.settings.momoNumber = document.getElementById('settings-momo-num').value.trim();
  data.settings.momoName = document.getElementById('settings-momo-name').value.trim();
  data.settings.shopPhone = document.getElementById('settings-phone').value.trim();
  data.settings.shopLocation = document.getElementById('settings-location').value.trim();

  const currentPin = document.getElementById('settings-curr-pin').value.trim();
  const newPin = document.getElementById('settings-new-pin').value.trim();

  if (newPin) {
    if (currentPin !== data.settings.adminPin) {
      return alert('Current PIN is incorrect.');
    }
    if (newPin.length < 4) {
      return alert('New PIN must be at least 4 digits.');
    }
    data.settings.adminPin = newPin;
  }

  DB.save(data);
  document.getElementById('settings-modal').style.display = 'none';
  showToast('Settings saved successfully!');
}
