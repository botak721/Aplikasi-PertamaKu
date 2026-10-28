import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MerchantMenu } from '@/components/merchant-menu';
import { MerchantOrders } from '@/components/merchant-orders';
import { MerchantLocation } from '@/components/merchant-location';

type Tab = 'pesanan' | 'menu' | 'lokasi';
const TABS: { key: Tab; label: string }[] = [
  { key: 'pesanan', label: 'Pesanan' },
  { key: 'menu', label: 'Menu' },
  { key: 'lokasi', label: 'Lokasi' },
];

export function MerchantHome({ userId, nama }: { userId: string; nama: string }) {
  const [tab, setTab] = useState<Tab>('pesanan');

  return (
    <View style={styles.flex}>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}>
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'pesanan' && <MerchantOrders />}
      {tab === 'menu' && <MerchantMenu userId={userId} nama={nama} />}
      {tab === 'lokasi' && <MerchantLocation userId={userId} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  tab: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#00AA13', borderColor: '#00AA13' },
  tabText: { color: '#333', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
});