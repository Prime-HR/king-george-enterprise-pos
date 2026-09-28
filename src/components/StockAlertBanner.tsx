import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product } from '../database/types';

interface StockAlertBannerProps {
  lowStockProducts: Product[];
  onPress?: () => void;
}

export default function StockAlertBanner({ lowStockProducts, onPress }: StockAlertBannerProps) {
  if (lowStockProducts.length === 0) return null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="bg-amber-50 border border-amber-300 rounded-xl mx-4 mt-3 p-3 flex-row items-center"
    >
      <View className="bg-amber-100 w-9 h-9 rounded-full items-center justify-center mr-3">
        <Ionicons name="warning" size={20} color="#d97706" />
      </View>
      <View className="flex-1">
        <Text className="text-amber-800 font-bold text-sm">Low Stock Alert</Text>
        <Text className="text-amber-600 text-xs mt-0.5">
          {lowStockProducts.length} item{lowStockProducts.length > 1 ? 's' : ''} running low
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#d97706" />
    </TouchableOpacity>
  );
}
