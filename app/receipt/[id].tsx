import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import ReceiptView from '../../src/components/ReceiptView';
import {
  getSaleById,
  getSaleItems,
  deleteSale,
  updateSale,
} from '../../src/database/sales';
import { Sale, SaleItem } from '../../src/database/types';
import { formatCurrency } from '../../src/utils/formatting';

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);

  // Edit Sale Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editAmountPaid, setEditAmountPaid] = useState('');
  const [editStorageStatus, setEditStorageStatus] = useState<
    'delivered' | 'stored' | 'picked_up'
  >('delivered');
  const [editStorageNotes, setEditStorageNotes] = useState('');

  const loadData = () => {
    if (id) {
      const saleData = getSaleById(parseInt(id));
      if (saleData) {
        setSale(saleData);
        setItems(getSaleItems(saleData.id!));
        setEditCustomerName(saleData.customer_name || '');
        setEditPhoneNumber(saleData.phone_number || '');
        setEditAmountPaid(saleData.amount_paid.toString());
        setEditStorageStatus(saleData.storage_status || 'delivered');
        setEditStorageNotes(saleData.storage_notes || '');
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleOpenEdit = () => {
    if (!sale) return;
    setEditCustomerName(sale.customer_name || '');
    setEditPhoneNumber(sale.phone_number || '');
    setEditAmountPaid(sale.amount_paid.toString());
    setEditStorageStatus(sale.storage_status || 'delivered');
    setEditStorageNotes(sale.storage_notes || '');
    setEditModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!sale) return;
    const paid = parseFloat(editAmountPaid) || 0;
    const newBalance = Math.max(0, sale.total_amount - paid);

    try {
      updateSale(sale.id!, {
        customer_name: editCustomerName.trim() || 'Walk-in Customer',
        phone_number: editPhoneNumber.trim(),
        amount_paid: paid,
        balance_due: newBalance,
        storage_status: editStorageStatus,
        storage_notes: editStorageNotes.trim() || null,
      });
      setEditModalVisible(false);
      loadData();
      Alert.alert('Updated', 'Receipt details have been updated successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to update sale details.');
    }
  };

  const handleDeleteSale = () => {
    if (!sale) return;
    Alert.alert(
      'Void / Delete Sale',
      `Are you sure you want to void Receipt #${String(sale.id).padStart(
        6,
        '0'
      )}?\n\nThis will permanently delete this sale and automatically restore all items back to inventory stock.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void & Restore Stock',
          style: 'destructive',
          onPress: () => {
            try {
              deleteSale(sale.id!);
              Alert.alert('Voided', 'Sale was deleted and stock restored to inventory.');
              router.back();
            } catch (e) {
              Alert.alert('Error', 'Failed to void sale.');
            }
          },
        },
      ]
    );
  };

  if (!sale) {
    return (
      <View className="flex-1 bg-gray-100 items-center justify-center">
        <Text className="text-gray-400 text-base">Receipt not found</Text>
      </View>
    );
  }

  const calculatedBalance = Math.max(
    0,
    sale.total_amount - (parseFloat(editAmountPaid) || 0)
  );

  return (
    <View className="flex-1 bg-gray-100">
      {/* Top Header Bar */}
      <View className="bg-blue-900 px-4 pt-12 pb-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="mr-2 p-1">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View className="flex-1 ml-1">
          <Text className="text-white text-lg font-extrabold">Receipt</Text>
          <Text className="text-blue-300 text-xs">
            #{String(sale.id).padStart(6, '0')}
          </Text>
        </View>

        {/* Action icons: Edit & Delete */}
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={handleOpenEdit}
            className="bg-blue-800 p-2 rounded-xl mr-2"
          >
            <Ionicons name="create-outline" size={19} color="#f59e0b" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleDeleteSale}
            className="bg-red-900/40 p-2 rounded-xl"
          >
            <Ionicons name="trash-outline" size={19} color="#f87171" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ReceiptView sale={sale} items={items} />

        {/* Status Card & Quick Edit Notice */}
        <View className="mx-4 mb-8 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-gray-700 text-xs font-bold uppercase tracking-wider">
              Sale Status
            </Text>
            <TouchableOpacity
              onPress={handleOpenEdit}
              className="flex-row items-center bg-blue-50 px-2.5 py-1 rounded-lg"
            >
              <Ionicons name="pencil" size={13} color="#1e40af" />
              <Text className="text-blue-900 text-xs font-bold ml-1">
                Edit Payment / Customer
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between py-1 border-b border-gray-50">
            <Text className="text-gray-500 text-xs">Storage Status:</Text>
            <View className="flex-row items-center">
              <MaterialCommunityIcons
                name={
                  sale.storage_status === 'stored'
                    ? 'package-variant'
                    : 'check-circle'
                }
                size={14}
                color={sale.storage_status === 'stored' ? '#d97706' : '#059669'}
              />
              <Text
                className={`text-xs font-bold ml-1 ${
                  sale.storage_status === 'stored'
                    ? 'text-amber-700'
                    : 'text-emerald-700'
                }`}
              >
                {sale.storage_status === 'stored'
                  ? 'Stored at Shop'
                  : sale.storage_status === 'picked_up'
                  ? 'Picked Up'
                  : 'Delivered / Taken'}
              </Text>
            </View>
          </View>

          {sale.storage_notes ? (
            <View className="mt-2 bg-amber-50 p-2.5 rounded-xl">
              <Text className="text-amber-900 text-xs font-medium">
                📝 {sale.storage_notes}
              </Text>
            </View>
          ) : null}

          {/* Void notice */}
          <TouchableOpacity
            onPress={handleDeleteSale}
            className="mt-3 py-2.5 border border-red-200 rounded-xl items-center flex-row justify-center active:bg-red-50"
          >
            <Ionicons name="trash" size={15} color="#ef4444" />
            <Text className="text-red-600 font-bold text-xs ml-1.5">
              Void Sale & Restore Stock
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Sale Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View className="flex-1 bg-black/60 justify-end">
          <View className="bg-white rounded-t-3xl max-h-[90%] p-5">
            <View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
              <Text className="text-gray-900 text-base font-extrabold">
                Edit Sale / Payment
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="pt-3">
              <Text className="text-gray-600 text-xs font-semibold mb-1">
                Customer Name
              </Text>
              <TextInput
                value={editCustomerName}
                onChangeText={setEditCustomerName}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm mb-3"
              />

              <Text className="text-gray-600 text-xs font-semibold mb-1">
                Phone Number
              </Text>
              <TextInput
                value={editPhoneNumber}
                onChangeText={setEditPhoneNumber}
                keyboardType="phone-pad"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm mb-3"
              />

              <Text className="text-gray-600 text-xs font-semibold mb-1">
                Amount Paid (GH₵) — Total: {formatCurrency(sale.total_amount)}
              </Text>
              <TextInput
                value={editAmountPaid}
                onChangeText={setEditAmountPaid}
                keyboardType="decimal-pad"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-bold mb-1"
              />

              {/* Balance preview */}
              <View className="flex-row justify-between items-center mb-3 px-1">
                <Text className="text-gray-500 text-xs">New Balance Due:</Text>
                <Text
                  className={`text-xs font-extrabold ${
                    calculatedBalance > 0 ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(calculatedBalance)}
                </Text>
              </View>

              {/* Storage Status */}
              <Text className="text-gray-600 text-xs font-semibold mb-1.5">
                Storage Status
              </Text>
              <View className="flex-row mb-3">
                <TouchableOpacity
                  onPress={() => setEditStorageStatus('delivered')}
                  className={`px-3 py-1.5 rounded-xl mr-2 ${
                    editStorageStatus === 'delivered'
                      ? 'bg-blue-900'
                      : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      editStorageStatus === 'delivered'
                        ? 'text-white'
                        : 'text-gray-700'
                    }`}
                  >
                    Delivered
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setEditStorageStatus('stored')}
                  className={`px-3 py-1.5 rounded-xl mr-2 ${
                    editStorageStatus === 'stored'
                      ? 'bg-amber-600'
                      : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      editStorageStatus === 'stored'
                        ? 'text-white'
                        : 'text-gray-700'
                    }`}
                  >
                    Stored at Shop
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setEditStorageStatus('picked_up')}
                  className={`px-3 py-1.5 rounded-xl ${
                    editStorageStatus === 'picked_up'
                      ? 'bg-emerald-600'
                      : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      editStorageStatus === 'picked_up'
                        ? 'text-white'
                        : 'text-gray-700'
                    }`}
                  >
                    Picked Up
                  </Text>
                </TouchableOpacity>
              </View>

              <Text className="text-gray-600 text-xs font-semibold mb-1">
                Storage Notes
              </Text>
              <TextInput
                value={editStorageNotes}
                onChangeText={setEditStorageNotes}
                placeholder="Notes about pickup or payment..."
                placeholderTextColor="#9ca3af"
                multiline
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-xs mb-5"
              />

              <TouchableOpacity
                onPress={handleSaveEdit}
                className="bg-blue-900 py-3.5 rounded-xl items-center mb-6"
              >
                <Text className="text-white font-extrabold text-sm">
                  Save Changes
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
