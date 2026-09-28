import '../global.css';
import React, { useEffect, useState } from 'react';
import { View, Image, ActivityIndicator, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { initializeDatabase } from '../src/database/db';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeDatabase();
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#021235',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
        }}
      >
        <StatusBar style="light" />
        <Image
          source={require('../assets/welcome-logo.png')}
          style={{ width: 260, height: 260, borderRadius: 24, marginBottom: 24 }}
          resizeMode="contain"
        />
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text
          style={{
            color: '#ffffff',
            fontWeight: '900',
            fontSize: 18,
            marginTop: 18,
            letterSpacing: 0.8,
          }}
        >
          KING GEORGE ENTERPRISE
        </Text>
        <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '700', marginTop: 4 }}>
          Juaben Adumasa, Ashanti Region
        </Text>
        <Text style={{ color: '#93c5fd', fontSize: 11, marginTop: 4 }}>
          Loading shop inventory & database...
        </Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#021235',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#f3f4f6',
            paddingBottom: 6,
            paddingTop: 6,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '700',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'New Sale',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="inventory"
          options={{
            title: 'Inventory',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="cube" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="debtors"
          options={{
            title: 'Debtors',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account-cash" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="storage"
          options={{
            title: 'Stored',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="package-variant" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="stats-chart" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="stock"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="receipt/[id]"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </>
  );
}
