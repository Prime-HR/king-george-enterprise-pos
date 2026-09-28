import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../src/components/Header';
import {
  getStoredSales,
  getPickedUpSales,
  getSaleItems,
  updateStorageStatus,
} from '../src/database/sales';
import { Sale, SaleItem } from '../src/database/types';
import { formatCurrency, formatDate } from '../src/utils/formatting';

interface StorageSection {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  data: (Sale & { items?: SaleItem[] })[];
}

export default function StorageScreen() {
  const router = useRouter();
  const [sections, setSections] = useState<StorageSection[]>([]);

  const loadStorage = useCallback(() => {
    const stored = getStoredSales();
    const pickedUp = getPickedUpSales();

    const storedWithItems = stored.map((sale) => ({
      ...sale,
      items: getSaleItems(sale.id!),
    }));

    const pickedUpWithItems = pickedUp.map((sale) => ({
      ...sale,
      items: getSaleItems(sale.id!),
    }));

    const result: StorageSection[] = [];

    if (storedWithItems.length > 0) {
      result.push({
        title: `📦 Awaiting Pickup (${storedWithItems.length})`,
        icon: 'cube',
        color: '#d97706',
        bgColor: '#fffbeb',
        data: storedWithItems,
      });
    }

    if (pickedUpWithItems.length > 0) {
      result.push({
        title: `✅ Recently Picked Up (${pickedUpWithItems.length})`,
        icon: 'checkmark-circle',
        color: '#059669',
        bgColor: '#ecfdf5',
        data: pickedUpWithItems,
      });
    }

    setSections(result);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStorage();
    }, [loadStorage])
  );

  const handleMarkPickedUp = (sale: Sale) => {
    Alert.alert(
      'Confirm Pickup',
      `Mark all items for "${sale.customer_name}" as picked up?\n\nReceipt #${String(sale.id).padStart(6, '0')}\nTotal: ${formatCurrency(sale.total_amount)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '✅ Picked Up',
          onPress: () => {
            updateStorageStatus(sale.id!, 'picked_up');
            loadStorage();
            Alert.alert('Done', `Items for ${sale.customer_name} marked as picked up!`);
          },
        },
      ]
    );
  };

  const handleCallCustomer = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const renderSaleCard = ({ item: sale }: { item: Sale & { items?: SaleItem[] } }) => {
    const isStored = sale.storage_status === 'stored';
    const daysSincePurchase = Math.floor(
      (Date.now() - new Date(sale.receipt_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    return (
      <View className="bg-white rounded-2xl mx-4 mb-3 overflow-hidden shadow-sm">
        {/* Customer Header */}
        <View className={`px-4 py-3 flex-row items-center ${isStored ? 'bg-amber-50' : 'bg-green-50'}`}>
          <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isStored ? 'bg-amber-100' : 'bg-green-100'}`}>
            <MaterialCommunityIcons
              name={isStored ? 'package-variant' : 'package-variant-closed-check'}
              size={22}
              color={isStored ? '#d97706' : '#059669'}
            />
          </View>
          <View className="flex-1">
            <Text className="text-gray-900 text-sm font-bold">
              {sale.customer_name || 'Walk-in Customer'}
            </Text>
            <Text className="text-gray-500 text-xs">
              Receipt #{String(sale.id).padStart(6, '0')} • {formatDate(sale.receipt_date)}
            </Text>
          </View>
          {isStored && daysSincePurchase > 0 && (
            <View className={`px-2.5 py-1 rounded-full ${daysSincePurchase > 7 ? 'bg-red-100' : daysSincePurchase > 3 ? 'bg-amber-100' : 'bg-blue-100'}`}>
              <Text className={`text-[10px] font-bold ${daysSincePurchase > 7 ? 'text-red-700' : daysSincePurchase > 3 ? 'text-amber-700' : 'text-blue-700'}`}>
                {daysSincePurchase}d ago
              </Text>
            </View>
          )}
        </View>

        {/* Items List */}
        <View className="px-4 py-2">
          {sale.items?.map((item, index) => (
            <View key={item.id || index} className="flex-row items-center py-1.5 border-b border-gray-50">
              <Text className="text-gray-400 text-xs w-5">{index + 1}.</Text>
              <Text className="text-gray-800 text-xs font-medium flex-1">{item.item_name}</Text>
              <Text className="text-gray-500 text-xs mr-3">
                {item.quantity} {item.category}
              </Text>
              <Text className="text-gray-900 text-xs font-semibold">
                {formatCurrency(item.total_price)}
              </Text>
            </View>
          ))}
        </View>

        {/* Total & Payment Info */}
        <View className="px-4 py-2 border-t border-dashed border-gray-200 flex-row justify-between">
          <Text className="text-gray-900 text-sm font-bold">Total: {formatCurrency(sale.total_amount)}</Text>
          <Text className="text-green-600 text-xs font-semibold">Paid: {formatCurrency(sale.amount_paid)}</Text>
        </View>

        {/* Storage Notes */}
        {sale.storage_notes ? (
          <View className="px-4 py-2 bg-blue-50">
            <Text className="text-blue-700 text-xs">
              <Ionicons name="document-text" size={12} /> {sale.storage_notes}
            </Text>
          </View>
        ) : null}

        {/* Action Buttons for Stored Items */}
        {isStored && (
          <View className="flex-row px-4 py-3 border-t border-gray-100">
            <TouchableOpacity
              onPress={() => handleMarkPickedUp(sale)}
              className="flex-1 bg-green-600 py-2.5 rounded-xl items-center flex-row justify-center mr-1.5"
            >
              <Ionicons name="checkmark-circle" size={18} color="white" />
              <Text className="text-white font-bold text-xs ml-1.5">Mark Picked Up</Text>
            </TouchableOpacity>
            {sale.phone_number ? (
              <TouchableOpacity
                onPress={() => handleCallCustomer(sale.phone_number)}
                className="bg-blue-900 py-2.5 px-4 rounded-xl items-center flex-row justify-center ml-1.5"
              >
                <Ionicons name="call" size={16} color="white" />
                <Text className="text-white font-bold text-xs ml-1.5">Call</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={() => router.push(`/receipt/${sale.id}`)}
              className="bg-gray-200 py-2.5 px-4 rounded-xl items-center flex-row justify-center ml-1.5"
            >
              <Ionicons name="receipt-outline" size={16} color="#374151" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-100">
      <Header />

      {/* Title Bar */}
      <View className="mx-4 mt-4 mb-2">
        <Text className="text-gray-900 text-lg font-bold">📦 Stored Items</Text>
        <Text className="text-gray-400 text-xs">Products paid for but kept at the shop</Text>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={renderSaleCard}
        renderSectionHeader={({ section }) => (
          <View
            className="mx-4 mt-3 mb-2 px-3 py-2.5 rounded-xl flex-row items-center"
            style={{ backgroundColor: section.bgColor }}
          >
            <Ionicons name={section.icon} size={18} color={section.color} />
            <Text className="ml-2 font-bold text-sm" style={{ color: section.color }}>
              {section.title}
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <MaterialCommunityIcons name="package-variant-closed" size={60} color="#d1d5db" />
            <Text className="text-gray-400 text-base mt-4">No stored items</Text>
            <Text className="text-gray-300 text-sm mt-1 text-center px-10">
              When a customer pays but leaves items at the shop, they will appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}
