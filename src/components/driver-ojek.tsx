import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { openRoute } from '@/lib/geo';
import { notify, konfirmasi } from '@/lib/notify';
import { ChatRoom } from '@/components/chat-room';
import { RideLocationSharer } from '@/components/ride-location-sharer';
import { C, F } from '@/constants/kampusgo';

type Ride = {
  id: string;
  customer_nama: string | null;
  jemput_text: string;
  tujuan_text: string;
  jemput_lat: number;
  jemput_lng: number;
  tarif: number;
  metode_bayar: 'tunai' | 'saldo';
  status: 'mencari' | 'dijemput' | 'diantar' | 'selesai' | 'dibatalkan';
};

const COLS =
  'id, customer_nama, jemput_text, tujuan_text, jemput_lat, jemput_lng, tarif, metode_bayar, status';
const LABEL: Record<string, string> = {
  mencari: 'Menunggu driver',
  dijemput: 'Jemput customer',
  diantar: 'Sedang diantar',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan',
};

function rupiah(n: number) {
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function DriverOjek({ userId }: { userId: string }) {
  const [tab, setTab] = useState<'permintaan' | 'saya'>('permintaan');
  const [rows, setRows] = useState<Ride[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [aktifIds, setAktifIds] = useState<string[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      const base = supabase.from('ojek_rides').select(COLS).order('created_at', { ascending: false });
      const { data, error } =
        tab === 'permintaan'
          ? await base.eq('status', 'mencari')
          : await base.eq('driver_id', userId).limit(30);
      if (error) {
        if (!silent) notify('Gagal memuat ojek', error.message);
      } else {
        setRows((data ?? []) as Ride[]);
      }
      setRefreshing(false);
    },
    [tab, userId]
  );

  const loadAktif = useCallback(async () => {
    const { data } = await supabase
      .from('ojek_rides')
      .select('id')
      .eq('driver_id', userId)
      .in('status', ['dijemput', 'diantar']);
    setAktifIds(((data ?? []) as { id: string }[]).map((x) => x.id));
  }, [userId]);

  useEffect(() => {
    setRows([]);
    load();
    const timer = setInterval(() => load(true), 8000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    loadAktif();
    const timer = setInterval(loadAktif, 10000);
    return () => clearInterval(timer);
  }, [loadAktif]);

  async function jalankan(fn: string, id: string, pindahKeSaya = false) {
    const { error } = await supabase.rpc(fn, { p_id: id });
    if (error) {
      notify('Gagal', error.message);
    } else if (pindahKeSaya) {
      setTab('saya');
    }
    load(true);
    loadAktif();
  }

  if (chatId) {
    return (
      <ChatRoom threadType="ojek" threadId={chatId} userId={userId} onBack={() => setChatId(null)} />
    );
  }

  return (
    <View style={styles.flex}>
      <RideLocationSharer rideIds={aktifIds} userId={userId} />
      <View style={styles.tabs}>
        {(
          [
            { key: 'permintaan', label: 'Permintaan Ojek' },
            { key: 'saya', label: 'Perjalananku' },
          ] as const
        ).map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, tab === t.key && styles.tabOn]}
            onPress={() => setTab(t.key)}>
            <Text style={tab === t.key ? styles.tabTextOn : styles.tabText}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {aktifIds.length > 0 && (
        <Text style={styles.sharing}>Lokasimu sedang dibagikan ke customer. Biarkan aplikasi tetap terbuka.</Text>
      )}

      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.body}
        data={rows}
        keyExtractor={(r) => r.id}
        refreshing={refreshing}
        onRefresh={() => load()}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === 'permintaan' ? 'Belum ada permintaan ojek.' : 'Belum ada perjalanan.'}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.customer_nama ?? 'Mahasiswa'}</Text>
              <Text style={styles.badge}>{LABEL[item.status]}</Text>
            </View>
            <Text style={styles.muted}>Jemput: {item.jemput_text}</Text>
            <Text style={styles.muted}>Tujuan: {item.tujuan_text}</Text>
            <Text style={styles.total}>
              {rupiah(item.tarif)} ·{' '}
              {item.metode_bayar === 'saldo'
                ? 'Sudah lunas lewat Saldo KampusGo, jangan tagih tunai'
                : 'Tagih tunai ke customer'}
            </Text>

            {tab === 'permintaan' && (
              <TouchableOpacity style={styles.btn} onPress={() => jalankan('ambil_ojek', item.id, true)}>
                <Text style={styles.btnText}>Ambil perjalanan</Text>
              </TouchableOpacity>
            )}

            {tab === 'saya' && item.status === 'dijemput' && (
              <>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.btnOutline, styles.flex]}
                    onPress={() => openRoute(item.jemput_lat, item.jemput_lng)}>
                    <Text style={styles.btnOutlineText}>Rute ke jemput</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btnOutline, styles.flex]} onPress={() => setChatId(item.id)}>
                    <Text style={styles.btnOutlineText}>Chat</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.btn} onPress={() => jalankan('mulai_ojek', item.id)}>
                  <Text style={styles.btnText}>Mulai antar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.lepas}
                  onPress={() =>
                    konfirmasi('Lepas perjalanan?', 'Perjalanan kembali ke daftar permintaan.', () =>
                      jalankan('lepas_ojek', item.id)
                    )
                  }>
                  <Text style={styles.lepasText}>Lepas perjalanan</Text>
                </TouchableOpacity>
              </>
            )}

            {tab === 'saya' && item.status === 'diantar' && (
              <>
                <TouchableOpacity style={styles.btnOutline} onPress={() => setChatId(item.id)}>
                  <Text style={styles.btnOutlineText}>Chat customer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btn} onPress={() => jalankan('selesai_ojek', item.id)}>
                  <Text style={styles.btnText}>Selesai</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  tab: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  tabOn: { backgroundColor: C.primary, borderColor: C.primary },
  tabText: { fontFamily: F.semi, color: C.navy },
  tabTextOn: { fontFamily: F.xbold, color: '#fff' },
  sharing: { fontFamily: F.reg, fontSize: 13, color: C.primary, paddingHorizontal: 16, paddingTop: 8 },
  body: { padding: 16, gap: 12 },
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
  muted: { fontFamily: F.reg, fontSize: 13, color: C.muted },
  total: { fontFamily: F.bold, fontSize: 13, color: C.primary },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  btnText: { fontFamily: F.xbold, fontSize: 14, color: '#fff' },
  btnOutline: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  btnOutlineText: { fontFamily: F.xbold, fontSize: 14, color: C.primary },
  lepas: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  lepasText: { fontFamily: F.semi, fontSize: 13, color: C.danger },
});