import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Product, CATEGORIES } from '../database/types';
import { formatCurrency } from '../utils/formatting';

interface ProductFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => void;
  initialValues?: Product;
}

export default function ProductForm({ visible, onClose, onSubmit, initialValues }: ProductFormProps) {
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [category, setCategory] = useState('Pieces');
  const [threshold, setThreshold] = useState('5');
  const [sku, setSku] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (initialValues) {
      setName(initialValues.name || '');
      setCostPrice(initialValues.cost_price ? initialValues.cost_price.toString() : '');
      setUnitPrice(initialValues.unit_price ? initialValues.unit_price.toString() : '');
      setStockQuantity(initialValues.stock_quantity ? initialValues.stock_quantity.toString() : '');
      setCategory(initialValues.category || 'Pieces');
      setThreshold(initialValues.low_stock_threshold ? initialValues.low_stock_threshold.toString() : '5');
      setSku(initialValues.sku || '');
      setImageUri(initialValues.image_uri || null);
    } else {
      resetForm();
    }
  }, [initialValues, visible]);

  const resetForm = () => {
    setName('');
    setCostPrice('');
    setUnitPrice('');
    setStockQuantity('');
    setCategory('Pieces');
    setThreshold('5');
    setSku('');
    setImageUri(null);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const costNum = parseFloat(costPrice) || 0;
  const sellingNum = parseFloat(unitPrice) || 0;
  const profitPerUnit = sellingNum - costNum;
  const marginPercent = sellingNum > 0 ? (profitPerUnit / sellingNum) * 100 : 0;

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter the product name.');
      return;
    }
    if (!unitPrice || isNaN(Number(unitPrice))) {
      Alert.alert('Error', 'Please enter a valid selling price.');
      return;
    }
    if (!stockQuantity || isNaN(Number(stockQuantity))) {
      Alert.alert('Error', 'Please enter a valid stock quantity.');
      return;
    }
    onSubmit({
      name: name.trim(),
      cost_price: parseFloat(costPrice) || 0,
      unit_price: parseFloat(unitPrice),
      stock_quantity: parseFloat(stockQuantity),
      category,
      low_stock_threshold: parseFloat(threshold) || 5,
      sku: sku.trim() || null,
      image_uri: imageUri,
    });
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[90%] shadow-2xl">
          <View className="flex-row items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
            <Text className="text-lg font-bold text-gray-900">
              {initialValues ? 'Edit Product & Pricing' : 'Add New Product'}
            </Text>
            <TouchableOpacity onPress={onClose} className="p-1">
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="px-5 py-4" showsVerticalScrollIndicator={false}>
            {/* Image Section */}
            <View className="items-center mb-4">
              {imageUri ? (
                <Image source={{ uri: imageUri }} className="w-28 h-28 rounded-2xl mb-2" />
              ) : (
                <View className="w-28 h-28 rounded-2xl bg-gray-100 items-center justify-center mb-2">
                  <Ionicons name="image-outline" size={36} color="#9ca3af" />
                </View>
              )}
              <View className="flex-row">
                <TouchableOpacity
                  onPress={takePhoto}
                  className="bg-blue-900 px-3.5 py-1.5 rounded-lg mr-2 flex-row items-center"
                >
                  <Ionicons name="camera" size={15} color="white" />
                  <Text className="text-white text-xs font-semibold ml-1">Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={pickImage}
                  className="bg-gray-200 px-3.5 py-1.5 rounded-lg flex-row items-center"
                >
                  <Ionicons name="images" size={15} color="#374151" />
                  <Text className="text-gray-700 text-xs font-semibold ml-1">Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Product Name */}
            <Text className="text-gray-700 text-xs font-bold mb-1">Product / Material Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Dangote Cement 42.5R, Iron Rods 16mm"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 text-sm mb-3"
            />

            {/* SKU / Barcode */}
            <Text className="text-gray-700 text-xs font-bold mb-1">Barcode / SKU Code (Optional)</Text>
            <TextInput
              value={sku}
              onChangeText={setSku}
              placeholder="e.g. AN-1001 or scan barcode"
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-gray-900 text-xs mb-3 font-mono"
            />

            {/* Cost Price vs Selling Price (P&L Tracking) */}
            <View className="flex-row mb-2">
              <View className="flex-1 mr-2">
                <Text className="text-gray-700 text-xs font-bold mb-1">
                  Cost / Wholesale (GH₵)
                </Text>
                <TextInput
                  value={costPrice}
                  onChangeText={setCostPrice}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-semibold"
                />
              </View>

              <View className="flex-1 ml-2">
                <Text className="text-blue-900 text-xs font-bold mb-1">
                  Selling Price (GH₵) *
                </Text>
                <TextInput
                  value={unitPrice}
                  onChangeText={setUnitPrice}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  className="bg-blue-50 border border-blue-300 rounded-xl px-3 py-2 text-blue-900 text-sm font-bold"
                />
              </View>
            </View>

            {/* Live Profit & Margin Indicator */}
            {sellingNum > 0 && costNum > 0 && (
              <View
                className={`p-2.5 rounded-xl mb-3 flex-row justify-between items-center ${
                  profitPerUnit >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <Text className="text-emerald-900 text-xs font-bold">
                  {profitPerUnit >= 0 ? '📈 Profit per unit:' : '⚠️ Loss per unit:'} {formatCurrency(profitPerUnit)}
                </Text>
                <Text className="text-emerald-800 text-xs font-bold">
                  {marginPercent.toFixed(1)}% margin
                </Text>
              </View>
            )}

            {/* Stock Quantity and Low Alert Threshold */}
            <View className="flex-row mb-3">
              <View className="flex-1 mr-2">
                <Text className="text-gray-700 text-xs font-bold mb-1">Stock Quantity *</Text>
                <TextInput
                  value={stockQuantity}
                  onChangeText={setStockQuantity}
                  placeholder="0"
                  keyboardType="decimal-pad"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm"
                />
              </View>

              <View className="flex-1 ml-2">
                <Text className="text-gray-700 text-xs font-bold mb-1">Low Alert Threshold</Text>
                <TextInput
                  value={threshold}
                  onChangeText={setThreshold}
                  placeholder="5"
                  keyboardType="decimal-pad"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm"
                />
              </View>
            </View>

            {/* Category / Unit Type Chips */}
            <Text className="text-gray-700 text-xs font-bold mb-1.5">Category / Unit</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-full mr-2 ${
                    category === cat ? 'bg-blue-900' : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      category === cat ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              className="bg-blue-900 py-3.5 rounded-xl items-center mb-8 shadow-md"
            >
              <Text className="text-white text-base font-bold">
                {initialValues ? 'Update Product' : 'Add to Inventory'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
