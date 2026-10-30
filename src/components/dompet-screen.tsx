import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { C, F } from '@/constants/kampusgo';

type Tx = {
  id: string;
  tipe: 'topup' | 'bayar' | 'refund';
  jumlah: number;
  keterangan: string;
  created_at: string;
};

const PRESET = [20000, 50000, 100000, 200000];

function rupiah(n: number) {
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function DompetScreen({ onBack }: { onBack: () => void }) {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [tx, setTx] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(false);
  const [jumlah, setJumlah] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([
      supabase.rpc('saldo_saya'),
      supabase
        .from('wallet_tx')
        .select('id, tipe, jumlah, keterangan, created_at')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);
    if (s.error || t.error) {
      notify('Gagal memuat dompet', (s.error ?? t.error)!.message);
    } else {
      setSaldo(s.data as number);
      setTx((t.data ?? []) as Tx[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function isi() {
    const n = parseInt(jumlah.replace(/\D/g, ''), 10);
    if (isNaN(n)) {
      notify('Jumlah belum diisi', 'Pilih nominal atau ketik jumlahnya.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('isi_saldo_simulasi', { p_jumlah: n });
    setBusy(false);
    if (error) {
      notify('Gagal isi saldo', error.message);
      return;
    }
    setJumlah('');
    setPanel(false);
    notify('Saldo bertambah', `${rupiah(n)} masuk ke dompetmu (simulasi).`);
    load();
  }

  const aksi = [
    { icon: '➕', label: 'Isi saldo', onPress: () => setPanel(!panel) },
    {
      icon: '💳',
      label: 'Bayar',
      onPress: () =>
        notify('Bayar dengan saldo', 'Pilih "Saldo" saat memesan di Titip Kantin untuk membayar.'),
    },
    { icon: '🕘', label: 'Riwayat', onPress: load },
  ];

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityLabel="Kembali">
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Dompet</Text>
        </View>
        <View>
          <Text style={styles.saldoLabel}>Saldo KampusGo</Text>
          <Text style={styles.saldo}>{saldo == null ? 'Rp --.---' : rupiah(saldo)}</Text>
        </View>
        <View style={styles.aksiRow}>
          {aksi.map((a) => (
            <TouchableOpacity key={a.label} style={styles.aksi} onPress={a.onPress}>
              <View style={styles.aksiIcon}>
                <Text style={styles.aksiEmoji}>{a.icon}</Text>
              </View>
              <Text style={styles.aksiLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={C.primary} />
      ) : (
        <FlatList
          style={styles.flex}
          contentContainerStyle={styles.body}
          data={tx}
          keyExtractor={(x) => x.id}
          ListHeaderComponent={
            <View style={{ gap: 14 }}>
              {panel && (
                <View style={styles.panel}>
                  <Text style={styles.panelTitle}>Isi saldo (simulasi)</Text>
                  <Text style={styles.muted}>
                    Ini mode belajar: tidak ada uang sungguhan yang dipakai.
                  </Text>
                  <View style={styles.presetRow}>
                    {PRESET.map((p) => (
                      <TouchableOpacity
                        key={p}
                        style={[styles.preset, jumlah === String(p) && styles.presetOn]}
                        onPress={() => setJumlah(String(p))}>
                        <Text style={jumlah === String(p) ? styles.presetTextOn : styles.presetText}>
                          {rupiah(p)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Atau ketik jumlah (10.000 - 500.000)"
                    placeholderTextColor={C.muted}
                    keyboardType="numeric"
                    value={jumlah}
                    onChangeText={setJumlah}
                  />
                  <TouchableOpacity style={styles.primaryBtn} onPress={isi} disabled={busy}>
                    {busy ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryText}>Isi saldo</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.section}>Riwayat transaksi</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>Belum ada transaksi.</Text>}
          renderItem={({ item }) => {
            const masuk = item.jumlah > 0;
            return (
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>{item.keterangan}</Text>
                  <Text style={styles.muted}>
                    {new Date(item.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Text style={[styles.amount, masuk ? styles.plus : styles.minus]}>
                  {masuk ? '+' : '−'} {rupiah(Math.abs(item.jumlah))}
                </Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    backgroundColor: C.primary,
    paddingTop: 24,
    paddingBottom: 22,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#fff', fontSize: 28, fontFamily: F.bold, lineHeight: 32 },
  title: { fontFamily: F.xbold, fontSize: 24, color: '#fff' },
  saldoLabel: { fontFamily: F.reg, fontSize: 13, color: '#fff', opacity: 0.9 },
  saldo: { fontFamily: F.xbold, fontSize: 32, color: '#fff' },
  aksiRow: { flexDirection: 'row', gap: 10 },
  aksi: { flex: 1, alignItems: 'center', gap: 6 },
  aksiIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aksiEmoji: { fontSize: 22 },
  aksiLabel: { fontFamily: F.semi, fontSize: 13, color: '#fff' },
  body: { padding: 22, gap: 0 },
  section: { fontFamily: F.xbold, fontSize: 16, color: C.navy },
  empty: { fontFamily: F.reg, textAlign: 'center', color: C.muted, marginTop: 16 },
  muted: { fontFamily: F.reg, fontSize: 13, color: C.muted },
  panel: {
    padding: 14,
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE5F7',
  },
  panelTitle: { fontFamily: F.xbold, fontSize: 16, color: C.navy },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  presetOn: { backgroundColor: C.primary, borderColor: C.primary },
  presetText: { fontFamily: F.semi, fontSize: 14, color: C.navy },
  presetTextOn: { fontFamily: F.xbold, fontSize: 14, color: '#fff' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: F.reg,
    fontSize: 15,
    color: C.navy,
    backgroundColor: '#fff',
  },
  primaryBtn: {
    minHeight: 52,
    backgroundColor: C.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: F.xbold, fontSize: 15, color: '#fff' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FB',
  },
  rowTitle: { fontFamily: F.xbold, fontSize: 15, color: C.navy },
  amount: { fontFamily: F.xbold, fontSize: 14 },
  plus: { color: C.primary },
  minus: { color: C.navy },
});