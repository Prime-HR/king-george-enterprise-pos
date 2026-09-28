import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Header from '../src/components/Header';
import SaleItemRow from '../src/components/SaleItemRow';
import StockAlertBanner from '../src/components/StockAlertBanner';
import MaterialLookupModal from '../src/components/MaterialLookupModal';
import { createSale } from '../src/database/sales';
import { getAllProducts, getLowStockProducts } from '../src/database/inventory';
import { Product, CATEGORIES, PaymentMethod, PAYMENT_METHODS } from '../src/database/types';
import { formatCurrency, getTodayString } from '../src/utils/formatting';

interface PendingItem {
  item_name: string;
  unit_price: number;
  cost_price?: number;
  quantity: number;
  total_price: number;
  category: string;
  product_id?: number | null;
}

export default function NewSaleScreen() {
  const router = useRouter();

  // All inventory products for autocomplete & quick lookup
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [lookupVisible, setLookupVisible] = useState(false);

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [receiptDate, setReceiptDate] = useState(getTodayString());

  // Current item form
  const [itemName, setItemName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState<string>('Bags');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProductStock, setSelectedProductStock] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sale items draft
  const [saleItems, setSaleItems] = useState<PendingItem[]>([]);

  // Payment
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');

  // Storage toggle
  const [storeAtShop, setStoreAtShop] = useState(false);
  const [storageNotes, setStorageNotes] = useState('');
  const [selectedProductCost, setSelectedProductCost] = useState<number | null>(null);

  // Editing draft item modal
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editUnitPrice, setEditUnitPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editCategory, setEditCategory] = useState('Bags');

  useFocusEffect(
    useCallback(() => {
      const products = getAllProducts();
      setAllProducts(products);
      const lowStock = getLowStockProducts();
      setLowStockProducts(lowStock);
    }, [])
  );

  // Autocomplete matching products by Name OR SKU/Barcode
  const suggestions = useMemo(() => {
    if (!itemName.trim() || !showSuggestions) return [];
    const q = itemName.toLowerCase().trim();
    return allProducts
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [itemName, showSuggestions, allProducts]);

  const grandTotal = saleItems.reduce((sum, item) => sum + item.total_price, 0);
  const parsedPaid = parseFloat(amountPaid) || 0;
  const balanceDue = Math.max(0, grandTotal - parsedPaid);

  const handleSelectProduct = (product: Product) => {
    setItemName(product.name);
    setUnitPrice(product.unit_price.toString());
    setCategory(product.category);
    setSelectedProductId(product.id || null);
    setSelectedProductStock(product.stock_quantity);
    setSelectedProductCost(product.cost_price || 0);
    setShowSuggestions(false);
  };

  const handleAddItem = () => {
    if (!itemName.trim()) {
      Alert.alert('Missing Field', 'Please enter or select a material name.');
      return;
    }
    const price = parseFloat(unitPrice);
    if (!unitPrice || isNaN(price) || price <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid unit price in GH₵.');
      return;
    }
    const qty = parseFloat(quantity);
    if (!quantity || isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity.');
      return;
    }

    const newItem: PendingItem = {
      item_name: itemName.trim(),
      unit_price: price,
      cost_price: selectedProductCost || 0,
      quantity: qty,
      total_price: qty * price,
      category,
      product_id: selectedProductId,
    };

    setSaleItems([...saleItems, newItem]);
    setItemName('');
    setUnitPrice('');
    setQuantity('');
    setSelectedProductId(null);
    setSelectedProductStock(null);
    setSelectedProductCost(null);
    setShowSuggestions(false);
  };

  // Open Edit Modal for an item in current sale
  const handleOpenEdit = (index: number) => {
    const item = saleItems[index];
    setEditingIndex(index);
    setEditItemName(item.item_name);
    setEditUnitPrice(item.unit_price.toString());
    setEditQuantity(item.quantity.toString());
    setEditCategory(item.category);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    if (!editItemName.trim()) {
      Alert.alert('Error', 'Item name cannot be empty.');
      return;
    }
    const price = parseFloat(editUnitPrice);
    const qty = parseFloat(editQuantity);
    if (isNaN(price) || price <= 0 || isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter valid price and quantity.');
      return;
    }

    const updated = [...saleItems];
    updated[editingIndex] = {
      ...updated[editingIndex],
      item_name: editItemName.trim(),
      unit_price: price,
      quantity: qty,
      total_price: qty * price,
      category: editCategory,
    };

    setSaleItems(updated);
    setEditingIndex(null);
  };

  const handleRemoveItem = (index: number) => {
    const item = saleItems[index];
    Alert.alert(
      'Remove Item',
      `Remove "${item.item_name}" from this sale?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setSaleItems(saleItems.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (saleItems.length === 0) return;
    Alert.alert(
      'Clear Sale',
      'Are you sure you want to remove all items and reset this sale?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            setSaleItems([]);
            setItemName('');
            setUnitPrice('');
            setQuantity('');
            setSelectedProductId(null);
            setSelectedProductStock(null);
            setAmountPaid('');
          },
        },
      ]
    );
  };

  const handleGenerateReceipt = () => {
    if (saleItems.length === 0) {
      Alert.alert('No Items', 'Please add at least one material to the sale.');
      return;
    }

    try {
      const paid = paymentMethod === 'Credit' ? 0 : parseFloat(amountPaid) || 0;
      const saleId = createSale(
        {
          customer_name: customerName.trim() || 'Walk-in Customer',
          phone_number: phoneNumber.trim(),
          receipt_date: receiptDate,
          total_amount: grandTotal,
          amount_paid: paid,
          balance_due: Math.max(0, grandTotal - paid),
          payment_method: paymentMethod,
          storage_status: storeAtShop ? 'stored' : 'delivered',
          storage_notes: storeAtShop ? storageNotes.trim() || null : null,
        },
        saleItems.map((item) => ({
          item_name: item.item_name,
          unit_price: item.unit_price,
          cost_price: item.cost_price || 0,
          quantity: item.quantity,
          total_price: item.total_price,
          category: item.category,
          product_id: item.product_id,
        }))
      );

      // Reset form
      setCustomerName('');
      setPhoneNumber('');
      setReceiptDate(getTodayString());
      setSaleItems([]);
      setAmountPaid('');
      setPaymentMethod('Cash');
      setStoreAtShop(false);
      setStorageNotes('');
      setSelectedProductId(null);
      setSelectedProductStock(null);
      setSelectedProductCost(null);

      // Navigate to receipt
      router.push(`/receipt/${saleId}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate receipt. Please try again.');
      console.error(error);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-100"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Header />

        <StockAlertBanner
          lowStockProducts={lowStockProducts}
          onPress={() => router.push('/stock')}
        />

        {/* Quick Material Price & Stock Lookup Button */}
        <View className="mx-4 mt-3">
          <TouchableOpacity
            onPress={() => setLookupVisible(true)}
            activeOpacity={0.8}
            className="bg-amber-500 py-3 px-4 rounded-2xl flex-row items-center justify-between shadow-sm"
          >
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-full bg-white/20 items-center justify-center mr-2.5">
                <Ionicons name="search" size={18} color="white" />
              </View>
              <View>
                <Text className="text-white font-extrabold text-sm">
                  Quick Material & Price Checker
                </Text>
                <Text className="text-amber-100 text-[11px]">
                  Look up prices & stock for customers instantly
                </Text>
              </View>
            </View>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>

        {/* Customer Info Card */}
        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-gray-100">
          <Text className="text-gray-900 text-sm font-bold mb-2.5 flex-row items-center">
            <Ionicons name="person" size={15} color="#1e40af" /> Customer Details
          </Text>
          <TextInput
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Customer Name (e.g. Kofi Mensah)"
            placeholderTextColor="#9ca3af"
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-sm mb-2"
          />
          <View className="flex-row">
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="Phone (e.g. 0244123456)"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-sm flex-1 mr-2"
            />
            <TextInput
              value={receiptDate}
              onChangeText={setReceiptDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9ca3af"
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-sm w-32"
            />
          </View>
        </View>

        {/* Add Material to Sale Section */}
        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-gray-100">
          <View className="flex-row justify-between items-center mb-2.5">
            <Text className="text-gray-900 text-sm font-bold flex-row items-center">
              <Ionicons name="add-circle" size={16} color="#1e40af" /> Add Material
            </Text>
            {selectedProductStock !== null && (
              <View className="bg-emerald-50 px-2.5 py-0.5 rounded-full flex-row items-center">
                <Ionicons name="checkmark-circle" size={12} color="#059669" />
                <Text className="text-emerald-700 text-xs font-bold ml-1">
                  In Stock: {selectedProductStock}
                </Text>
              </View>
            )}
          </View>

          {/* Item Name with Live Autocomplete Suggestions */}
          <View className="relative">
            <TextInput
              value={itemName}
              onChangeText={(text) => {
                setItemName(text);
                setShowSuggestions(true);
                if (selectedProductId) {
                  setSelectedProductId(null);
                  setSelectedProductStock(null);
                }
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Type material name (e.g. Cement, Rods, Sand)..."
              placeholderTextColor="#9ca3af"
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-sm"
            />

            {/* Autocomplete Popup Dropdown */}
            {suggestions.length > 0 && (
              <View className="mt-1 bg-white border border-blue-200 rounded-xl shadow-md overflow-hidden z-20">
                <View className="bg-blue-50 px-3 py-1.5 border-b border-blue-100 flex-row justify-between items-center">
                  <Text className="text-blue-900 font-bold text-[11px]">
                    SELECT FROM INVENTORY:
                  </Text>
                  <TouchableOpacity onPress={() => setShowSuggestions(false)}>
                    <Ionicons name="close" size={14} color="#1e40af" />
                  </TouchableOpacity>
                </View>
                {suggestions.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => handleSelectProduct(p)}
                    className="px-3 py-2.5 border-b border-gray-100 flex-row items-center justify-between active:bg-blue-50"
                  >
                    <View className="flex-1 pr-2">
                      <Text className="text-gray-900 font-bold text-xs">
                        {p.name}
                      </Text>
                      <Text className="text-gray-400 text-[10px]">
                        Category: {p.category} • Stock: {p.stock_quantity}
                      </Text>
                    </View>
                    <View className="bg-amber-100 px-2 py-0.5 rounded-md">
                      <Text className="text-amber-900 font-bold text-xs">
                        {formatCurrency(p.unit_price)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Unit Price and Quantity Inputs */}
          <View className="flex-row mt-2.5">
            <View className="flex-1 mr-2">
              <Text className="text-gray-600 text-xs font-semibold mb-1">
                Unit Price (GH₵)
              </Text>
              <TextInput
                value={unitPrice}
                onChangeText={setUnitPrice}
                placeholder="0.00"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm"
              />
            </View>
            <View className="w-28">
              <Text className="text-gray-600 text-xs font-semibold mb-1">
                Quantity
              </Text>
              <TextInput
                value={quantity}
                onChangeText={setQuantity}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="decimal-pad"
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-bold text-blue-900"
              />
            </View>
          </View>

          {/* Auto-calculated Total preview */}
          {unitPrice && quantity && !isNaN(Number(unitPrice)) && !isNaN(Number(quantity)) && (
            <View className="bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2 mt-2.5 flex-row justify-between items-center">
              <Text className="text-blue-900 text-xs font-semibold">Subtotal:</Text>
              <Text className="text-blue-900 text-sm font-extrabold">
                {formatCurrency(parseFloat(unitPrice) * parseFloat(quantity))}
              </Text>
            </View>
          )}

          {/* Unit Type / Category Chips */}
          <Text className="text-gray-600 text-xs font-semibold mt-2.5 mb-1.5">
            Unit Type:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                className={`px-3 py-1 rounded-full mr-2 ${
                  category === cat ? 'bg-blue-900' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    category === cat ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Add to Sale Button */}
          <TouchableOpacity
            onPress={handleAddItem}
            className="bg-blue-900 py-3 rounded-xl items-center flex-row justify-center active:bg-blue-800"
          >
            <Ionicons name="add" size={18} color="#f59e0b" />
            <Text className="text-white font-bold text-sm ml-1">
              Add Item to List
            </Text>
          </TouchableOpacity>
        </View>

        {/* Current Sale Draft List */}
        {saleItems.length > 0 && (
          <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-gray-100">
            <View className="flex-row justify-between items-center mb-2.5">
              <Text className="text-gray-900 text-sm font-extrabold">
                Items in this Sale ({saleItems.length})
              </Text>
              <TouchableOpacity
                onPress={handleClearAll}
                className="bg-red-50 px-2 py-1 rounded-lg"
              >
                <Text className="text-red-600 font-bold text-xs">Clear All</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-gray-400 text-[11px] mb-2 italic">
              💡 Tap any item to edit quantity or price. Tap 🗑 to remove.
            </Text>

            {saleItems.map((item, index) => (
              <SaleItemRow
                key={index}
                index={index}
                itemName={item.item_name}
                quantity={item.quantity}
                unitPrice={item.unit_price}
                totalPrice={item.total_price}
                category={item.category}
                onEdit={() => handleOpenEdit(index)}
                onRemove={() => handleRemoveItem(index)}
              />
            ))}

            {/* Grand Total */}
            <View className="border-t border-dashed border-gray-200 mt-2 pt-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-900 text-base font-extrabold">
                  Grand Total
                </Text>
                <Text className="text-blue-900 text-xl font-extrabold">
                  {formatCurrency(grandTotal)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment & Balance Section */}
        {saleItems.length > 0 && (
          <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-gray-100">
            <Text className="text-gray-900 text-sm font-bold mb-2 flex-row items-center">
              <Ionicons name="cash" size={15} color="#059669" /> Payment
            </Text>

            {/* Payment Method Selector */}
            <Text className="text-gray-500 text-xs font-semibold mb-1.5">Method:</Text>
            <View className="flex-row flex-wrap mb-2">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <TouchableOpacity
                    key={method}
                    onPress={() => {
                      setPaymentMethod(method);
                      if (method === 'Credit') {
                        setAmountPaid('0');
                      } else if (amountPaid === '0' || !amountPaid) {
                        setAmountPaid(grandTotal.toString());
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl mr-2 mb-1.5 border ${
                      isSelected
                        ? 'bg-blue-900 border-blue-900'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      {method === 'Cash' && '💵 '}
                      {method === 'MTN MoMo' && '🟡 '}
                      {method === 'Telecel Cash' && '🔴 '}
                      {method === 'Bank Transfer' && '🏦 '}
                      {method === 'Credit' && '📝 '}
                      {method}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {paymentMethod === 'Credit' && (
              <View className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mb-2.5 flex-row items-center">
                <Ionicons name="information-circle" size={16} color="#d97706" />
                <Text className="text-amber-800 text-xs font-semibold ml-2 flex-1">
                  Credit Sale: {customerName || 'Customer'} will be added to Debtors Ledger with balance {formatCurrency(grandTotal)}.
                </Text>
              </View>
            )}

            <Text className="text-gray-500 text-xs font-semibold mb-1">
              Amount Paid (GH₵):
            </Text>
            <TextInput
              value={amountPaid}
              onChangeText={setAmountPaid}
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
              keyboardType="decimal-pad"
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-sm font-bold"
            />

            {/* Quick payment shortcuts */}
            <View className="flex-row mt-2">
              <TouchableOpacity
                onPress={() => {
                  setAmountPaid(grandTotal.toString());
                  if (paymentMethod === 'Credit') setPaymentMethod('Cash');
                }}
                className="bg-emerald-50 px-3 py-1.5 rounded-lg mr-2"
              >
                <Text className="text-emerald-700 font-bold text-xs">
                  Pay Full ({formatCurrency(grandTotal)})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setAmountPaid('0');
                  setPaymentMethod('Credit');
                }}
                className="bg-gray-100 px-3 py-1.5 rounded-lg"
              >
                <Text className="text-gray-600 font-bold text-xs">Credit (GH₵ 0)</Text>
              </TouchableOpacity>
            </View>

            {balanceDue > 0 ? (
              <View className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 mt-2.5 flex-row justify-between items-center">
                <Text className="text-red-700 font-bold text-xs">
                  Balance Due (Tracked in Debtors):
                </Text>
                <Text className="text-red-700 font-extrabold text-sm">
                  {formatCurrency(balanceDue)}
                </Text>
              </View>
            ) : parsedPaid >= grandTotal && grandTotal > 0 ? (
              <View className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 mt-2.5 flex-row items-center">
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text className="text-emerald-800 font-bold text-xs ml-1.5">
                  Fully Settled ({paymentMethod})
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Store at Shop Toggle */}
        {saleItems.length > 0 && (
          <View className="bg-white mx-4 mt-3 rounded-2xl p-4 shadow-sm border border-gray-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 pr-2">
                <MaterialCommunityIcons name="package-variant" size={22} color="#d97706" />
                <View className="ml-2.5 flex-1">
                  <Text className="text-gray-900 text-sm font-bold">
                    Store Products at Shop
                  </Text>
                  <Text className="text-gray-400 text-xs">
                    Customer paid but will pick up later
                  </Text>
                </View>
              </View>
              <Switch
                value={storeAtShop}
                onValueChange={setStoreAtShop}
                trackColor={{ false: '#d1d5db', true: '#f59e0b' }}
                thumbColor={storeAtShop ? '#1e3a8a' : '#9ca3af'}
              />
            </View>
            {storeAtShop && (
              <TextInput
                value={storageNotes}
                onChangeText={setStorageNotes}
                placeholder="Storage notes (e.g. 'Paid in full. Truck picking up Friday afternoon')"
                placeholderTextColor="#9ca3af"
                multiline
                className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-gray-900 text-xs mt-3"
              />
            )}
          </View>
        )}

        {/* Generate Receipt Button */}
        {saleItems.length > 0 && (
          <TouchableOpacity
            onPress={handleGenerateReceipt}
            activeOpacity={0.85}
            className="bg-blue-900 mx-4 mt-4 mb-8 py-4 rounded-2xl items-center flex-row justify-center shadow-lg active:bg-blue-800"
          >
            <Ionicons name="receipt" size={22} color="#f59e0b" />
            <Text className="text-white text-base font-extrabold ml-2">
              Generate & Print Receipt ({formatCurrency(grandTotal)})
            </Text>
          </TouchableOpacity>
        )}

        <View className="h-6" />
      </ScrollView>

      {/* Modal for Quick Material Lookup */}
      <MaterialLookupModal
        visible={lookupVisible}
        onClose={() => setLookupVisible(false)}
        products={allProducts}
        onSelectProduct={handleSelectProduct}
      />

      {/* Modal for Editing a Draft Item */}
      <Modal visible={editingIndex !== null} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center px-4">
          <View className="bg-white rounded-2xl p-5 shadow-xl">
            <View className="flex-row justify-between items-center mb-3">
              <Text className="text-gray-900 text-base font-extrabold">
                Edit Item
              </Text>
              <TouchableOpacity onPress={() => setEditingIndex(null)}>
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 text-xs font-semibold mb-1">
              Material Name
            </Text>
            <TextInput
              value={editItemName}
              onChangeText={setEditItemName}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm mb-3"
            />

            <View className="flex-row mb-3">
              <View className="flex-1 mr-2">
                <Text className="text-gray-600 text-xs font-semibold mb-1">
                  Unit Price (GH₵)
                </Text>
                <TextInput
                  value={editUnitPrice}
                  onChangeText={setEditUnitPrice}
                  keyboardType="decimal-pad"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm"
                />
              </View>
              <View className="w-28">
                <Text className="text-gray-600 text-xs font-semibold mb-1">
                  Quantity
                </Text>
                <TextInput
                  value={editQuantity}
                  onChangeText={setEditQuantity}
                  keyboardType="decimal-pad"
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 text-sm font-bold text-blue-900"
                />
              </View>
            </View>

            <Text className="text-gray-600 text-xs font-semibold mb-1.5">
              Unit Type
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setEditCategory(cat)}
                  className={`px-3 py-1 rounded-full mr-2 ${
                    editCategory === cat ? 'bg-blue-900' : 'bg-gray-100'
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      editCategory === cat ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => {
                  if (editingIndex !== null) {
                    handleRemoveItem(editingIndex);
                    setEditingIndex(null);
                  }
                }}
                className="bg-red-50 py-3 px-4 rounded-xl mr-2"
              >
                <Ionicons name="trash" size={18} color="#ef4444" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveEdit}
                className="flex-1 bg-blue-900 py-3 rounded-xl items-center"
              >
                <Text className="text-white font-bold text-sm">
                  Save Changes
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
