import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Header from '../src/components/Header';
import DashboardCard from '../src/components/DashboardCard';
import PinModal from '../src/components/PinModal';
import {
  getPeriodSummary,
  getPeriodTopSellingItems,
  getRecentSales,
  exportSalesCSV,
} from '../src/database/sales';
import { getTotalOutstandingDebt, getDebtors } from '../src/database/debtors';
import {
  getShopDetails,
  updateShopDetails,
  updateAdminPin,
} from '../src/database/settings';
import {
  addExpense,
  getPeriodExpenses,
  deleteExpense,
} from '../src/database/expenses';
import {
  DailySummary,
  TopSellingItem,
  Sale,
  Expense,
  ExpenseCategory,
  EXPENSE_CATEGORIES,
} from '../src/database/types';
import { formatCurrency, formatDateTime, getTodayString } from '../src/utils/formatting';

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

export default function DashboardScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [summary, setSummary] = useState<DailySummary>({
    total_sales: 0,
    total_transactions: 0,
    total_items_sold: 0,
    total_cash: 0,
    total_momo: 0,
    total_other: 0,
    total_credit_issued: 0,
    total_expenses: 0,
    net_cash_drawer: 0,
    total_cogs: 0,
    gross_profit: 0,
    margin_percent: 0,
  });
  const [topItems, setTopItems] = useState<TopSellingItem[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [outstandingDebt, setOutstandingDebt] = useState(0);
  const [debtorsCount, setDebtorsCount] = useState(0);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);

  // Security / PIN state for profit metrics
  const [showProfit, setShowProfit] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);

  // Expense modal state
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Other');
  const [expenseNotes, setExpenseNotes] = useState('');

  // Settings modal state
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [shopDetails, setShopDetails] = useState(getShopDetails());
  const [editMomoNumber, setEditMomoNumber] = useState('');
  const [editMomoName, setEditMomoName] = useState('');
  const [editShopPhone, setEditShopPhone] = useState('');
  const [editShopLocation, setEditShopLocation] = useState('');
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');

  const loadData = useCallback(() => {
    setSummary(getPeriodSummary(period));
    setTopItems(getPeriodTopSellingItems(period, 5));
    setRecentSales(getRecentSales(15));
    setOutstandingDebt(getTotalOutstandingDebt());
    setDebtorsCount(getDebtors().length);
    const expData = getPeriodExpenses(period);
    setExpensesList(expData.expenses);

    const details = getShopDetails();
    setShopDetails(details);
    setEditMomoNumber(details.momoNumber);
    setEditMomoName(details.momoName);
    setEditShopPhone(details.shopPhone);
    setEditShopLocation(details.shopLocation);
  }, [period]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleToggleProfit = () => {
    if (showProfit) {
      setShowProfit(false);
    } else {
      setPinModalVisible(true);
    }
  };

  const handleAddExpenseSubmit = () => {
    if (!expenseTitle.trim()) {
      Alert.alert('Required', 'Please enter a description for the expense.');
      return;
    }
    const amt = parseFloat(expenseAmount);
    if (!expenseAmount || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid expense amount in GH₵.');
      return;
    }

    addExpense({
      title: expenseTitle.trim(),
      amount: amt,
      category: expenseCategory,
      payment_method: 'Cash',
      notes: expenseNotes.trim() || null,
      expense_date: getTodayString(),
    });

    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseNotes('');
    setExpenseCategory('Other');
    setExpenseModalVisible(false);
    loadData();
    Alert.alert('Expense Recorded', `Recorded GH₵ ${amt.toFixed(2)} payout from cash drawer.`);
  };

  const handleDeleteExpenseItem = (id: number) => {
    Alert.alert('Delete Expense', 'Are you sure you want to remove this expense entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteExpense(id);
          loadData();
        },
      },
    ]);
  };

  const handleSaveSettings = () => {
    updateShopDetails({
      momoNumber: editMomoNumber.trim(),
      momoName: editMomoName.trim(),
      shopPhone: editShopPhone.trim(),
      shopLocation: editShopLocation.trim(),
    });

    if (newPinInput.trim()) {
      const pinResult = updateAdminPin(currentPinInput, newPinInput.trim());
      if (!pinResult.success) {
        Alert.alert('PIN Update Failed', pinResult.message);
        return;
      }
    }

    setCurrentPinInput('');
    setNewPinInput('');
    setSettingsModalVisible(false);
    loadData();
    Alert.alert('Settings Saved', 'Shop details and preferences have been updated.');
  };

  const handleExportData = async () => {
    try {
      const csvData = exportSalesCSV();
      const fileUri = `${FileSystem.documentDirectory}king_george_sales_export.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csvData, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Sales Backup (CSV)',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Exported', `Sales backup saved to: ${fileUri}`);
      }
    } catch (e) {
      Alert.alert('Export Failed', 'Could not export sales backup.');
    }
  };

  const handleSendShiftCloseout = () => {
    const divider = '─────────────────────────';
    const dateStr = new Date().toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let msg = `👑 *KING GEORGE ENTERPRISE - DAILY CLOSEOUT REPORT*\n`;
    msg += `📍 Juaben Adumasa, Ashanti\n`;
    msg += `📅 Date: ${dateStr}\n`;
    msg += `${divider}\n`;
    msg += `💰 *TOTAL REVENUE:* *${formatCurrency(summary.total_sales)}*\n`;
    msg += `🧾 *Sales Count:* ${summary.total_transactions} orders (${summary.total_items_sold} units)\n\n`;
    msg += `💵 *DRAWER RECONCILIATION:*\n`;
    msg += `• Cash Sales: *${formatCurrency(summary.total_cash || 0)}*\n`;
    msg += `• Petty Cash / Expenses Out: *- ${formatCurrency(summary.total_expenses || 0)}*\n`;
    msg += `👉 *NET CASH IN DRAWER:* *${formatCurrency(summary.net_cash_drawer || 0)}*\n\n`;
    msg += `📱 *DIGITAL & CREDIT BREAKDOWN:*\n`;
    msg += `• MTN & Telecel MoMo: *${formatCurrency(summary.total_momo || 0)}*\n`;
    msg += `• Bank Transfers: *${formatCurrency(summary.total_other || 0)}*\n`;
    msg += `• New Credit Issued: *${formatCurrency(summary.total_credit_issued || 0)}*\n\n`;
    msg += `⚠️ *TOTAL OUTSTANDING DEBT:* *${formatCurrency(outstandingDebt)}* (${debtorsCount} debtors)\n`;

    if (showProfit && summary.gross_profit) {
      msg += `${divider}\n`;
      msg += `📈 *ESTIMATED GROSS PROFIT:* *${formatCurrency(summary.gross_profit)}* (${summary.margin_percent?.toFixed(1)}% margin)\n`;
    }

    msg += `${divider}\n`;
    msg += `Generated from King George POS App.`;

    const url = `whatsapp://send?phone=${shopDetails.shopPhone}&text=${encodeURIComponent(msg)}`;
    const webUrl = `https://wa.me/${shopDetails.shopPhone}?text=${encodeURIComponent(msg)}`;

    Linking.canOpenURL(url)
      .then((canOpen) => {
        if (canOpen) Linking.openURL(url);
        else Linking.openURL(webUrl);
      })
      .catch(() => {
        Alert.alert('Share Report', msg);
      });
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today':
        return "Today's Performance";
      case 'week':
        return 'Last 7 Days Performance';
      case 'month':
        return 'This Month Performance';
      case 'all':
        return 'All-Time Performance';
    }
  };

  return (
    <View className="flex-1 bg-gray-100">
      <Header />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Top Header & Settings Icon */}
        <View className="mx-4 mt-4 flex-row justify-between items-center">
          <View>
            <Text className="text-gray-900 text-lg font-black tracking-tight">
              👑 Owner Dashboard
            </Text>
            <Text className="text-gray-500 text-xs">
              Live sales, drawer reconciliation & reporting
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSettingsModalVisible(true)}
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 items-center justify-center shadow-sm"
          >
            <Ionicons name="settings-outline" size={20} color="#021235" />
          </TouchableOpacity>
        </View>

        {/* Period Filter Tabs */}
        <View className="flex-row mx-4 mt-3 bg-white p-1 rounded-2xl shadow-sm border border-gray-100">
          {(
            [
              { key: 'today', label: 'Today' },
              { key: 'week', label: '7 Days' },
              { key: 'month', label: 'Month' },
              { key: 'all', label: 'All Time' },
            ] as const
          ).map((item) => (
            <TouchableOpacity
              key={item.key}
              onPress={() => setPeriod(item.key)}
              className={`flex-1 py-2 rounded-xl items-center ${
                period === item.key ? 'bg-[#021235]' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  period === item.key ? 'text-white' : 'text-gray-600'
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Section Label */}
        <View className="mx-4 mt-4 mb-2">
          <Text className="text-gray-500 text-xs font-bold uppercase tracking-wider">
            {getPeriodLabel()}
          </Text>
        </View>

        {/* Primary Summary Cards */}
        <View className="mx-2.5 flex-row mb-2.5">
          <DashboardCard
            title="Total Revenue"
            value={formatCurrency(summary.total_sales)}
            icon="cash"
            color="#059669"
            bgColor="#ecfdf5"
          />
          <DashboardCard
            title="Orders Placed"
            value={summary.total_transactions.toString()}
            icon="receipt"
            color="#0284c7"
            bgColor="#f0f9ff"
          />
        </View>

        {/* Net Cash In Drawer Highlight Card */}
        <View className="bg-[#021235] mx-4 rounded-2xl p-4 shadow-md mb-3 border border-amber-400/30">
          <View className="flex-row justify-between items-center mb-1">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-amber-400/20 items-center justify-center mr-2">
                <Ionicons name="wallet" size={18} color="#f59e0b" />
              </View>
              <Text className="text-white text-xs font-bold uppercase tracking-wide">
                Physical Cash in Drawer
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setExpenseModalVisible(true)}
              className="bg-amber-500 px-2.5 py-1 rounded-lg flex-row items-center active:bg-amber-600"
            >
              <Ionicons name="add-circle" size={14} color="#021235" />
              <Text className="text-[#021235] font-black text-xs ml-1">+ Expense</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-amber-400 text-2xl font-black mt-1">
            {formatCurrency(summary.net_cash_drawer || 0)}
          </Text>

          <View className="bg-white/10 rounded-xl p-2.5 mt-3 flex-row justify-between items-center">
            <View>
              <Text className="text-gray-300 text-[10px]">Cash Sales: {formatCurrency(summary.total_cash || 0)}</Text>
            </View>
            <View className="h-3 w-[1px] bg-white/20" />
            <View>
              <Text className="text-red-300 text-[10px]">Cash Out: - {formatCurrency(summary.total_expenses || 0)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Breakdown Cards */}
        <View className="bg-white mx-4 rounded-2xl p-4 shadow-sm mb-3 border border-gray-100">
          <Text className="text-gray-900 font-extrabold text-sm mb-3 flex-row items-center">
            <Ionicons name="pie-chart" size={16} color="#021235" /> Payment Breakdown
          </Text>

          <View className="space-y-2">
            <View className="flex-row justify-between items-center py-1.5 border-b border-gray-50">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-2" />
                <Text className="text-gray-700 text-xs font-semibold">Cash Sales</Text>
              </View>
              <Text className="text-gray-900 text-xs font-bold">
                {formatCurrency(summary.total_cash || 0)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center py-1.5 border-b border-gray-50">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-2" />
                <Text className="text-gray-700 text-xs font-semibold">MTN & Telecel MoMo</Text>
              </View>
              <Text className="text-gray-900 text-xs font-bold">
                {formatCurrency(summary.total_momo || 0)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center py-1.5 border-b border-gray-50">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-2" />
                <Text className="text-gray-700 text-xs font-semibold">Bank Transfers</Text>
              </View>
              <Text className="text-gray-900 text-xs font-bold">
                {formatCurrency(summary.total_other || 0)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center py-1.5 border-b border-gray-50">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-red-400 mr-2" />
                <Text className="text-gray-700 text-xs font-semibold">New Credit (Debtors)</Text>
              </View>
              <Text className="text-red-600 text-xs font-bold">
                {formatCurrency(summary.total_credit_issued || 0)}
              </Text>
            </View>

            <View className="flex-row justify-between items-center py-1.5">
              <View className="flex-row items-center">
                <View className="w-2.5 h-2.5 rounded-full bg-purple-500 mr-2" />
                <Text className="text-gray-700 text-xs font-semibold">Shop Expenses / Petty Cash</Text>
              </View>
              <Text className="text-purple-700 text-xs font-bold">
                {formatCurrency(summary.total_expenses || 0)}
              </Text>
            </View>
          </View>
        </View>

        {/* Outstanding Customer Debt Banner */}
        <TouchableOpacity
          onPress={() => router.push('/debtors')}
          activeOpacity={0.8}
          className="bg-amber-50 border border-amber-200 mx-4 rounded-2xl p-4 shadow-sm mb-3 flex-row items-center justify-between"
        >
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 rounded-xl bg-amber-100 items-center justify-center mr-3">
              <MaterialCommunityIcons name="account-cash" size={22} color="#d97706" />
            </View>
            <View className="flex-1">
              <Text className="text-amber-900 font-extrabold text-sm">
                Debtors & Credit Ledger
              </Text>
              <Text className="text-amber-700 text-xs mt-0.5">
                {debtorsCount} customer{debtorsCount === 1 ? '' : 's'} owe {formatCurrency(outstandingDebt)}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#d97706" />
        </TouchableOpacity>

        {/* Profit Margin & Net Gain (Secured by PIN) */}
        <View className="bg-white mx-4 rounded-2xl p-4 shadow-sm mb-3 border border-gray-100">
          <View className="flex-row justify-between items-center">
            <View className="flex-row items-center">
              <Ionicons
                name={showProfit ? 'eye' : 'eye-off'}
                size={18}
                color={showProfit ? '#059669' : '#6b7280'}
              />
              <Text className="text-gray-900 font-extrabold text-sm ml-2">
                Estimated Gross Profit
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleToggleProfit}
              className={`px-3 py-1 rounded-full ${
                showProfit ? 'bg-emerald-50' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  showProfit ? 'text-emerald-700' : 'text-gray-600'
                }`}
              >
                {showProfit ? 'Hide Profit' : 'Reveal Profit (PIN)'}
              </Text>
            </TouchableOpacity>
          </View>

          {showProfit ? (
            <View className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-emerald-900 text-xs font-semibold">Gross Profit:</Text>
                <Text className="text-emerald-900 text-lg font-black">
                  {formatCurrency(summary.gross_profit || 0)}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-emerald-700 text-xs">Estimated Margin:</Text>
                <Text className="text-emerald-700 text-xs font-bold">
                  {(summary.margin_percent || 0).toFixed(1)}%
                </Text>
              </View>
            </View>
          ) : (
            <Text className="text-gray-400 text-xs italic mt-2">
              🔒 Profit metrics are protected by your 4-digit manager PIN (Default: 1234).
            </Text>
          )}
        </View>

        {/* Top Selling Products */}
        <View className="bg-white mx-4 rounded-2xl p-4 shadow-sm mb-3 border border-gray-100">
          <Text className="text-gray-900 font-extrabold text-sm mb-3 flex-row items-center">
            <Ionicons name="trophy" size={16} color="#d97706" /> Top Selling Provisions
          </Text>

          {topItems.length === 0 ? (
            <Text className="text-gray-400 text-xs py-3 text-center">
              No sales recorded for this period yet.
            </Text>
          ) : (
            topItems.map((item, idx) => (
              <View
                key={item.item_name}
                className="flex-row justify-between items-center py-2 border-b border-gray-50"
              >
                <View className="flex-row items-center flex-1 mr-2">
                  <Text className="text-gray-400 font-black text-xs w-5">{idx + 1}.</Text>
                  <View className="flex-1">
                    <Text className="text-gray-900 text-xs font-bold" numberOfLines={1}>
                      {item.item_name}
                    </Text>
                    <Text className="text-gray-500 text-[10px]">
                      {item.total_quantity} sold
                    </Text>
                  </View>
                </View>
                <Text className="text-[#021235] text-xs font-black">
                  {formatCurrency(item.total_revenue)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Quick Actions (Z-Report & Export) */}
        <View className="mx-4 mb-3 space-y-2">
          <TouchableOpacity
            onPress={handleSendShiftCloseout}
            activeOpacity={0.8}
            className="bg-emerald-600 py-3.5 px-4 rounded-2xl flex-row items-center justify-center shadow-md mb-2"
          >
            <MaterialCommunityIcons name="whatsapp" size={20} color="white" />
            <Text className="text-white font-bold text-sm ml-2">
              Send Daily WhatsApp Z-Report
            </Text>
          </TouchableOpacity>

          <View className="flex-row">
            <TouchableOpacity
              onPress={handleExportData}
              activeOpacity={0.8}
              className="flex-1 bg-white border border-gray-200 py-3 rounded-2xl flex-row items-center justify-center shadow-sm mr-1.5"
            >
              <Ionicons name="download-outline" size={18} color="#021235" />
              <Text className="text-[#021235] font-bold text-xs ml-1.5">
                Export CSV Backup
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setExpenseModalVisible(true)}
              activeOpacity={0.8}
              className="flex-1 bg-white border border-gray-200 py-3 rounded-2xl flex-row items-center justify-center shadow-sm ml-1.5"
            >
              <Ionicons name="receipt-outline" size={18} color="#d97706" />
              <Text className="text-[#021235] font-bold text-xs ml-1.5">
                Record Expense
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="bg-white mx-4 rounded-2xl p-4 shadow-sm mb-12 border border-gray-100">
          <Text className="text-gray-900 font-extrabold text-sm mb-3">
            Recent Sales Transactions
          </Text>

          {recentSales.length === 0 ? (
            <Text className="text-gray-400 text-xs py-3 text-center">
              No recent transactions.
            </Text>
          ) : (
            recentSales.map((sale) => (
              <TouchableOpacity
                key={sale.id}
                onPress={() => router.push(`/receipt/${sale.id}`)}
                className="flex-row justify-between items-center py-2.5 border-b border-gray-50 active:bg-gray-50"
              >
                <View className="flex-1 mr-2">
                  <Text className="text-gray-900 text-xs font-bold">
                    {sale.customer_name || 'Walk-in Customer'}
                  </Text>
                  <Text className="text-gray-400 text-[10px]">
                    Receipt #{String(sale.id).padStart(5, '0')} • {sale.payment_method || 'Cash'} • {formatDateTime(sale.created_at || '')}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-gray-900 text-xs font-black">
                    {formatCurrency(sale.total_amount)}
                  </Text>
                  {sale.balance_due > 0 ? (
                    <Text className="text-red-500 text-[10px] font-bold">
                      Owes {formatCurrency(sale.balance_due)}
                    </Text>
                  ) : (
                    <Text className="text-emerald-600 text-[10px] font-bold">Paid</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* PIN Verification Modal */}
      <PinModal
        visible={pinModalVisible}
        title="Owner Security PIN"
        subtitle="Enter 4-digit PIN to reveal profit & cost margins (Default: 1234)"
        onSuccess={() => {
          setPinModalVisible(false);
          setShowProfit(true);
        }}
        onClose={() => setPinModalVisible(false)}
      />

      {/* Record Expense Modal */}
      <Modal
        visible={expenseModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setExpenseModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <Ionicons name="wallet-outline" size={20} color="#d97706" />
                <Text className="text-gray-900 font-extrabold text-base ml-2">
                  Record Cash Payout / Expense
                </Text>
              </View>
              <TouchableOpacity onPress={() => setExpenseModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-gray-600 text-xs font-semibold mb-1">Expense Title:</Text>
              <TextInput
                value={expenseTitle}
                onChangeText={setExpenseTitle}
                placeholder="e.g. ECG Power Prepaid, Store Lunch, Fuel"
                placeholderTextColor="#9ca3af"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-sm mb-3"
              />

              <Text className="text-gray-600 text-xs font-semibold mb-1">Amount (GH₵):</Text>
              <TextInput
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-sm font-bold mb-3"
              />

              <Text className="text-gray-600 text-xs font-semibold mb-1.5">Category:</Text>
              <View className="flex-row flex-wrap mb-3">
                {EXPENSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setExpenseCategory(cat)}
                    className={`px-3 py-1.5 rounded-full mr-2 mb-2 border ${
                      expenseCategory === cat
                        ? 'bg-[#021235] border-[#021235]'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        expenseCategory === cat ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text className="text-gray-600 text-xs font-semibold mb-1">Notes (Optional):</Text>
              <TextInput
                value={expenseNotes}
                onChangeText={setExpenseNotes}
                placeholder="Additional notes"
                placeholderTextColor="#9ca3af"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-gray-900 text-sm mb-4"
              />

              <TouchableOpacity
                onPress={handleAddExpenseSubmit}
                className="bg-emerald-600 py-3.5 rounded-2xl items-center mb-4 active:bg-emerald-700"
              >
                <Text className="text-white font-extrabold text-sm">Save Expense Payout</Text>
              </TouchableOpacity>

              {/* Today's Recorded Expenses List */}
              {expensesList.length > 0 && (
                <View className="mt-2 pt-3 border-t border-gray-200 mb-6">
                  <Text className="text-gray-900 font-extrabold text-xs mb-2">
                    Expenses for this Period ({expensesList.length}):
                  </Text>
                  {expensesList.map((exp) => (
                    <View
                      key={exp.id}
                      className="flex-row justify-between items-center py-2 border-b border-gray-100"
                    >
                      <View className="flex-1 mr-2">
                        <Text className="text-gray-800 text-xs font-bold">{exp.title}</Text>
                        <Text className="text-gray-400 text-[10px]">{exp.category} • {exp.expense_date}</Text>
                      </View>
                      <View className="flex-row items-center">
                        <Text className="text-red-600 font-black text-xs mr-2">
                          -{formatCurrency(exp.amount)}
                        </Text>
                        <TouchableOpacity onPress={() => handleDeleteExpenseItem(exp.id!)}>
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Store Settings & PIN Change Modal */}
      <Modal
        visible={settingsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl p-5 max-h-[85%]">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center">
                <Ionicons name="settings" size={20} color="#021235" />
                <Text className="text-gray-900 font-extrabold text-base ml-2">
                  Shop Profile & Security
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-gray-600 text-xs font-semibold mb-1">MTN / MoMo Number:</Text>
              <TextInput
                value={editMomoNumber}
                onChangeText={setEditMomoNumber}
                placeholder="0548809611"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-sm mb-3"
              />

              <Text className="text-gray-600 text-xs font-semibold mb-1">MoMo Registered Name:</Text>
              <TextInput
                value={editMomoName}
                onChangeText={setEditMomoName}
                placeholder="GEORGE GYAMFI"
                placeholderTextColor="#9ca3af"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-sm mb-3"
              />

              <Text className="text-gray-600 text-xs font-semibold mb-1">Shop Contact Phone:</Text>
              <TextInput
                value={editShopPhone}
                onChangeText={setEditShopPhone}
                placeholder="0548809611"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-sm mb-3"
              />

              <Text className="text-gray-600 text-xs font-semibold mb-1">Store Location:</Text>
              <TextInput
                value={editShopLocation}
                onChangeText={setEditShopLocation}
                placeholder="Juaben Adumasa, Ashanti"
                placeholderTextColor="#9ca3af"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-sm mb-4"
              />

              <View className="bg-blue-50 border border-blue-100 rounded-2xl p-3.5 mb-4">
                <Text className="text-blue-950 font-bold text-xs mb-2">
                  🔐 Change 4-Digit Security PIN (Default: 1234)
                </Text>

                <TextInput
                  value={currentPinInput}
                  onChangeText={setCurrentPinInput}
                  placeholder="Current PIN (e.g. 1234)"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={6}
                  className="bg-white border border-blue-200 rounded-xl px-3 py-2 text-gray-900 text-xs mb-2"
                />

                <TextInput
                  value={newPinInput}
                  onChangeText={setNewPinInput}
                  placeholder="New PIN (min 4 digits)"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={6}
                  className="bg-white border border-blue-200 rounded-xl px-3 py-2 text-gray-900 text-xs"
                />
              </View>

              <TouchableOpacity
                onPress={handleSaveSettings}
                className="bg-[#021235] py-3.5 rounded-2xl items-center mb-6 active:bg-blue-950"
              >
                <Text className="text-white font-extrabold text-sm">Save All Settings</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
