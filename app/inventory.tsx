import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import Header from '../src/components/Header';
import ProductForm from '../src/components/ProductForm';
import MaterialLookupModal from '../src/components/MaterialLookupModal';
import PinModal from '../src/components/PinModal';
import {
  getAllProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  exportInventoryCSV,
} from '../src/database/inventory';
import { Product, CATEGORIES } from '../src/database/types';
import { formatCurrency } from '../src/utils/formatting';

export default function InventoryScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showQuickChecker, setShowQuickChecker] = useState(false);

  // PIN security for deleting products
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const loadProducts = useCallback(() => {
    const data = searchQuery ? searchProducts(searchQuery) : getAllProducts();
    setProducts(data);
  }, [searchQuery]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const totalStockValue = useMemo(() => {
    return products.reduce((sum, p) => sum + p.stock_quantity * p.unit_price, 0);
  }, [products]);

  const handleAddProduct = (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (editingProduct?.id) {
        updateProduct(editingProduct.id, product);
      } else {
        addProduct(product);
      }
      setEditingProduct(undefined);
      loadProducts();
    } catch (error) {
      Alert.alert('Error', 'Failed to save product.');
    }
  };

  const handleDeleteRequest = (product: Product) => {
    setProductToDelete(product);
    setPinModalVisible(true);
  };

  const handleConfirmedDelete = () => {
    if (!productToDelete?.id) return;
    try {
      deleteProduct(productToDelete.id);
      setProductToDelete(null);
      setPinModalVisible(false);
      loadProducts();
      Alert.alert('Deleted', `"${productToDelete.name}" was permanently removed.`);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete product.');
    }
  };

  const handleExportCSV = async () => {
    try {
      const csv = exportInventoryCSV();
      const fileUri = `${FileSystem.documentDirectory}inventory_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Inventory CSV',
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export inventory CSV.');
    }
  };

  const getStockColor = (product: Product) => {
    if (product.stock_quantity <= 0) return { bg: 'bg-red-100', text: 'text-red-700' };
    if (product.stock_quantity <= product.low_stock_threshold)
      return { bg: 'bg-amber-100', text: 'text-amber-800' };
    return { bg: 'bg-emerald-100', text: 'text-emerald-800' };
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const stock = getStockColor(item);
    const unitProfit = item.cost_price ? item.unit_price - item.cost_price : 0;

    return (
      <View className="bg-white rounded-2xl mx-4 mb-3 p-4 shadow-sm border border-gray-100">
        <View className="flex-row items-center">
          {item.image_uri ? (
            <Image
              source={{ uri: item.image_uri }}
              className="w-16 h-16 rounded-xl mr-3"
            />
          ) : (
            <View className="w-16 h-16 rounded-xl bg-blue-50 items-center justify-center mr-3">
              <Ionicons name="cube" size={26} color="#1e40af" />
            </View>
          )}

          <View className="flex-1 pr-1">
            <View className="flex-row items-center">
              <Text className="text-gray-900 text-sm font-extrabold flex-1">{item.name}</Text>
              {item.sku ? (
                <View className="bg-gray-100 px-1.5 py-0.5 rounded">
                  <Text className="text-gray-500 text-[9px] font-mono">{item.sku}</Text>
                </View>
              ) : null}
            </View>

            <View className="flex-row items-center mt-0.5">
              <Text className="text-blue-900 text-base font-extrabold mr-2">
                {formatCurrency(item.unit_price)}
              </Text>
              {item.cost_price && item.cost_price > 0 ? (
                <Text className="text-gray-400 text-[10px]">
                  (Cost: {formatCurrency(item.cost_price)})
                </Text>
              ) : null}
            </View>

            <View className="flex-row items-center mt-1 flex-wrap">
              <View className={`px-2 py-0.5 rounded-full ${stock.bg} mr-2`}>
                <Text className={`text-[10px] font-bold ${stock.text}`}>
                  {item.stock_quantity} {item.category}
                </Text>
              </View>

              {unitProfit > 0 && (
                <Text className="text-emerald-700 text-[10px] font-bold">
                  +GH₵ {unitProfit.toFixed(2)} profit
                </Text>
              )}
            </View>
          </View>

          {/* Edit and Delete Buttons */}
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => {
                setEditingProduct(item);
                setShowForm(true);
              }}
              className="bg-blue-50 p-2 rounded-xl mr-1.5 active:bg-blue-100"
            >
              <Ionicons name="pencil" size={17} color="#1e40af" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleDeleteRequest(item)}
              className="bg-red-50 p-2 rounded-xl active:bg-red-100"
            >
              <Ionicons name="trash-outline" size={17} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-100">
      <Header />

      {/* Stock Value & Export Row */}
      <View className="bg-white mx-4 mt-3 rounded-2xl p-3.5 shadow-sm border border-gray-100 flex-row justify-between items-center">
        <View>
          <Text className="text-gray-400 text-[10px] font-bold uppercase">Total Inventory Value</Text>
          <Text className="text-gray-900 text-lg font-extrabold">{formatCurrency(totalStockValue)}</Text>
          <Text className="text-gray-500 text-[10px]">{products.length} catalog items</Text>
        </View>

        <TouchableOpacity
          onPress={handleExportCSV}
          className="bg-gray-100 px-3 py-2 rounded-xl flex-row items-center border border-gray-200"
        >
          <Ionicons name="download-outline" size={16} color="#374151" />
          <Text className="text-gray-700 text-xs font-bold ml-1.5">Export CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Search & Price Check Row */}
      <View className="mx-4 mt-2.5 flex-row items-center">
        <View className="bg-white rounded-xl flex-row items-center px-3.5 py-2 shadow-sm flex-1 mr-2 border border-gray-100">
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search material or SKU..."
            placeholderTextColor="#9ca3af"
            className="flex-1 ml-2 text-gray-900 text-xs font-medium"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => setShowQuickChecker(true)}
          className="bg-amber-500 p-2.5 rounded-xl shadow-sm flex-row items-center"
        >
          <Ionicons name="pricetag" size={18} color="white" />
        </TouchableOpacity>
      </View>

      {/* Category filter chips */}
      <View className="mt-2 mb-1 px-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['All', ...CATEGORIES].map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full mr-1.5 ${
                selectedCategory === cat ? 'bg-blue-900' : 'bg-white border border-gray-200'
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
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProduct}
        contentContainerStyle={{ paddingBottom: 110, paddingTop: 4 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="cube-outline" size={60} color="#d1d5db" />
            <Text className="text-gray-400 text-base mt-4 font-bold">
              No materials found
            </Text>
            <Text className="text-gray-300 text-xs mt-1">
              Tap the + button below to add your first building material
            </Text>
          </View>
        }
      />

      {/* Floating Action Button to Add New Material */}
      <TouchableOpacity
        onPress={() => {
          setEditingProduct(undefined);
          setShowForm(true);
        }}
        activeOpacity={0.85}
        className="absolute bottom-20 right-5 bg-blue-900 w-14 h-14 rounded-full items-center justify-center shadow-lg border-2 border-amber-400 active:bg-blue-800"
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      {/* Modal for adding/editing product */}
      <ProductForm
        visible={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingProduct(undefined);
        }}
        onSubmit={handleAddProduct}
        initialValues={editingProduct}
      />

      {/* Quick Lookup Modal */}
      <MaterialLookupModal
        visible={showQuickChecker}
        onClose={() => setShowQuickChecker(false)}
        products={products}
      />

      {/* PIN Security Modal for Deleting Products */}
      <PinModal
        visible={pinModalVisible}
        title="Delete Inventory Item"
        subtitle={`Manager PIN is required to delete "${productToDelete?.name}".`}
        onSuccess={handleConfirmedDelete}
        onClose={() => {
          setPinModalVisible(false);
          setProductToDelete(null);
        }}
      />
    </View>
  );
}
