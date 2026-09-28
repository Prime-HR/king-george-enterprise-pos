import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../utils/formatting';

interface SaleItemRowProps {
  index: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  category: string;
  onEdit?: () => void;
  onRemove: () => void;
}

export default function SaleItemRow({
  index,
  itemName,
  quantity,
  unitPrice,
  totalPrice,
  category,
  onEdit,
  onRemove,
}: SaleItemRowProps) {
  return (
    <TouchableOpacity
      activeOpacity={onEdit ? 0.7 : 1}
      onPress={onEdit}
      className="bg-gray-50 border border-gray-100 rounded-xl p-3 mb-2 flex-row items-center"
    >
      <View className="bg-blue-100 w-7 h-7 rounded-full items-center justify-center mr-2.5">
        <Text className="text-blue-800 font-bold text-xs">{index + 1}</Text>
      </View>
      <View className="flex-1 pr-1">
        <Text className="text-gray-900 font-bold text-sm" numberOfLines={1}>
          {itemName}
        </Text>
        <Text className="text-gray-500 text-xs mt-0.5">
          {quantity} {category} × {formatCurrency(unitPrice)}
        </Text>
      </View>
      <Text className="text-gray-900 font-bold text-sm mr-2">
        {formatCurrency(totalPrice)}
      </Text>
      <View className="flex-row items-center">
        {onEdit && (
          <TouchableOpacity
            onPress={onEdit}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="p-1.5 mr-1 bg-blue-50 rounded-lg"
          >
            <Ionicons name="pencil" size={15} color="#1e40af" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="p-1.5 bg-red-50 rounded-lg"
        >
          <Ionicons name="trash-outline" size={15} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
