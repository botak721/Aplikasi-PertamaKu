import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MerchantMenu } from '@/components/merchant-menu';
import { MerchantOrders } from '@/components/merchant-orders';

export function MerchantHome({ userId, nama }: { userId: string; nama: string }) {
  const [tab, setTab] = useState<'pesanan' | 'menu'>('pesanan');

  return (
    <View style={styles.flex}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'pesanan' && styles.tabActive]}
          onPress={() => setTab('pesanan')}>
          <Text style={[styles.tabText, tab === 'pesanan' && styles.tabTextActive]}>
            Pesanan Masuk
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'menu' && styles.tabActive]}
          onPress={() => setTab('menu')}>
          <Text style={[styles.tabText, tab === 'menu' && styles.tabTextActive]}>Kelola Menu</Text>
        </TouchableOpacity>
      </View>
      {tab === 'pesanan' ? <MerchantOrders /> : <MerchantMenu userId={userId} nama={nama} />}
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