import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Product, CATEGORIES } from '../database/types';
import { formatCurrency } from '../utils/formatting';

interface MaterialLookupModalProps {
  visible: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct?: (product: Product) => void;
}

export default function MaterialLookupModal({
  visible,
  onClose,
  products,
  onSelectProduct,
}: MaterialLookupModalProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const filteredProducts = useMemo(() => {
    let result = products;
    if (selectedCategory !== 'All') {
      result = result.filter((p) => p.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [products, search, selectedCategory]);

  const getStockBadge = (product: Product) => {
    if (product.stock_quantity <= 0) {
      return {
        bg: 'bg-red-100',
        text: 'text-red-700',
        label: 'Out of Stock',
        icon: 'close-circle' as const,
      };
    }
    if (product.stock_quantity <= product.low_stock_threshold) {
      return {
        bg: 'bg-amber-100',
        text: 'text-amber-800',
        label: `Low: ${product.stock_quantity} ${product.category}`,
        icon: 'warning' as const,
      };
    }
    return {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      label: `${product.stock_quantity} in stock`,
      icon: 'checkmark-circle' as const,
    };
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const stock = getStockBadge(item);
    return (
      <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm">
        <View className="flex-row items-center">
          {item.image_uri ? (
            <Image
              source={{ uri: item.image_uri }}
              className="w-14 h-14 rounded-xl mr-3"
            />
          ) : (
            <View className="w-14 h-14 rounded-xl bg-blue-50 items-center justify-center mr-3">
              <Ionicons name="cube-outline" size={26} color="#1e40af" />
            </View>
          )}

          <View className="flex-1 pr-2">
            <Text className="text-gray-900 font-bold text-base">{item.name}</Text>
            <View className="flex-row items-center mt-1">
              <View className="bg-gray-100 px-2 py-0.5 rounded-md mr-2">
                <Text className="text-gray-600 text-xs font-semibold">
                  {item.category}
                </Text>
              </View>
              <View
                className={`px-2 py-0.5 rounded-md flex-row items-center ${stock.bg}`}
              >
                <Ionicons
                  name={stock.icon}
                  size={12}
                  color={
                    item.stock_quantity <= 0
                      ? '#b91c1c'
                      : item.stock_quantity <= item.low_stock_threshold
                      ? '#92400e'
                      : '#065f46'
                  }
                />
                <Text className={`text-xs font-bold ml-1 ${stock.text}`}>
                  {stock.label}
                </Text>
              </View>
            </View>
          </View>

          <View className="items-end">
            <Text className="text-blue-900 font-extrabold text-lg">
              {formatCurrency(item.unit_price)}
            </Text>
            <Text className="text-gray-400 text-[10px]">
              per {item.category.toLowerCase().replace(/s$/, '') || item.category}
            </Text>
          </View>
        </View>

        {onSelectProduct && (
          <TouchableOpacity
            onPress={() => {
              onSelectProduct(item);
              onClose();
            }}
            className="mt-3 bg-blue-900 py-2.5 rounded-xl flex-row items-center justify-center active:bg-blue-800"
          >
            <Ionicons name="add-circle" size={16} color="#f59e0b" />
            <Text className="text-white font-bold text-xs ml-1.5">
              Add to Current Sale
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-gray-50 rounded-t-3xl h-[92%] flex-col overflow-hidden">
          {/* Header */}
          <View className="bg-[#021235] px-5 pt-4 pb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-lg bg-amber-400 items-center justify-center mr-2.5">
                  <Ionicons name="pricetag" size={18} color="#021235" />
                </View>
                <View>
                  <Text className="text-white text-lg font-extrabold">
                    Product & Price Checker
                  </Text>
                  <Text className="text-amber-200 text-xs">
                    Quickly check prices and stock for provisions
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-white/20 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View className="bg-white rounded-xl flex-row items-center px-3.5 py-2.5 mt-3.5 shadow-sm">
              <Ionicons name="search" size={18} color="#6b7280" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search rice, cooking oil, sugar, milo, soap..."
                placeholderTextColor="#9ca3af"
                className="flex-1 ml-2 text-gray-900 text-sm font-medium"
                autoFocus
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Category Filter Chips */}
          <View className="py-2.5 px-4 bg-white border-b border-gray-200">
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={['All', ...CATEGORIES]}
              keyExtractor={(cat) => cat}
              renderItem={({ item: cat }) => (
                <TouchableOpacity
                  onPress={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full mr-2 ${
                    selectedCategory === cat ? 'bg-[#021235]' : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      selectedCategory === cat ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* List of Products */}
          <View className="flex-1 px-4 pt-3">
            <View className="flex-row justify-between items-center mb-2 px-1">
              <Text className="text-gray-500 text-xs font-semibold">
                Found {filteredProducts.length} product
                {filteredProducts.length === 1 ? '' : 's'}
              </Text>
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Text className="text-[#021235] text-xs font-bold">
                    Clear filter
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderProductItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 40 }}
              ListEmptyComponent={
                <View className="items-center justify-center py-16">
                  <Ionicons name="search-outline" size={48} color="#9ca3af" />
                  <Text className="text-gray-700 font-bold text-base mt-3">
                    No materials found
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1 text-center px-8">
                    Try searching for another keyword or change the category filter
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}
