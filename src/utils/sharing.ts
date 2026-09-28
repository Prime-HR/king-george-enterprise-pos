import { Linking, Alert, Platform } from 'react-native';
import { Sale, SaleItem } from '../database/types';
import { formatCurrency, formatDate } from './formatting';

export function generateReceiptText(sale: Sale, items: SaleItem[]): string {
  const divider = '━━━━━━━━━━━━━━━━━━━━━━━';
  const thinDivider = '─────────────────────────';
  
  let text = '';
  text += '👑 *KING GEORGE ENTERPRISE*\n';
  text += '📍 Juaben Adumasa, Ashanti Region\n';
  text += '📞 Tel/MoMo: 0548809611\n';
  text += divider + '\n';
  text += `📄 *Receipt #${String(sale.id).padStart(6, '0')}*\n`;
  text += `📅 Date: ${formatDate(sale.receipt_date)}\n`;
  text += `👤 Customer: ${sale.customer_name || 'Walk-in Customer'}\n`;
  if (sale.phone_number) {
    text += `📞 Phone: ${sale.phone_number}\n`;
  }
  text += thinDivider + '\n';
  text += '*ITEMS PURCHASED:*\n';
  
  items.forEach((item, index) => {
    text += `${index + 1}. ${item.item_name}\n`;
    text += `   ${item.quantity} ${item.category} × ${formatCurrency(item.unit_price)} = *${formatCurrency(item.total_price)}*\n`;
  });
  
  text += thinDivider + '\n';
  text += `💰 *TOTAL: ${formatCurrency(sale.total_amount)}*\n`;
  text += `💳 *Method:* ${sale.payment_method || 'Cash'}\n`;
  text += `✅ *Paid:* ${formatCurrency(sale.amount_paid)}\n`;
  
  if (sale.balance_due > 0) {
    text += `⚠️ *BALANCE DUE:* *${formatCurrency(sale.balance_due)}*\n`;
    text += `📱 MoMo: 0548809611 (GEORGE GYAMFI)\n`;
  }
  
  text += thinDivider + '\n';
  text += '🙏 Thank you for your business!\n';
  text += 'Honesty & Quality Service in Adumasa 🙏';
  
  return text;
}

export async function sendViaWhatsApp(phoneNumber: string, sale: Sale, items: SaleItem[]): Promise<void> {
  const text = generateReceiptText(sale, items);
  
  let cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '233' + cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('233')) {
    cleanPhone = '233' + cleanPhone;
  }
  cleanPhone = cleanPhone.replace('+', '');
  
  const encodedText = encodeURIComponent(text);
  const whatsappUrl = `whatsapp://send?phone=${cleanPhone}&text=${encodedText}`;
  const webWhatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
  
  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
    } else {
      await Linking.openURL(webWhatsappUrl);
    }
  } catch (error) {
    Alert.alert(
      'WhatsApp Not Found',
      'Please make sure WhatsApp is installed on your device.',
      [{ text: 'OK' }]
    );
  }
}

export async function sendViaSMS(phoneNumber: string, sale: Sale, items: SaleItem[]): Promise<void> {
  let text = 'KING GEORGE ENTERPRISE\n';
  text += `Juaben Adumasa - 0548809611\n`;
  text += `Receipt #${String(sale.id).padStart(6, '0')}\n`;
  text += `Date: ${formatDate(sale.receipt_date)}\n`;
  text += `Customer: ${sale.customer_name || 'Walk-in'}\n`;
  text += '---\n';
  
  items.forEach((item, index) => {
    text += `${index + 1}. ${item.item_name} - ${item.quantity} ${item.category} x ${formatCurrency(item.unit_price)} = ${formatCurrency(item.total_price)}\n`;
  });
  
  text += '---\n';
  text += `TOTAL: ${formatCurrency(sale.total_amount)}\n`;
  text += `Method: ${sale.payment_method || 'Cash'}\n`;
  text += `Paid: ${formatCurrency(sale.amount_paid)}\n`;
  if (sale.balance_due > 0) {
    text += `Balance: ${formatCurrency(sale.balance_due)}\n`;
  }
  text += 'Thank you!';
  
  let cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
  const encodedText = encodeURIComponent(text);
  const separator = Platform.OS === 'ios' ? '&' : '?';
  const smsUrl = `sms:${cleanPhone}${separator}body=${encodedText}`;
  
  try {
    await Linking.openURL(smsUrl);
  } catch (error) {
    Alert.alert('Error', 'Could not open SMS app.');
  }
}
