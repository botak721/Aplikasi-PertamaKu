import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';

type Merchant = { id: string; nama: string | null };
type MenuItem = { id: string; nama: string; harga: number };
type Order = {
  id: string;
  merchant_nama: string | null;
  total: number;
  status: string;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  baru: 'Menunggu penjual',
  diproses: 'Sedang disiapkan',
  siap: 'Siap diantar',
  diantar: 'Sedang diantar',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

function rupiah(n: number) {
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function MerchantList({ onPick }: { onPick: (m: Merchant) => void }) {
  const [list, setList] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, nama')
      .eq('role', 'merchant')
      .then(({ data, error }) => {
        if (error) Alert.alert('Gagal memuat penjual', error.message);
        else setList((data ?? []) as Merchant[]);
        setLoading(false);
      });
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} color="#00AA13" />;

  return (
    <FlatList
      data={list}
      keyExtractor={(m) => m.id}
      ListEmptyComponent={<Text style={styles.empty}>Belum ada penjual terdaftar.</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => onPick(item)}>
          <Text style={styles.cardTitle}>{item.nama ?? 'Penjual'}</Text>
          <Text style={styles.cardSub}>Lihat menu</Text>
        </TouchableOpacity>
      )}
    />
  );
}

function MenuView({
  userId,
  merchant,
  onBack,
  onOrdered,
}: {
  userId: string;
  merchant: Merchant;
  onBack: () => void;
  onOrdered: () => void;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [alamat, setAlamat] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('id, nama, harga')
      .eq('merchant_id', merchant.id)
      .eq('tersedia', true)
      .order('nama')
      .then(({ data, error }) => {
        if (error) Alert.alert('Gagal memuat menu', error.message);
        else setItems((data ?? []) as MenuItem[]);
        setLoading(false);
      });
  }, [merchant.id]);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.harga * (cart[it.id] ?? 0), 0),
    [items, cart]
  );
  const jumlahItem = Object.values(cart).reduce((a, b) => a + b, 0);

  function ubah(id: string, delta: number) {
    setCart((c) => {
      const next = Math.max(0, (c[id] ?? 0) + delta);
      const copy = { ...c };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  async function pesan() {
    if (jumlahItem === 0) {
      Alert.alert('Keranjang kosong', 'Pilih menu dulu ya.');
      return;
    }
    if (!alamat.trim()) {
      Alert.alert('Alamat kosong', 'Isi alamat antar dulu.');
      return;
    }
    setSending(true);
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        customer_id: userId,
        merchant_id: merchant.id,
        merchant_nama: merchant.nama,
        alamat: alamat.trim(),
        total,
      })
      .select('id')
      .single();

    if (error || !order) {
      setSending(false);
      Alert.alert('Gagal membuat pesanan', error?.message ?? 'Coba lagi.');
      return;
    }

    const rows = items
      .filter((it) => cart[it.id])
      .map((it) => ({
        order_id: order.id,
        nama: it.nama,
        harga: it.harga,
        jumlah: cart[it.id],
      }));
    const { error: itemError } = await supabase.from('order_items').insert(rows);
    setSending(false);

    if (itemError) {
      Alert.alert('Gagal menyimpan item', itemError.message);
      return;
    }
    Alert.alert('Pesanan terkirim!', 'Penjual akan segera memprosesnya.');
    onOrdered();
  }

  return (
    <View style={styles.flex}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>‹ Kembali</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{merchant.nama ?? 'Penjual'}</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#00AA13" />
      ) : (
        <FlatList
          style={styles.flex}
          data={items}
          keyExtractor={(it) => it.id}
          ListEmptyComponent={<Text style={styles.empty}>Belum ada menu tersedia.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{item.nama}</Text>
                <Text style={styles.price}>{rupiah(item.harga)}</Text>
              </View>
              <View style={styles.qtyBox}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => ubah(item.id, -1)}>
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qty}>{cart[item.id] ?? 0}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => ubah(item.id, 1)}>
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <View style={styles.checkout}>
        <TextInput
          style={styles.input}
          placeholder="Alamat antar"
          placeholderTextColor="#888"
          value={alamat}
          onChangeText={setAlamat}
        />
        <TouchableOpacity style={styles.primaryBtn} onPress={pesan} disabled={sending}>
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              Pesan ({jumlahItem} item) • {rupiah(total)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function OrdersView({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    const { data, error } = await supabase
      .from('orders')
      .select('id, merchant_nama, total, status, created_at')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });
    if (error) Alert.alert('Gagal memuat pesanan', error.message);
    else setOrders((data ?? []) as Order[]);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.id}
      refreshing={refreshing}
      onRefresh={load}
      ListEmptyComponent={<Text style={styles.empty}>Belum ada pesanan.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{item.merchant_nama ?? 'Penjual'}</Text>
          <Text style={styles.price}>{rupiah(item.total)}</Text>
          <Text style={styles.status}>{STATUS_LABEL[item.status] ?? item.status}</Text>
          <Text style={styles.cardSub}>
            {new Date(item.created_at).toLocaleString('id-ID')}
          </Text>
        </View>
      )}
    />
  );
}

export function CustomerHome({ userId, nama }: { userId: string; nama: string }) {
  const [tab, setTab] = useState<'cari' | 'pesanan'>('cari');
  const [merchant, setMerchant] = useState<Merchant | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Halo, {nama}!</Text>
          <Text style={styles.cardSub}>Mau makan apa hari ini?</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logout}>Keluar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'cari' && styles.tabActive]}
          onPress={() => {
            setTab('cari');
            setMerchant(null);
          }}>
          <Text style={[styles.tabText, tab === 'cari' && styles.tabTextActive]}>Cari Makanan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'pesanan' && styles.tabActive]}
          onPress={() => setTab('pesanan')}>
          <Text style={[styles.tabText, tab === 'pesanan' && styles.tabTextActive]}>
            Pesanan Saya
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'pesanan' ? (
        <OrdersView userId={userId} />
      ) : merchant ? (
        <MenuView
          userId={userId}
          merchant={merchant}
          onBack={() => setMerchant(null)}
          onOrdered={() => {
            setMerchant(null);
            setTab('pesanan');
          }}
        />
      ) : (
        <MerchantList onPick={setMerchant} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111' },
  logout: { color: '#d00', fontWeight: '600' },
  back: { color: '#00AA13', fontSize: 16, marginBottom: 8 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
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
  empty: { textAlign: 'center', color: '#777', marginTop: 24 },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111' },
  cardSub: { fontSize: 13, color: '#666', marginTop: 2 },
  price: { fontSize: 14, color: '#00AA13', marginTop: 2 },
  status: { fontSize: 14, fontWeight: '600', color: '#c60', marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  qtyBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00AA13',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },
  qty: { fontSize: 16, fontWeight: '600', minWidth: 20, textAlign: 'center', color: '#111' },
  checkout: { gap: 8, paddingTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  primaryBtn: { backgroundColor: '#00AA13', padding: 14, borderRadius: 10, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});