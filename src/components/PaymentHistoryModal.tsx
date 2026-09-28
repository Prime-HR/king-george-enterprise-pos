import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DebtorSummary } from '../database/types';
import { formatCurrency, formatDateTime } from '../utils/formatting';

interface PaymentHistoryModalProps {
  visible: boolean;
  debtor: DebtorSummary | null;
  onClose: () => void;
}

export default function PaymentHistoryModal({
  visible,
  debtor,
  onClose,
}: PaymentHistoryModalProps) {
  if (!debtor) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 items-center justify-center p-4">
        <View className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <View>
              <Text className="text-gray-900 font-extrabold text-base">Payment History</Text>
              <Text className="text-gray-500 text-xs">
                {debtor.sale.customer_name} • Receipt #{String(debtor.sale.id).padStart(6, '0')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-gray-100">
              <Ionicons name="close" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          {/* Initial Purchase */}
          <View className="bg-gray-50 rounded-xl p-3 mb-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600 text-xs font-semibold">Initial Purchase</Text>
              <Text className="text-gray-900 text-xs font-bold">{formatCurrency(debtor.sale.total_amount)}</Text>
            </View>
            <View className="flex-row justify-between mt-1">
              <Text className="text-gray-400 text-[10px]">Initial Deposit ({debtor.sale.payment_method || 'Cash'})</Text>
              <Text className="text-green-600 text-xs font-bold">
                {formatCurrency(
                  debtor.sale.amount_paid - debtor.payments.reduce((s, p) => s + p.amount, 0)
                )}
              </Text>
            </View>
          </View>

          {/* Installments List */}
          <Text className="text-gray-700 text-xs font-bold mb-2">Installment Payments ({debtor.payments.length})</Text>
          <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
            {debtor.payments.length === 0 ? (
              <View className="py-6 items-center">
                <Text className="text-gray-400 text-xs">No installments recorded yet.</Text>
              </View>
            ) : (
              debtor.payments.map((p, idx) => (
                <View key={p.id || idx} className="p-2.5 rounded-xl border border-gray-100 mb-2 bg-white">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-green-700 font-extrabold text-sm">
                      +{formatCurrency(p.amount)}
                    </Text>
                    <View className="bg-blue-50 px-2 py-0.5 rounded-md">
                      <Text className="text-blue-900 text-[10px] font-bold">{p.payment_method}</Text>
                    </View>
                  </View>
                  <Text className="text-gray-400 text-[10px] mt-1">
                    {p.created_at ? formatDateTime(p.created_at) : ''}
                  </Text>
                  {p.notes ? (
                    <Text className="text-gray-600 text-[11px] mt-0.5 italic">📝 {p.notes}</Text>
                  ) : null}
                </View>
              ))
            )}
          </ScrollView>

          {/* Current Balance */}
          <View className="bg-red-50 p-3 rounded-xl mt-3 flex-row justify-between items-center">
            <Text className="text-red-800 text-xs font-bold">Current Balance Due</Text>
            <Text className="text-red-700 font-extrabold text-base">
              {formatCurrency(debtor.sale.balance_due)}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}
