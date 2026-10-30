import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { getCoords, jarakKm } from '@/lib/geo';
import { notify } from '@/lib/notify';
import { C, F } from '@/constants/kampusgo';

type Toko = {
  id: string;
  nama: string | null;
  lat: number | null;
  lng: number | null;
  alamat: string | null;
  menu: number;
};
type TokoJarak = Toko & { jarak: number | null };
type Kategori = 'semua' | 'kantin' | 'print' | 'ojek' | 'titip';

const KATEGORI: { key: Kategori; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'kantin', label: 'Kantin' },
  { key: 'print', label: 'Print' },
  { key: 'ojek', label: 'Ojek' },
  { key: 'titip', label: 'Titip Beli' },
];

export function CariScreen({
  onBack,
  onPick,
}: {
  onBack: () => void;
  onPick: (m: { id: string; nama: string | null }) => void;
}) {
  const [q, setQ] = useState('');
  const [kategori, setKategori] = useState<Kategori>('semua');
  const [urut, setUrut] = useState<'terdekat' | 'nama'>('terdekat');
  const [hanyaBuka, setHanyaBuka] = useState(false);
  const [toko, setToko] = useState<Toko[]>([]);
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      const [p, m] = await Promise.all([
        supabase.from('profiles').select('id, nama, lat, lng, alamat').eq('role', 'merchant'),
        supabase.from('menu_items').select('merchant_id').eq('tersedia', true),
      ]);
      if (p.error || m.error) {
        notify('Gagal memuat daftar toko', (p.error ?? m.error)!.message);
      } else {
        const hitung: Record<string, number> = {};
        ((m.data ?? []) as { merchant_id: string }[]).forEach((x) => {
          hitung[x.merchant_id] = (hitung[x.merchant_id] ?? 0) + 1;
        });
        setToko(
          ((p.data ?? []) as Omit<Toko, 'menu'>[]).map((t) => ({ ...t, menu: hitung[t.id] ?? 0 }))
        );
      }
      setLoading(false);
    })();
    getCoords().then((c) => c && setPos(c));
  }, []);

  const hasil = useMemo<TokoJarak[]>(() => {
    if (kategori !== 'semua' && kategori !== 'kantin') return [];
    const kata = q.trim().toLowerCase();
    let list: TokoJarak[] = toko
      .filter(
        (t) =>
          !kata ||
          (t.nama ?? '').toLowerCase().includes(kata) ||
          (t.alamat ?? '').toLowerCase().includes(kata)
      )
      .filter((t) => !hanyaBuka || t.menu > 0)
      .map((t) => ({
        ...t,
        jarak:
          pos && t.lat != null && t.lng != null
            ? parseFloat(jarakKm(pos.lat, pos.lng, t.lat, t.lng))
            : null,
      }));
    list = list.sort((a, b) => {
      if (urut === 'terdekat') {
        if (a.jarak == null && b.jarak == null) return (a.nama ?? '').localeCompare(b.nama ?? '');
        if (a.jarak == null) return 1;
        if (b.jarak == null) return -1;
        return a.jarak - b.jarak;
      }
      return (a.nama ?? '').localeCompare(b.nama ?? '');
    });
    return list;
  }, [toko, q, kategori, urut, hanyaBuka, pos]);

  const segera = kategori === 'print' || kategori === 'ojek' || kategori === 'titip';

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityLabel="Kembali">
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Cari</Text>
        </View>
        <View style={styles.search}>
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama kantin atau lokasi"
            placeholderTextColor={C.muted}
            value={q}
            onChangeText={setQ}
          />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillScroll}
        contentContainerStyle={styles.pillRow}>
        {KATEGORI.map((k) => (
          <TouchableOpacity
            key={k.key}
            style={[styles.pill, kategori === k.key && styles.pillOn]}
            onPress={() => setKategori(k.key)}>
            <Text style={kategori === k.key ? styles.pillTextOn : styles.pillText}>{k.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.toolbar}>
        <Text style={styles.count}>{segera ? '0' : hasil.length} hasil</Text>
        <View style={styles.toolbarBtns}>
          <TouchableOpacity
            style={styles.tool}
            onPress={() => setUrut(urut === 'terdekat' ? 'nama' : 'terdekat')}>
            <Text style={styles.toolText}>
              Urutkan: {urut === 'terdekat' ? 'Terdekat' : 'Nama'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tool, hanyaBuka && styles.toolOn]}
            onPress={() => setHanyaBuka(!hanyaBuka)}>
            <Text style={hanyaBuka ? styles.toolTextOn : styles.toolText}>
              {hanyaBuka ? 'Filter: Buka ✓' : 'Filter'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={C.primary} />
      ) : (
        <FlatList
          style={styles.flex}
          contentContainerStyle={styles.body}
          data={segera ? [] : hasil}
          keyExtractor={(t) => t.id}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {segera ? 'Layanan ini segera hadir.' : 'Tidak ada kantin yang cocok.'}
            </Text>
          }
          renderItem={({ item }) => {
            const buka = item.menu > 0;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => onPick({ id: item.id, nama: item.nama })}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.nama ?? 'Penjual'}
                  </Text>
                  <Text style={[styles.badge, !buka && styles.badgeOff]}>
                    {buka ? 'Buka' : 'Tutup'}
                  </Text>
                </View>
                <Text style={styles.muted}>
                  {item.jarak != null ? `${item.jarak.toFixed(1)} km` : 'Jarak belum diketahui'} ·{' '}
                  {item.menu} menu
                </Text>
                {!!item.alamat && <Text style={styles.muted}>{item.alamat}</Text>}
              </TouchableOpacity>
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
  search: {
    backgroundColor: '#fff',
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  searchInput: { fontFamily: F.reg, fontSize: 14, color: C.navy },
  pillScroll: { flexGrow: 0, marginTop: 14 },
  pillRow: { paddingHorizontal: 22, gap: 8 },
  pill: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  pillOn: { backgroundColor: C.primary, borderColor: C.primary },
  pillText: { fontFamily: F.semi, fontSize: 14, color: C.navy },
  pillTextOn: { fontFamily: F.xbold, fontSize: 14, color: '#fff' },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 4,
    gap: 8,
  },
  count: { fontFamily: F.bold, fontSize: 14, color: C.navy },
  toolbarBtns: { flexDirection: 'row', gap: 8 },
  tool: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  toolOn: { backgroundColor: C.soft, borderColor: C.primary },
  toolText: { fontFamily: F.semi, fontSize: 13, color: C.navy },
  toolTextOn: { fontFamily: F.xbold, fontSize: 13, color: C.primary },
  body: { padding: 22, gap: 12 },
  empty: { fontFamily: F.reg, textAlign: 'center', color: C.muted, marginTop: 24 },
  card: {
    padding: 14,
    gap: 6,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE5F7',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardTitle: { flex: 1, fontFamily: F.xbold, fontSize: 16, color: C.navy },
  badge: {
    fontFamily: F.xbold,
    fontSize: 12,
    color: C.primary,
    backgroundColor: C.soft,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  badgeOff: { color: C.muted, backgroundColor: '#EEF1F8' },
  muted: { fontFamily: F.reg, fontSize: 13, color: C.muted },
});