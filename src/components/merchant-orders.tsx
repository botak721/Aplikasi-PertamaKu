import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/lib/supabase';

type Item = { nama: string; jumlah: number; harga: number };
type Order = {
  id: string;
  alamat: string;
  total: number;
  status: string;
  created_at: string;
  order_items: Item[];
};

const STATUS_LABEL: Record<string, string> = {
  baru: 'Pesanan baru',
  diproses: 'Sedang disiapkan',
  siap: 'Siap, menunggu driver',
  diantar: 'Sedang diantar',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

function rupiah(n: number) {
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function MerchantOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, alamat, total, status, created_at, order_items(nama, jumlah, harga)')
      .order('created_at', { ascending: false });
    if (error) {
      if (!silent) Alert.alert('Gagal memuat pesanan', error.message);
    } else {
      setOrders((data ?? []) as Order[]);
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
  }, [load]);

  async function ubahStatus(id: string, status: string) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (error) Alert.alert('Gagal mengubah status', error.message);
    else load(true);
  }

  function tolak(id: string) {
    Alert.alert('Tolak pesanan?', 'Pesanan akan dibatalkan.', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Tolak', style: 'destructive', onPress: () => ubahStatus(id, 'dibatalkan') },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Pesanan Masuk</Text>
          <Text style={styles.subtitle}>Diperbarui otomatis tiap 10 detik</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logout}>Keluar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        refreshing={refreshing}
        onRefresh={() => load()}
        ListEmptyComponent={<Text style={styles.empty}>Belum ada pesanan masuk.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.status}>{STATUS_LABEL[item.status] ?? item.status}</Text>
            {item.order_items.map((it, i) => (
              <Text key={i} style={styles.line}>
                {it.jumlah}x {it.nama}
              </Text>
            ))}
            <Text style={styles.total}>{rupiah(item.total)}</Text>
            <Text style={styles.meta}>Antar ke: {item.alamat}</Text>
            <Text style={styles.meta}>{new Date(item.created_at).toLocaleString('id-ID')}</Text>

            {item.status === 'baru' && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGreen]}
                  onPress={() => ubahStatus(item.id, 'diproses')}>
                  <Text style={styles.btnText}>Terima</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnRed]} onPress={() => tolak(item.id)}>
                  <Text style={styles.btnText}>Tolak</Text>
                </TouchableOpacity>
              </View>
            )}
            {item.status === 'diproses' && (
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, styles.btnGreen]}
                  onPress={() => ubahStatus(item.id, 'siap')}>
                  <Text style={styles.btnText}>Tandai Siap Diantar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 13, color: '#666' },
  logout: { color: '#d00', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#777', marginTop: 24 },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  status: { fontSize: 14, fontWeight: '700', color: '#c60', marginBottom: 6 },
  line: { fontSize: 15, color: '#111' },
  total: { fontSize: 15, fontWeight: '700', color: '#00AA13', marginTop: 6 },
  meta: { fontSize: 13, color: '#666', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  btn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center' },
  btnGreen: { backgroundColor: '#00AA13' },
  btnRed: { backgroundColor: '#d00' },
  btnText: { color: '#fff', fontWeight: '700' },
});