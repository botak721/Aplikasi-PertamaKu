import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';

type MenuItem = { id: string; nama: string; harga: number; tersedia: boolean };

function rupiah(n: number) {
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function MerchantMenu({ userId, nama }: { userId: string; nama: string }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [namaMenu, setNamaMenu] = useState('');
  const [harga, setHarga] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, nama, harga, tersedia')
      .eq('merchant_id', userId)
      .order('created_at', { ascending: false });
    if (error) Alert.alert('Gagal memuat menu', error.message);
    else setItems((data ?? []) as MenuItem[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addItem() {
    const hargaAngka = parseInt(harga.replace(/\D/g, ''), 10);
    if (!namaMenu.trim() || isNaN(hargaAngka)) {
      Alert.alert('Data belum benar', 'Isi nama menu dan harga (angka).');
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('menu_items')
      .insert({ merchant_id: userId, nama: namaMenu.trim(), harga: hargaAngka });
    setSaving(false);
    if (error) {
      Alert.alert('Gagal menambah menu', error.message);
      return;
    }
    setNamaMenu('');
    setHarga('');
    load();
  }

  async function toggleItem(item: MenuItem, value: boolean) {
    const { error } = await supabase
      .from('menu_items')
      .update({ tersedia: value })
      .eq('id', item.id);
    if (error) Alert.alert('Gagal mengubah', error.message);
    else load();
  }

  function confirmDelete(item: MenuItem) {
    Alert.alert('Hapus menu?', item.nama, [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('menu_items').delete().eq('id', item.id);
          if (error) Alert.alert('Gagal menghapus', error.message);
          else load();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Menu {nama}</Text>
          <Text style={styles.subtitle}>Kelola menu jualanmu</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logout}>Keluar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nama menu (contoh: Nasi Goreng)"
          placeholderTextColor="#888"
          value={namaMenu}
          onChangeText={setNamaMenu}
        />
        <TextInput
          style={styles.input}
          placeholder="Harga (contoh: 15000)"
          placeholderTextColor="#888"
          keyboardType="numeric"
          value={harga}
          onChangeText={setHarga}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addItem} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addText}>Tambah Menu</Text>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#00AA13" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>Belum ada menu. Tambah dulu di atas.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.itemName}>{item.nama}</Text>
                <Text style={styles.itemPrice}>{rupiah(item.harga)}</Text>
                <TouchableOpacity onPress={() => confirmDelete(item)}>
                  <Text style={styles.delete}>Hapus</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.switchBox}>
                <Text style={styles.switchLabel}>{item.tersedia ? 'Tersedia' : 'Habis'}</Text>
                <Switch
                  value={item.tersedia}
                  onValueChange={(v) => toggleItem(item, v)}
                  trackColor={{ true: '#00AA13' }}
                />
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 14, color: '#555' },
  logout: { color: '#d00', fontWeight: '600' },
  form: { gap: 8, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#111',
    backgroundColor: '#fafafa',
  },
  addBtn: { backgroundColor: '#00AA13', padding: 14, borderRadius: 10, alignItems: 'center' },
  addText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  empty: { textAlign: 'center', color: '#777', marginTop: 24 },
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
  itemName: { fontSize: 16, fontWeight: '600', color: '#111' },
  itemPrice: { fontSize: 14, color: '#00AA13', marginTop: 2 },
  delete: { color: '#d00', marginTop: 6, fontSize: 13 },
  switchBox: { alignItems: 'center' },
  switchLabel: { fontSize: 12, color: '#555' },
});