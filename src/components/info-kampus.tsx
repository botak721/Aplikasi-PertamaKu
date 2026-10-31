import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { C, F } from '@/constants/kampusgo';

type Info = {
  id: string;
  jenis: 'pengumuman' | 'kegiatan' | 'jadwal' | 'ruang';
  judul: string;
  isi: string | null;
  lokasi: string | null;
  mulai: string | null;
  selesai: string | null;
  created_at: string;
};
type Tab = 'semua' | 'jadwal' | 'ruang' | 'kegiatan';

const TABS: { key: Tab; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'jadwal', label: 'Jadwal' },
  { key: 'ruang', label: 'Ruang' },
  { key: 'kegiatan', label: 'Kegiatan' },
];

function jam(iso: string) {
  return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={styles.section}>{title}</Text>
      {children}
    </View>
  );
}

function TanggalCard({ item }: { item: Info }) {
  const d = new Date(item.mulai ?? item.created_at);
  return (
    <View style={styles.card}>
      <View style={styles.dateTile}>
        <Text style={styles.dateDay}>{d.getDate()}</Text>
        <Text style={styles.dateMonth}>
          {d.toLocaleDateString('id-ID', { month: 'short' })}
        </Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{item.judul}</Text>
        <Text style={styles.muted}>
          {item.lokasi ? `${item.lokasi} · ` : ''}
          {item.mulai ? jam(item.mulai) : ''}
        </Text>
      </View>
    </View>
  );
}

export function InfoKampusScreen({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('semua');
  const [items, setItems] = useState<Info[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    const { data, error } = await supabase
      .from('info_kampus')
      .select('id, jenis, judul, isi, lokasi, mulai, selesai, created_at')
      .gt('berakhir', new Date().toISOString());
    if (error) {
      if (manual) notify('Gagal memuat info kampus', error.message);
    } else {
      setItems((data ?? []) as Info[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(() => load(), 30000);
    return () => clearInterval(timer);
  }, [load]);

  const sekarang = Date.now();
  const byMulai = (a: Info, b: Info) =>
    new Date(a.mulai ?? 0).getTime() - new Date(b.mulai ?? 0).getTime();

  const pengumuman = items
    .filter((i) => i.jenis === 'pengumuman')
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const ruang = items
    .filter((i) => i.jenis === 'ruang' && i.mulai && new Date(i.mulai).getTime() <= sekarang)
    .sort((a, b) => new Date(a.selesai ?? 0).getTime() - new Date(b.selesai ?? 0).getTime());
  const kegiatan = items.filter((i) => i.jenis === 'kegiatan').sort(byMulai);
  const jadwal = items.filter((i) => i.jenis === 'jadwal').sort(byMulai);

  const tampilRuang = tab === 'semua' || tab === 'ruang';
  const tampilKegiatan = tab === 'semua' || tab === 'kegiatan';
  const tampilJadwal = tab === 'semua' || tab === 'jadwal';

  const kosong =
    (tampilRuang ? ruang.length : 0) +
      (tampilKegiatan ? kegiatan.length : 0) +
      (tampilJadwal ? jadwal.length : 0) +
      (tab === 'semua' ? pengumuman.length : 0) ===
    0;

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityLabel="Kembali">
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Info Kampus</Text>
        </View>
        <View style={styles.pillRow}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.pill, tab === t.key ? styles.pillOn : styles.pillOff]}
              onPress={() => setTab(t.key)}>
              <Text style={tab === t.key ? styles.pillTextOn : styles.pillTextOff}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={C.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
          {tampilRuang && ruang.length > 0 && (
            <Section title="Ruang kosong sekarang">
              <View style={styles.listCard}>
                {ruang.map((r) => (
                  <View key={r.id} style={styles.roomRow}>
                    <View style={styles.flex}>
                      <Text style={styles.cardTitle}>{r.judul}</Text>
                      <Text style={styles.muted}>sampai {r.selesai ? jam(r.selesai) : '-'}</Text>
                    </View>
                    <Text style={styles.badge}>Kosong</Text>
                  </View>
                ))}
              </View>
            </Section>
          )}

          {tampilKegiatan && kegiatan.length > 0 && (
            <Section title="Kegiatan kampus">
              {kegiatan.map((k) => (
                <TanggalCard key={k.id} item={k} />
              ))}
            </Section>
          )}

          {tampilJadwal && jadwal.length > 0 && (
            <Section title="Jadwal">
              {jadwal.map((j) => (
                <TanggalCard key={j.id} item={j} />
              ))}
            </Section>
          )}

          {tab === 'semua' &&
            pengumuman.map((p) => (
              <View key={p.id} style={styles.banner}>
                <Text style={styles.bannerTitle}>{p.judul}</Text>
                {!!p.isi && <Text style={styles.bannerText}>{p.isi}</Text>}
              </View>
            ))}

          {kosong && (
            <Text style={styles.empty}>
              {tab === 'ruang'
                ? 'Belum ada ruang kosong saat ini.'
                : 'Belum ada info di sini. Admin kampus akan menambahkannya.'}
            </Text>
          )}
        </ScrollView>
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
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, justifyContent: 'center' },
  pillOn: { backgroundColor: '#fff' },
  pillOff: { backgroundColor: 'rgba(255,255,255,0.18)' },
  pillTextOn: { fontFamily: F.xbold, fontSize: 14, color: C.primary },
  pillTextOff: { fontFamily: F.semi, fontSize: 14, color: '#fff' },
  body: { padding: 22, gap: 18 },
  section: { fontFamily: F.xbold, fontSize: 16, color: C.navy },
  empty: { fontFamily: F.reg, textAlign: 'center', color: C.muted, marginTop: 24 },
  muted: { fontFamily: F.reg, fontSize: 13, color: C.muted },
  cardTitle: { fontFamily: F.xbold, fontSize: 15, color: C.navy },
  listCard: {
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE5F7',
  },
  roomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FB',
    gap: 8,
  },
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
  dateTile: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: C.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateDay: { fontFamily: F.xbold, fontSize: 18, color: C.primary },
  dateMonth: { fontFamily: F.semi, fontSize: 11, color: C.primary },
  banner: { backgroundColor: C.yellow, borderRadius: 16, padding: 16, gap: 4 },
  bannerTitle: { fontFamily: F.xbold, fontSize: 15, color: C.navy },
  bannerText: { fontFamily: F.reg, fontSize: 13, color: C.navy },
});