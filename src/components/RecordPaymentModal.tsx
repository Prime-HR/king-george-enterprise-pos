import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DebtorSummary, PaymentMethod, PAYMENT_METHODS } from '../database/types';
import { recordDebtPayment } from '../database/debtors';
import { formatCurrency, formatDate } from '../utils/formatting';

interface RecordPaymentModalProps {
  visible: boolean;
  debtor: DebtorSummary | null;
  onSuccess: () => void;
  onClose: () => void;
}

export default function RecordPaymentModal({
  visible,
  debtor,
  onSuccess,
  onClose,
}: RecordPaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (debtor) {
      setAmount('');
      setPaymentMethod('Cash');
      setNotes('');
    }
  }, [debtor]);

  if (!debtor) return null;

  const currentBalance = debtor.sale.balance_due;

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
  };

  const handleSavePayment = () => {
    const paidNum = parseFloat(amount);
    if (isNaN(paidNum) || paidNum <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount in GH₵.');
      return;
    }

    if (paidNum > currentBalance) {
      Alert.alert(
        'Excess Amount',
        `The amount entered (${formatCurrency(paidNum)}) is greater than the outstanding balance (${formatCurrency(currentBalance)}). Would you like to proceed and clear the debt?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Proceed',
            onPress: () => processPayment(paidNum),
          },
        ]
      );
      return;
    }

    processPayment(paidNum);
  };

  const processPayment = (payAmount: number) => {
    const res = recordDebtPayment(debtor.sale.id!, payAmount, paymentMethod, notes);
    if (res.success) {
      Alert.alert(
        'Payment Recorded! ✅',
        `Received ${formatCurrency(payAmount)} from ${debtor.sale.customer_name}.\nNew Balance: ${formatCurrency(res.newBalance)}`
      );
      onSuccess();
    } else {
      Alert.alert('Error', res.error || 'Failed to record payment.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 bg-black/50 justify-end"
      >
        <View className="bg-white rounded-t-3xl p-5 max-h-[90%] shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
            <View>
              <Text className="text-gray-900 text-lg font-extrabold">Record Debt Payment</Text>
              <Text className="text-gray-500 text-xs">
                Receipt #{String(debtor.sale.id).padStart(6, '0')} • {formatDate(debtor.sale.receipt_date)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-1 rounded-full bg-gray-100">
              <Ionicons name="close" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="mt-3">
            {/* Customer & Balance Overview */}
            <View className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
              <Text className="text-amber-900 font-bold text-sm">
                👤 {debtor.sale.customer_name || 'Walk-in Customer'}
              </Text>
              {debtor.sale.phone_number ? (
                <Text className="text-amber-700 text-xs mt-0.5">📞 {debtor.sale.phone_number}</Text>
              ) : null}

              <View className="flex-row justify-between mt-3 pt-3 border-t border-amber-200/60">
                <View>
                  <Text className="text-gray-500 text-[10px]">TOTAL BILL</Text>
                  <Text className="text-gray-800 text-xs font-bold">
                    {formatCurrency(debtor.sale.total_amount)}
                  </Text>
                </View>
                <View>
                  <Text className="text-gray-500 text-[10px]">ALREADY PAID</Text>
                  <Text className="text-green-600 text-xs font-bold">
                    {formatCurrency(debtor.sale.amount_paid)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-red-600 text-[10px] font-bold">BALANCE DUE</Text>
                  <Text className="text-red-600 text-base font-extrabold">
                    {formatCurrency(currentBalance)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Payment Amount Input */}
            <Text className="text-gray-700 text-xs font-bold mb-1">
              Payment Amount (GH₵) *
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              autoFocus
              className="bg-gray-50 border-2 border-green-500 rounded-xl px-4 py-3 text-gray-900 text-xl font-extrabold mb-2"
            />

            {/* Quick Amount Buttons */}
            <View className="flex-row space-x-2 mb-4">
              <TouchableOpacity
                onPress={() => handleQuickAmount(currentBalance)}
                className="flex-1 bg-green-50 border border-green-300 py-2 rounded-xl items-center mr-1"
              >
                <Text className="text-green-800 text-xs font-bold">Full Settlement</Text>
                <Text className="text-green-600 text-[10px]">{formatCurrency(currentBalance)}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleQuickAmount(Math.round(currentBalance / 2))}
                className="flex-1 bg-blue-50 border border-blue-300 py-2 rounded-xl items-center ml-1"
              >
                <Text className="text-blue-800 text-xs font-bold">50% Half</Text>
                <Text className="text-blue-600 text-[10px]">
                  {formatCurrency(Math.round(currentBalance / 2))}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Payment Method Selector */}
            <Text className="text-gray-700 text-xs font-bold mb-2">Payment Method *</Text>
            <View className="flex-row flex-wrap mb-4">
              {PAYMENT_METHODS.filter((m) => m !== 'Credit').map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    onPress={() => setPaymentMethod(method)}
                    className={`px-3 py-2 rounded-xl mr-2 mb-2 border ${
                      isSelected
                        ? 'bg-blue-900 border-blue-900'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {method === 'Cash' && '💵 '}
                      {method === 'MTN MoMo' && '🟡 '}
                      {method === 'Telecel Cash' && '🔴 '}
                      {method === 'Bank Transfer' && '🏦 '}
                      {method}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Optional Notes */}
            <Text className="text-gray-700 text-xs font-bold mb-1">Notes (Optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="e.g. Paid via MoMo from 0244123456"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-xs mb-5"
            />

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSavePayment}
              className="bg-green-600 py-4 rounded-2xl items-center flex-row justify-center shadow-lg mb-4"
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text className="text-white font-extrabold text-base ml-2">Confirm Payment</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
