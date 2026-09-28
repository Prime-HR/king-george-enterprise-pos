import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function Header() {
  return (
    <View className="bg-[#021235] px-4 pt-12 pb-4 shadow-md">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 items-center justify-center mr-3">
            <MaterialCommunityIcons name="crown" size={24} color="#f59e0b" />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-white text-base font-black tracking-wide">
                KING GEORGE
              </Text>
              <View className="bg-amber-400 px-1.5 py-0.5 rounded ml-1.5">
                <Text className="text-blue-950 font-black text-[9px] uppercase">Enterprise</Text>
              </View>
            </View>
            <Text className="text-amber-400 text-xs font-semibold">
              General Merchant & Provisions Depot
            </Text>
          </View>
        </View>

        <View className="items-end bg-white/10 px-2.5 py-1.5 rounded-xl border border-white/10">
          <View className="flex-row items-center">
            <Ionicons name="location" size={11} color="#38bdf8" />
            <Text className="text-sky-300 text-[10px] font-bold ml-0.5">Juaben Adumasa</Text>
          </View>
          <Text className="text-amber-300 text-[10px] font-semibold mt-0.5">📞 0548809611</Text>
        </View>
      </View>
    </View>
  );
}
