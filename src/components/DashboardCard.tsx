import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DashboardCardProps {
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
}

export default function DashboardCard({ title, value, icon, color, bgColor }: DashboardCardProps) {
  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm flex-1 mx-1.5 min-w-[140px]">
      <View className={`w-10 h-10 rounded-xl items-center justify-center mb-3`} style={{ backgroundColor: bgColor }}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text className="text-gray-500 text-xs font-medium mb-1">{title}</Text>
      <Text className="text-gray-900 text-lg font-bold" numberOfLines={1}>{value}</Text>
    </View>
  );
}
