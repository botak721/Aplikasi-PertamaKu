import { useCallback, useEffect, useState } from 'react';
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

type Titipan = {
  id: string;
  requester_id: string;
  requester_nama: string | null;
  helper_id: string | null;
  helper_nama: string | null;
  barang: string;
  estimasi_harga: number;
  upah: number;
  lokasi: string;
  status: string;
  created_at: string;
};

const COLS =
  'id, requester_id, requester_nama, helper_id, helper_nama, barang, estimasi_harga, upah, lokasi, status, created_at';

const STATUS_LABEL: Record<string, string> = {
  terbuka: 'Menunggu teman yang membantu',
  diambil: 'Sedang dibelikan',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

function rupiah(n: number) {
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function TitipBeli({ userId }: { userId: string }) {
  const [tab, setTab] = useState<'minta' | 'bantu'>('minta');
  const [list, setList] = useState<Titipan[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [barang, setBarang] = useState('');
  const [estimasi, setEstimasi] = useState('');
  const [upah, setUpah] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      const base = supabase
        .from('titip_requests')
        .select(COLS)
        .order('created_at', { ascending: false });
      const { data, error } =
        tab === 'minta'
          ? await base.eq('requester_id', userId)
          : await base.or(
              `and(status.eq.terbuka,requester_id.neq.${userId}),helper_id.eq.${userId}`
            );
      if (error) {
        if (!silent) Alert.alert('Gagal memuat', error.message);
      } else {
        setList((data ?? []) as Titipan[]);
      }
      setRefreshing(false);
    },
    [tab, userId]
  );

  useEffect(() => {
    setList([]);
    load();
    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
  }, [load]);

  async function kirim() {
    const hargaAngka = parseInt(estimasi.replace(/\D/g, ''), 10);
    const upahAngka = parseInt(upah.replace(/\D/g, ''), 10);
    if (barang.trim().length < 3 || lokasi.trim().length < 2) {
      Alert.alert('Data belum lengkap', 'Isi barang dan lokasi antar.');
      return;
    }
    if (isNaN(hargaAngka) || isNaN(upahAngka)) {
      Alert.alert('Angka belum benar', 'Isi estimasi harga dan upah dengan angka.');
      return;
    }
    setSending(true);
    const { error } = await supabase.rpc('buat_titipan', {
      p_barang: barang.trim(),
      p_estimasi: hargaAngka,
      p_upah: upahAngka,
      p_lokasi: lokasi.trim(),
    });
    setSending(false);
    if (error) {
      Alert.alert('Gagal mengirim', error.message);
      return;
    }
    setBarang('');
    setEstimasi('');
    setUpah('');
    setLokasi('');
    load(true);
    Alert.alert('Terkirim', 'Permintaanmu sudah bisa dilihat teman-teman.');
  }

  async function jalankan(fn: string, id: string) {
    const { error } = await supabase.rpc(fn, { p_id: id });
    if (error) Alert.alert('Gagal', error.message);
    load(true);
  }

  function konfirmasi(judul: string, pesan: string, fn: string, id: string) {
    Alert.alert(judul, pesan, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Ya', onPress: () => jalankan(fn, id) },
    ]);
  }

  const form = (
    <View style={styles.form}>
      <Text style={styles.formTitle}>Minta tolong dibelikan</Text>
      <TextInput
        style={[styles.input, styles.inputTall]}
        placeholder="Barang yang dititip (contoh: materai 10000 x2, pulpen hitam)"
        placeholderTextColor="#5B6785"
        multiline
        value={barang}
        onChangeText={setBarang}
      />
      <TextInput
        style={styles.input}
        placeholder="Perkiraan harga barang (contoh: 25000)"
        placeholderTextColor="#5B6785"
        keyboardType="numeric"
        value={estimasi}
        onChangeText={setEstimasi}
      />
      <TextInput
        style={styles.input}
        placeholder="Upah untuk yang membantu (contoh: 5000)"
        placeholderTextColor="#5B6785"
        keyboardType="numeric"
        value={upah}
        onChangeText={setUpah}
      />
      <TextInput
        style={styles.input}
        placeholder="Antar ke gedung / ruang"
        placeholderTextColor="#5B6785"
        value={lokasi}
        onChangeText={setLokasi}
      />
      <TouchableOpacity style={styles.primaryBtn} onPress={kirim} disabled={sending}>
        {sending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Kirim Permintaan</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.notice}>
        Bayar tunai langsung ke teman yang membantu: harga barang sebenarnya ditambah upah.
        Jangan menitip barang terlarang.
      </Text>
      <Text style={styles.formTitle}>Permintaan saya</Text>
    </View>
  );

  return (
    <View style={styles.flex}>
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'minta' && styles.tabActive]}
          onPress={() => setTab('minta')}>
          <Text style={[styles.tabText, tab === 'minta' && styles.tabTextActive]}>
            Minta Tolong
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'bantu' && styles.tabActive]}
          onPress={() => setTab('bantu')}>
          <Text style={[styles.tabText, tab === 'bantu' && styles.tabTextActive]}>
            Bantu Teman
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(t) => t.id}
        refreshing={refreshing}
        onRefresh={() => load()}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={tab === 'minta' ? form : undefined}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === 'minta'
              ? 'Belum ada permintaan.'
              : 'Belum ada permintaan teman yang bisa kamu bantu.'}
          </Text>
        }
        renderItem={({ item }) => {
          const punyaSaya = item.requester_id === userId;
          return (
            <View style={styles.card}>
              <Text style={styles.status}>{STATUS_LABEL[item.status] ?? item.status}</Text>
              {!punyaSaya && (
                <Text style={styles.meta}>Dari: {item.requester_nama ?? 'Teman'}</Text>
              )}
              <Text style={styles.barang}>{item.barang}</Text>
              <Text style={styles.meta}>
                Estimasi harga barang: {rupiah(item.estimasi_harga)}
              </Text>
              <Text style={styles.upah}>Upah: {rupiah(item.upah)}</Text>
              <Text style={styles.meta}>Antar ke: {item.lokasi}</Text>
              {punyaSaya && item.helper_nama && (
                <Text style={styles.meta}>Dibantu oleh: {item.helper_nama}</Text>
              )}
              <Text style={styles.meta}>
                {new Date(item.created_at).toLocaleString('id-ID')}
              </Text>

              {punyaSaya && item.status === 'terbuka' && (
                <TouchableOpacity
                  style={styles.dangerBtn}
                  onPress={() =>
                    konfirmasi('Batalkan permintaan?', item.barang, 'batal_titipan', item.id)
                  }>
                  <Text style={styles.dangerText}>Batalkan</Text>
                </TouchableOpacity>
              )}
              {punyaSaya && item.status === 'diambil' && (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() =>
                    konfirmasi(
                      'Barang sudah diterima?',
                      'Pastikan kamu sudah menerima barang dan membayar temanmu.',
                      'selesai_titipan',
                      item.id
                    )
                  }>
                  <Text style={styles.primaryText}>Barang sudah diterima</Text>
                </TouchableOpacity>
              )}
              {!punyaSaya && item.status === 'terbuka' && (
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() =>
                    konfirmasi(
                      'Bantu belikan?',
                      'Kamu akan membeli barang ini dan mengantarnya ke lokasi tujuan.',
                      'ambil_titipan',
                      item.id
                    )
                  }>
                  <Text style={styles.primaryText}>Saya bantu belikan</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C9D6F5',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#2547D0', borderColor: '#2547D0' },
  tabText: { color: '#0E1B5C', fontFamily: 'PlusJakartaSans_600SemiBold' },
  tabTextActive: { color: '#fff' },
  form: { gap: 8, marginBottom: 8 },
  formTitle: { fontSize: 18, fontFamily: 'PlusJakartaSans_700Bold', color: '#0E1B5C', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#C9D6F5',
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    color: '#0E1B5C',
    backgroundColor: '#FFFFFF',
  },
  inputTall: { minHeight: 70, textAlignVertical: 'top' },
  notice: { fontSize: 12, color: '#5B6785' },
  empty: { textAlign: 'center', color: '#5B6785', marginTop: 24 },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDE5F7',
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  status: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#c60', marginBottom: 6 },
  barang: { fontSize: 16, fontFamily: 'PlusJakartaSans_600SemiBold', color: '#0E1B5C', marginBottom: 4 },
  meta: { fontSize: 13, color: '#5B6785', marginTop: 2 },
  upah: { fontSize: 14, fontFamily: 'PlusJakartaSans_700Bold', color: '#2547D0', marginTop: 2 },
  primaryBtn: {
    backgroundColor: '#2547D0',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryText: { color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 },
  dangerBtn: {
    borderWidth: 1,
    borderColor: '#D92D20',
    padding: 10,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  dangerText: { color: '#D92D20', fontFamily: 'PlusJakartaSans_700Bold' },
});