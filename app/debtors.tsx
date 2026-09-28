import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../src/components/Header';
import RecordPaymentModal from '../src/components/RecordPaymentModal';
import PaymentHistoryModal from '../src/components/PaymentHistoryModal';
import {
  getDebtors,
  getTotalOutstandingDebt,
  getTodayDebtCollected,
  generateDebtReminderMessage,
} from '../src/database/debtors';
import { DebtorSummary } from '../src/database/types';
import { formatCurrency, formatDate } from '../src/utils/formatting';

export default function DebtorsScreen() {
  const [debtors, setDebtors] = useState<DebtorSummary[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [todayCollected, setTodayCollected] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'overdue' | 'high'>('all');

  // Modals
  const [selectedDebtor, setSelectedDebtor] = useState<DebtorSummary | null>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const loadData = useCallback(() => {
    const list = getDebtors();
    setDebtors(list);
    setTotalDebt(getTotalOutstandingDebt());
    setTodayCollected(getTodayDebtCollected());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredDebtors = useMemo(() => {
    return debtors.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const nameMatches = (item.sale.customer_name || '').toLowerCase().includes(q);
      const phoneMatches = (item.sale.phone_number || '').includes(q);
      const idMatches = String(item.sale.id || '').includes(q);

      const matchesSearch = !q || nameMatches || phoneMatches || idMatches;

      if (!matchesSearch) return false;

      if (filterType === 'overdue') {
        return item.days_overdue >= 7;
      }
      if (filterType === 'high') {
        return item.sale.balance_due >= 1000;
      }
      return true;
    });
  }, [debtors, searchQuery, filterType]);

  const handleOpenPayment = (debtor: DebtorSummary) => {
    setSelectedDebtor(debtor);
    setPaymentModalVisible(true);
  };

  const handleOpenHistory = (debtor: DebtorSummary) => {
    setSelectedDebtor(debtor);
    setHistoryModalVisible(true);
  };

  const handleWhatsAppReminder = (debtor: DebtorSummary) => {
    const phone = debtor.sale.phone_number;
    if (!phone) {
      Alert.alert(
        'No Phone Number',
        'This debtor has no phone number recorded. Please add their phone number to send WhatsApp reminders.'
      );
      return;
    }

    const message = generateDebtReminderMessage(debtor.sale);

    // Clean phone number for Ghana
    let cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '233' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('+') && !cleanPhone.startsWith('233')) {
      cleanPhone = '233' + cleanPhone;
    }
    cleanPhone = cleanPhone.replace('+', '');

    const url = `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
    const webUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url)
      .then((canOpen) => {
        if (canOpen) {
          Linking.openURL(url);
        } else {
          Linking.openURL(webUrl);
        }
      })
      .catch(() => {
        Alert.alert('Error', 'Could not open WhatsApp app.');
      });
  };

  const handleCallDebtor = (phone: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`);
  };

  const renderDebtorCard = ({ item }: { item: DebtorSummary }) => {
    const { sale, items, days_overdue } = item;
    const isOverdue = days_overdue >= 7;

    return (
      <View className="bg-white rounded-2xl mx-4 mb-3 p-4 shadow-sm border border-gray-100">
        {/* Header */}
        <View className="flex-row items-center justify-between pb-2 border-b border-gray-100">
          <View className="flex-1">
            <Text className="text-gray-900 font-extrabold text-sm">
              {sale.customer_name || 'Walk-in Customer'}
            </Text>
            <Text className="text-gray-400 text-xs">
              Receipt #{String(sale.id).padStart(6, '0')} • {formatDate(sale.receipt_date)}
            </Text>
          </View>
          <View
            className={`px-2.5 py-1 rounded-full ${
              isOverdue
                ? 'bg-red-100'
                : days_overdue > 3
                ? 'bg-amber-100'
                : 'bg-blue-100'
            }`}
          >
            <Text
              className={`text-[10px] font-bold ${
                isOverdue
                  ? 'text-red-700'
                  : days_overdue > 3
                  ? 'text-amber-800'
                  : 'text-blue-800'
              }`}
            >
              {days_overdue === 0 ? 'Today' : `${days_overdue}d overdue`}
            </Text>
          </View>
        </View>

        {/* Items Summary */}
        <View className="py-2 border-b border-dashed border-gray-100">
          <Text className="text-gray-500 text-xs numberOfLines={1}">
            🛒 {items.map((i) => `${i.quantity}x ${i.item_name}`).join(', ')}
          </Text>
        </View>

        {/* Financials Row */}
        <View className="flex-row justify-between items-center py-2.5">
          <View>
            <Text className="text-gray-400 text-[10px]">TOTAL BILL</Text>
            <Text className="text-gray-700 text-xs font-semibold">
              {formatCurrency(sale.total_amount)}
            </Text>
          </View>
          <View>
            <Text className="text-gray-400 text-[10px]">PAID SO FAR</Text>
            <Text className="text-green-600 text-xs font-semibold">
              {formatCurrency(sale.amount_paid)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-red-500 text-[10px] font-bold">BALANCE DUE</Text>
            <Text className="text-red-600 text-base font-extrabold">
              {formatCurrency(sale.balance_due)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="flex-row pt-2 border-t border-gray-100 items-center">
          <TouchableOpacity
            onPress={() => handleOpenPayment(item)}
            className="flex-1 bg-green-600 py-2.5 rounded-xl items-center flex-row justify-center mr-1.5"
          >
            <Ionicons name="cash" size={16} color="white" />
            <Text className="text-white font-bold text-xs ml-1">Pay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleWhatsAppReminder(item)}
            className="bg-emerald-500 py-2.5 px-3 rounded-xl items-center flex-row justify-center mr-1.5"
          >
            <MaterialCommunityIcons name="whatsapp" size={17} color="white" />
            <Text className="text-white font-bold text-xs ml-1">Reminder</Text>
          </TouchableOpacity>

          {sale.phone_number ? (
            <TouchableOpacity
              onPress={() => handleCallDebtor(sale.phone_number)}
              className="bg-blue-900 py-2.5 px-3 rounded-xl items-center flex-row justify-center mr-1.5"
            >
              <Ionicons name="call" size={15} color="white" />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={() => handleOpenHistory(item)}
            className="bg-gray-100 py-2.5 px-3 rounded-xl items-center justify-center"
          >
            <Ionicons name="time-outline" size={16} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-100">
      <Header />

      {/* Top Debt Metrics Card */}
      <View className="bg-red-900 mx-4 mt-3 rounded-2xl p-4 shadow-sm">
        <Text className="text-red-200 text-xs font-bold uppercase tracking-wider">
          Total Outstanding Debt ("Akwansan")
        </Text>
        <Text className="text-white text-2xl font-extrabold mt-1">
          {formatCurrency(totalDebt)}
        </Text>

        <View className="flex-row justify-between mt-3 pt-3 border-t border-red-800">
          <View>
            <Text className="text-red-300 text-[10px]">ACTIVE DEBTORS</Text>
            <Text className="text-white text-sm font-bold">{debtors.length} Customers</Text>
          </View>
          <View className="items-end">
            <Text className="text-red-300 text-[10px]">COLLECTED TODAY</Text>
            <Text className="text-emerald-400 text-sm font-bold">
              +{formatCurrency(todayCollected)}
            </Text>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View className="mx-4 mt-3 flex-row items-center bg-white px-3 py-2 rounded-xl border border-gray-200">
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search debtor name, phone, receipt #..."
          className="flex-1 ml-2 text-xs text-gray-900 py-1"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Chips */}
      <View className="flex-row mx-4 mt-2 mb-2">
        <TouchableOpacity
          onPress={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-full mr-2 ${
            filterType === 'all' ? 'bg-blue-900' : 'bg-white border border-gray-200'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              filterType === 'all' ? 'text-white' : 'text-gray-600'
            }`}
          >
            All Debtors ({debtors.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterType('overdue')}
          className={`px-3 py-1.5 rounded-full mr-2 ${
            filterType === 'overdue' ? 'bg-red-600' : 'bg-white border border-gray-200'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              filterType === 'overdue' ? 'text-white' : 'text-gray-600'
            }`}
          >
            Overdue 7+ Days
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilterType('high')}
          className={`px-3 py-1.5 rounded-full ${
            filterType === 'high' ? 'bg-amber-600' : 'bg-white border border-gray-200'
          }`}
        >
          <Text
            className={`text-xs font-semibold ${
              filterType === 'high' ? 'text-white' : 'text-gray-600'
            }`}
          >
            High Debt (&gt;GH₵ 1k)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Debtors List */}
      <FlatList
        data={filteredDebtors}
        keyExtractor={(item) => item.sale.id!.toString()}
        renderItem={renderDebtorCard}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-16">
            <MaterialCommunityIcons name="check-decagram" size={60} color="#10b981" />
            <Text className="text-gray-700 text-base font-bold mt-3">
              {searchQuery ? 'No matching debtors found' : 'No Outstanding Debt!'}
            </Text>
            <Text className="text-gray-400 text-xs mt-1 text-center px-10">
              {searchQuery
                ? 'Try a different search term.'
                : 'All customer accounts are settled and up to date.'}
            </Text>
          </View>
        }
      />

      {/* Modals */}
      <RecordPaymentModal
        visible={paymentModalVisible}
        debtor={selectedDebtor}
        onSuccess={() => {
          setPaymentModalVisible(false);
          loadData();
        }}
        onClose={() => setPaymentModalVisible(false)}
      />

      <PaymentHistoryModal
        visible={historyModalVisible}
        debtor={selectedDebtor}
        onClose={() => setHistoryModalVisible(false)}
      />
    </View>
  );
}
