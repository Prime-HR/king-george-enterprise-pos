import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Sale, SaleItem } from '../database/types';
import { formatCurrency, formatDate } from '../utils/formatting';
import { generateReceiptHTML } from '../utils/receipt-html';
import { sendViaWhatsApp, sendViaSMS } from '../utils/sharing';

interface ReceiptViewProps {
  sale: Sale;
  items: SaleItem[];
}

export default function ReceiptView({ sale, items }: ReceiptViewProps) {
  const handlePrint = async () => {
    try {
      const html = generateReceiptHTML(sale, items);
      await Print.printAsync({ html });
    } catch (error) {
      Alert.alert('Error', 'Failed to print receipt.');
    }
  };

  const handleSharePDF = async () => {
    try {
      const html = generateReceiptHTML(sale, items);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Receipt',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share receipt.');
    }
  };

  const handleWhatsApp = async () => {
    if (!sale.phone_number) {
      Alert.alert(
        'No Phone Number',
        'This customer has no phone number. Would you like to share via the general share menu instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share PDF', onPress: handleSharePDF },
        ]
      );
      return;
    }
    await sendViaWhatsApp(sale.phone_number, sale, items);
  };

  const handleSMS = async () => {
    if (!sale.phone_number) {
      Alert.alert('No Phone Number', 'This customer has no phone number on file.');
      return;
    }
    await sendViaSMS(sale.phone_number, sale, items);
  };

  return (
    <View className="bg-white rounded-2xl mx-4 my-3 overflow-hidden shadow-sm">
      {/* Receipt Header */}
      <View className="bg-[#021235] px-4 py-4 items-center">
        <View className="flex-row items-center mb-1">
          <MaterialCommunityIcons name="crown" size={18} color="#f59e0b" />
          <Text className="text-white text-base font-black tracking-wide ml-1.5">KING GEORGE</Text>
        </View>
        <Text className="text-amber-400 text-xs font-bold">ENTERPRISE & GENERAL GOODS</Text>
        <Text className="text-blue-200 text-[10px] mt-1">Juaben Adumasa • 0548809611</Text>
      </View>

      {/* Customer Info */}
      <View className="px-4 py-3 border-b border-dashed border-gray-300">
        <View className="flex-row justify-between mb-1">
          <Text className="text-gray-500 text-xs">Receipt #{String(sale.id).padStart(6, '0')}</Text>
          <Text className="text-gray-500 text-xs">{formatDate(sale.receipt_date)}</Text>
        </View>
        <Text className="text-gray-700 text-sm">Customer: <Text className="font-semibold">{sale.customer_name || 'Walk-in'}</Text></Text>
        {sale.phone_number ? (
          <Text className="text-gray-500 text-xs mt-0.5">Phone: {sale.phone_number}</Text>
        ) : null}
      </View>

      {/* Items Table Header */}
      <View className="flex-row px-4 py-2 bg-gray-50 border-b border-gray-200">
        <Text className="text-gray-500 text-[10px] font-bold w-6">#</Text>
        <Text className="text-gray-500 text-[10px] font-bold flex-1">ITEM</Text>
        <Text className="text-gray-500 text-[10px] font-bold w-10 text-center">QTY</Text>
        <Text className="text-gray-500 text-[10px] font-bold w-16 text-right">PRICE</Text>
        <Text className="text-gray-500 text-[10px] font-bold w-20 text-right">TOTAL</Text>
      </View>

      {/* Items */}
      {items.map((item, index) => (
        <View key={item.id || index} className="flex-row px-4 py-2 border-b border-gray-100">
          <Text className="text-gray-400 text-xs w-6">{index + 1}</Text>
          <View className="flex-1">
            <Text className="text-gray-900 text-xs font-medium">{item.item_name}</Text>
            <Text className="text-gray-400 text-[10px]">{item.category}</Text>
          </View>
          <Text className="text-gray-700 text-xs w-10 text-center">{item.quantity}</Text>
          <Text className="text-gray-700 text-xs w-16 text-right">{formatCurrency(item.unit_price)}</Text>
          <Text className="text-gray-900 text-xs font-semibold w-20 text-right">{formatCurrency(item.total_price)}</Text>
        </View>
      ))}

      {/* Totals */}
      <View className="px-4 py-3 border-t border-dashed border-gray-300">
        <View className="flex-row justify-between mb-1">
          <Text className="text-gray-900 text-base font-extrabold">TOTAL</Text>
          <Text className="text-gray-900 text-base font-extrabold">{formatCurrency(sale.total_amount)}</Text>
        </View>
        <View className="flex-row justify-between mb-0.5">
          <Text className="text-gray-500 text-xs">Payment Method</Text>
          <Text className="text-gray-800 text-xs font-bold">{sale.payment_method || 'Cash'}</Text>
        </View>
        {sale.momo_ref ? (
          <View className="flex-row justify-between mb-0.5">
            <Text className="text-amber-700 text-xs font-semibold">MoMo Ref ID</Text>
            <Text className="text-amber-900 text-xs font-bold">{sale.momo_ref}</Text>
          </View>
        ) : null}
        <View className="flex-row justify-between mb-0.5">
          <Text className="text-gray-500 text-xs">Amount Paid</Text>
          <Text className="text-green-600 text-xs font-semibold">{formatCurrency(sale.amount_paid)}</Text>
        </View>
        {sale.balance_due > 0 && (
          <View className="flex-row justify-between mt-0.5">
            <Text className="text-red-500 text-xs font-semibold">Balance Due</Text>
            <Text className="text-red-500 text-xs font-bold">{formatCurrency(sale.balance_due)}</Text>
          </View>
        )}
      </View>

      {/* Signature Line */}
      <View className="px-4 py-3 items-center border-t border-gray-100">
        <View className="w-48 border-t border-gray-300 pt-1 mt-4">
          <Text className="text-gray-400 text-[10px] text-center">King George Signature</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="flex-row px-4 pt-2">
        <TouchableOpacity
          onPress={handlePrint}
          className="flex-1 bg-[#021235] py-3 rounded-xl items-center flex-row justify-center mr-1.5"
        >
          <Ionicons name="print" size={18} color="white" />
          <Text className="text-white font-bold text-sm ml-2">Print</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSharePDF}
          className="flex-1 bg-gray-600 py-3 rounded-xl items-center flex-row justify-center ml-1.5"
        >
          <Ionicons name="document" size={18} color="white" />
          <Text className="text-white font-bold text-sm ml-2">Share PDF</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row px-4 pb-4 pt-2">
        <TouchableOpacity
          onPress={handleWhatsApp}
          className="flex-1 bg-green-600 py-3 rounded-xl items-center flex-row justify-center mr-1.5"
        >
          <MaterialCommunityIcons name="whatsapp" size={20} color="white" />
          <Text className="text-white font-bold text-sm ml-2">WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSMS}
          className="flex-1 bg-sky-500 py-3 rounded-xl items-center flex-row justify-center ml-1.5"
        >
          <Ionicons name="chatbubble" size={18} color="white" />
          <Text className="text-white font-bold text-sm ml-2">SMS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
