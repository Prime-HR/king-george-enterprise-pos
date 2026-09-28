import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { verifyAdminPin } from '../database/settings';

interface PinModalProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function PinModal({
  visible,
  title = 'Manager PIN Required',
  subtitle = 'Please enter the 4-digit manager PIN to proceed.',
  onSuccess,
  onClose,
}: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleKeyPress = (num: string) => {
    setError(false);
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      if (nextPin.length === 4) {
        if (verifyAdminPin(nextPin)) {
          setTimeout(() => {
            setPin('');
            setError(false);
            onSuccess();
          }, 150);
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setError(false);
    setPin(pin.slice(0, -1));
  };

  const handleClose = () => {
    setPin('');
    setError(false);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View className="flex-1 bg-black/60 items-center justify-center p-4">
        <View className="bg-white rounded-3xl w-full max-w-xs p-6 items-center shadow-2xl">
          {/* Lock Icon */}
          <View className={`w-14 h-14 rounded-full items-center justify-center mb-3 ${error ? 'bg-red-100' : 'bg-blue-100'}`}>
            <Ionicons
              name={error ? 'alert-circle' : 'lock-closed'}
              size={28}
              color={error ? '#dc2626' : '#1e3a8a'}
            />
          </View>

          <Text className="text-gray-900 font-extrabold text-lg text-center">{title}</Text>
          <Text className="text-gray-500 text-xs text-center mt-1 mb-5 px-2">{subtitle}</Text>

          {/* PIN Indicators */}
          <View className="flex-row justify-center space-x-3 mb-6">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <View
                  key={index}
                  className={`w-4 h-4 rounded-full mx-2 border ${
                    error
                      ? 'bg-red-500 border-red-500'
                      : isFilled
                      ? 'bg-blue-900 border-blue-900'
                      : 'bg-gray-100 border-gray-300'
                  }`}
                />
              );
            })}
          </View>

          {error && (
            <Text className="text-red-500 text-xs font-bold mb-3 -mt-2">
              Incorrect PIN. Default is 1234
            </Text>
          )}

          {/* Numeric Keypad */}
          <View className="w-full">
            <View className="flex-row justify-between mb-2.5">
              {['1', '2', '3'].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => handleKeyPress(n)}
                  className="w-16 h-14 rounded-2xl bg-gray-100 items-center justify-center active:bg-gray-200"
                >
                  <Text className="text-gray-800 text-xl font-bold">{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row justify-between mb-2.5">
              {['4', '5', '6'].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => handleKeyPress(n)}
                  className="w-16 h-14 rounded-2xl bg-gray-100 items-center justify-center active:bg-gray-200"
                >
                  <Text className="text-gray-800 text-xl font-bold">{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row justify-between mb-2.5">
              {['7', '8', '9'].map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => handleKeyPress(n)}
                  className="w-16 h-14 rounded-2xl bg-gray-100 items-center justify-center active:bg-gray-200"
                >
                  <Text className="text-gray-800 text-xl font-bold">{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row justify-between mb-3">
              <TouchableOpacity
                onPress={handleClose}
                className="w-16 h-14 rounded-2xl items-center justify-center"
              >
                <Text className="text-gray-400 text-xs font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleKeyPress('0')}
                className="w-16 h-14 rounded-2xl bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Text className="text-gray-800 text-xl font-bold">0</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDelete}
                className="w-16 h-14 rounded-2xl bg-gray-100 items-center justify-center active:bg-gray-200"
              >
                <Ionicons name="backspace" size={20} color="#4b5563" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
