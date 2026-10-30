import { useEffect, useState } from 'react';
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

type Voucher = {
  id: string;
  kode: string;
  nama: string;
  tipe: 'persen' | 'nominal';
  nilai: number;
  min_belanja: number;
  maks_diskon: number | null;
  berlaku_sampai: string;
  kuota: number | null;
  dipakai: number;
};

function rupiah(n: number) {
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function PromoScreen({
  onBack,
  kode,
  onPakai,
}: {
  onBack: () => void;
  kode: string;
  onPakai: (kode: string) => void;
}) {
  const [list, setList] = useState<Voucher[]>([]);
  const [terpakai, setTerpakai] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [cek, setCek] = useState(false);

  useEffect(() => {
    (async () => {
      const [v, u] = await Promise.all([
        supabase
          .from('vouchers')
          .select('id, kode, nama, tipe, nilai, min_belanja, maks_diskon, berlaku_sampai, kuota, dipakai')
          .order('berlaku_sampai', { ascending: true }),
        supabase.from('voucher_usages').select('voucher_id'),
      ]);
      if (v.error || u.error) {
        notify('Gagal memuat promo', (v.error ?? u.error)!.message);
      } else {
        setList((v.data ?? []) as Voucher[]);
        setTerpakai(new Set(((u.data ?? []) as { voucher_id: string }[]).map((x) => x.voucher_id)));
      }
      setLoading(false);
    })();
  }, []);

  async function pakaiManual() {
    const k = input.trim().toUpperCase();
    if (!k) {
      notify('Kode kosong', 'Ketik kode promo dulu.');
      return;
    }
    setCek(true);
    const { data, error } = await supabase.rpc('cek_voucher', { p_kode: k });
    setCek(false);
    if (error) {
      notify('Kode tidak bisa dipakai', error.message);
      return;
    }
    const d = data as { kode: string; nama: string };
    onPakai(d.kode);
    setInput('');
    notify('Promo dipakai', `${d.nama} akan diterapkan di pesananmu.`);
  }

  function pakai(v: Voucher) {
    onPakai(v.kode);
    notify('Promo dipakai', `${v.nama} akan diterapkan di pesananmu.`);
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityLabel="Kembali">
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Promo & Voucher</Text>
        </View>
        <View style={styles.codeRow}>
          <TextInput
            style={styles.codeInput}
            placeholder="Kode promo"
            placeholderTextColor={C.muted}
            autoCapitalize="characters"
            value={input}
            onChangeText={setInput}
          />
          <TouchableOpacity style={styles.codeBtn} onPress={pakaiManual} disabled={cek}>
            {cek ? <ActivityIndicator color="#fff" /> : <Text style={styles.codeBtnText}>Pakai</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={C.primary} />
      ) : (
        <FlatList
          style={styles.flex}
          contentContainerStyle={styles.body}
          data={list}
          keyExtractor={(v) => v.id}
          ListHeaderComponent={<Text style={styles.section}>Khusus mahasiswa</Text>}
          ListEmptyComponent={<Text style={styles.empty}>Belum ada promo yang berlaku.</Text>}
          renderItem={({ item }) => {
            const sudah = terpakai.has(item.id);
            const habis = item.kuota != null && item.dipakai >= item.kuota;
            const dipilih = kode.toUpperCase() === item.kode.toUpperCase();
            const mati = sudah || habis;
            return (
              <View style={[styles.card, mati && styles.cardOff]}>
                <View style={styles.big}>
                  <Text style={styles.bigNum}>
                    {item.tipe === 'persen' ? `${item.nilai}%` : rupiah(item.nilai)}
                  </Text>
                  <Text style={styles.bigLabel}>DISKON</Text>
                </View>
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{item.nama}</Text>
                  <Text style={styles.muted}>
                    Berlaku sampai{' '}
                    {new Date(item.berlaku_sampai).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.muted}>
                    {item.min_belanja > 0 ? `Min. belanja ${rupiah(item.min_belanja)}` : 'Tanpa minimal belanja'}
                    {item.maks_diskon ? ` · maks. ${rupiah(item.maks_diskon)}` : ''}
                  </Text>
                  <Text style={styles.kode}>Kode: {item.kode}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.useBtn, (mati || dipilih) && styles.useBtnOff]}
                  disabled={mati || dipilih}
                  onPress={() => pakai(item)}>
                  <Text style={styles.useText}>
                    {sudah ? 'Terpakai' : habis ? 'Habis' : dipilih ? 'Dipakai ✓' : 'Pakai'}
                  </Text>
                </TouchableOpacity>
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
  codeRow: { flexDirection: 'row', gap: 8 },
  codeInput: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    fontFamily: F.semi,
    fontSize: 15,
    color: C.navy,
  },
  codeBtn: {
    minHeight: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: C.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  codeBtnText: { fontFamily: F.xbold, fontSize: 15, color: C.navy },
  body: { padding: 22, gap: 12 },
  section: { fontFamily: F.xbold, fontSize: 18, color: C.navy, marginBottom: 6 },
  empty: { fontFamily: F.reg, textAlign: 'center', color: C.muted, marginTop: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE5F7',
  },
  cardOff: { opacity: 0.55 },
  big: {
    width: 78,
    minHeight: 78,
    borderRadius: 14,
    backgroundColor: C.soft,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  bigNum: { fontFamily: F.xbold, fontSize: 16, color: C.primary, textAlign: 'center' },
  bigLabel: { fontFamily: F.bold, fontSize: 10, color: C.primary },
  cardTitle: { fontFamily: F.xbold, fontSize: 15, color: C.navy },
  muted: { fontFamily: F.reg, fontSize: 12, color: C.muted, marginTop: 2 },
  kode: { fontFamily: F.bold, fontSize: 12, color: C.navy, marginTop: 4 },
  useBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  useBtnOff: { backgroundColor: C.muted },
  useText: { fontFamily: F.xbold, fontSize: 13, color: '#fff' },
});