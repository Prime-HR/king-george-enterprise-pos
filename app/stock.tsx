import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Header from '../src/components/Header';
import {
  getAllProducts,
  getLowStockProducts,
  getOutOfStockProducts,
  updateProduct,
} from '../src/database/inventory';
import { Product } from '../src/database/types';
import { formatCurrency } from '../src/utils/formatting';

interface StockSection {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  data: Product[];
}

export default function StockScreen() {
  const [sections, setSections] = useState<StockSection[]>([]);

  const loadStock = useCallback(() => {
    const all = getAllProducts();
    const outOfStock = all.filter((p) => p.stock_quantity <= 0);
    const lowStock = all.filter(
      (p) => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_threshold
    );
    const inStock = all.filter((p) => p.stock_quantity > p.low_stock_threshold);

    const result: StockSection[] = [];
    if (outOfStock.length > 0) {
      result.push({
        title: `Out of Stock (${outOfStock.length})`,
        icon: 'alert-circle',
        color: '#dc2626',
        bgColor: '#fef2f2',
        data: outOfStock,
      });
    }
    if (lowStock.length > 0) {
      result.push({
        title: `Low Stock (${lowStock.length})`,
        icon: 'warning',
        color: '#d97706',
        bgColor: '#fffbeb',
        data: lowStock,
      });
    }
    if (inStock.length > 0) {
      result.push({
        title: `In Stock (${inStock.length})`,
        icon: 'checkmark-circle',
        color: '#059669',
        bgColor: '#ecfdf5',
        data: inStock,
      });
    }
    setSections(result);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStock();
    }, [loadStock])
  );

  const handleRestock = (product: Product) => {
    Alert.prompt(
      'Restock',
      `Enter quantity to add for "${product.name}":`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Stock',
          onPress: (value?: string) => {
            const qty = parseFloat(value || '0');
            if (qty > 0) {
              updateProduct(product.id!, {
                stock_quantity: product.stock_quantity + qty,
              });
              loadStock();
            }
          },
        },
      ],
      'plain-text',
      '',
      'decimal-pad'
    );
  };

  // Fallback for Android (no Alert.prompt)
  const handleRestockAndroid = (product: Product) => {
    // On Android, Alert.prompt is not available, so we use a simple approach
    Alert.alert(
      'Restock',
      `Add stock for "${product.name}"?\nCurrent: ${product.stock_quantity} ${product.category}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: '+5',
          onPress: () => {
            updateProduct(product.id!, { stock_quantity: product.stock_quantity + 5 });
            loadStock();
          },
        },
        {
          text: '+10',
          onPress: () => {
            updateProduct(product.id!, { stock_quantity: product.stock_quantity + 10 });
            loadStock();
          },
        },
        {
          text: '+50',
          onPress: () => {
            updateProduct(product.id!, { stock_quantity: product.stock_quantity + 50 });
            loadStock();
          },
        },
      ]
    );
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const isLow = item.stock_quantity <= item.low_stock_threshold;
    const isOut = item.stock_quantity <= 0;

    return (
      <TouchableOpacity
        onPress={() =>
          Platform.OS === 'ios' ? handleRestock(item) : handleRestockAndroid(item)
        }
        className="bg-white rounded-xl mx-4 mb-2 p-3.5 flex-row items-center shadow-sm"
      >
        <View
          className={`w-10 h-10 rounded-xl items-center justify-center mr-3 ${
            isOut ? 'bg-red-100' : isLow ? 'bg-amber-100' : 'bg-green-100'
          }`}
        >
          <Ionicons
            name="cube"
            size={20}
            color={isOut ? '#dc2626' : isLow ? '#d97706' : '#059669'}
          />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 text-sm font-bold">{item.name}</Text>
          <Text className="text-gray-500 text-xs mt-0.5">
            {formatCurrency(item.unit_price)} per {item.category.toLowerCase().slice(0, -1) || item.category}
          </Text>
        </View>
        <View className="items-end">
          <Text
            className={`text-base font-extrabold ${
              isOut ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-green-600'
            }`}
          >
            {item.stock_quantity}
          </Text>
          <Text className="text-gray-400 text-[10px]">{item.category}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-100">
      <Header />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id!.toString()}
        renderItem={renderProduct}
        renderSectionHeader={({ section }) => (
          <View
            className="mx-4 mt-4 mb-2 px-3 py-2.5 rounded-xl flex-row items-center"
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
            <Ionicons name="layers-outline" size={60} color="#d1d5db" />
            <Text className="text-gray-400 text-base mt-4">No products in inventory</Text>
            <Text className="text-gray-300 text-sm mt-1">Add products first in the Inventory tab</Text>
          </View>
        }
      />
    </View>
  );
}
