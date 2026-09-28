import { db } from './db';

export function getSetting(key: string, defaultValue: string = ''): string {
  try {
    const row = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

export function setSetting(key: string, value: string): void {
  db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
}

export function verifyAdminPin(pin: string): boolean {
  const currentPin = getSetting('admin_pin', '1234');
  return pin === currentPin;
}

export function updateAdminPin(oldPin: string, newPin: string): { success: boolean; message: string } {
  if (!verifyAdminPin(oldPin)) {
    return { success: false, message: 'Current PIN is incorrect.' };
  }
  if (!newPin || newPin.length < 4) {
    return { success: false, message: 'New PIN must be at least 4 digits.' };
  }
  setSetting('admin_pin', newPin);
  return { success: true, message: 'Admin PIN updated successfully.' };
}

export function getShopPaymentInfo(): { momoNumber: string; momoName: string; shopPhone: string } {
  return {
    momoNumber: getSetting('momo_number', '0548809611'),
    momoName: getSetting('momo_name', 'GEORGE GYAMFI'),
    shopPhone: getSetting('shop_phone', '0548809611'),
  };
}

export function updateShopPaymentInfo(momoNumber: string, momoName: string, shopPhone: string): void {
  setSetting('momo_number', momoNumber);
  setSetting('momo_name', momoName);
  setSetting('shop_phone', shopPhone);
}
