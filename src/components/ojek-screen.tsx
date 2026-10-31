import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { getCoords } from '@/lib/geo';
import { notify, konfirmasi } from '@/lib/notify';
import { ChatRoom } from '@/components/chat-room';
import { LiveMap, MapMarker } from '@/components/live-map';
import { C, F } from '@/constants/kampusgo';

type Pt = { lat: number; lng: number };
type Ride = {
  id: string;
  driver_id: string | null;
  driver_nama: string | null;
  jemput_text: string;
  tujuan_text: string;
  jemput_lat: number;
  jemput_lng: number;
  tarif: number;
  metode_bayar: 'tunai' | 'saldo';
  status: 'mencari' | 'dijemput' | 'diantar' | 'selesai' | 'dibatalkan';
  created_at: string;
};

const COLS =
  'id, driver_id, driver_nama, jemput_text, tujuan_text, jemput_lat, jemput_lng, tarif, metode_bayar, status, created_at';
const TUJUAN = ['Gerbang utama', 'Fakultas ', 'Perpustakaan'];

function rupiah(n: number) {
  return 'Rp ' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function OjekScreen({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [driverPos, setDriverPos] = useState<Pt | null>(null);
  const [tarif, setTarif] = useState<number | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [jemput, setJemput] = useState('');
  const [tujuan, setTujuan] = useState('');
  const [coords, setCoords] = useState<Pt | null>(null);
  const [locating, setLocating] = useState(false);
  const [bayar, setBayar] = useState<'tunai' | 'saldo'>('tunai');
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('ojek_rides')
      .select(COLS)
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) {
      setLoading(false);
      return;
    }
    const r = ((data ?? [])[0] as Ride | undefined) ?? null;
    setRide(r);
    if (r && (r.status === 'dijemput' || r.status === 'diantar')) {
      const { data: p } = await supabase
        .from('ride_locations')
        .select('lat, lng')
        .eq('ride_id', r.id)
        .maybeSingle();
      setDriverPos((p as Pt | null) ?? null);
    } else {
      setDriverPos(null);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    supabase.rpc('tarif_ojek').then(({ data, error }) => {
      if (!error) setTarif(data as number);
    });
    supabase.rpc('saldo_saya').then(({ data, error }) => {
      if (!error) setSaldo(data as number);
    });
  }, [ride?.id, ride?.status]);

  async function pakaiLokasi() {
    setLocating(true);
    const c = await getCoords();
    setLocating(false);
    if (c) setCoords(c);
  }

  async function pesan() {
    if (jemput.trim().length < 2) {
      notify('Lokasi jemput kosong', 'Isi keterangan lokasi jemput dulu.');
      return;
    }
    if (tujuan.trim().length < 2) {
      notify('Tujuan kosong', 'Isi tujuanmu dulu.');
      return;
    }
    if (!coords) {
      notify('Lokasi belum diambil', 'Tekan "Gunakan lokasi saya sekarang" supaya driver bisa menemukanmu.');
      return;
    }
    if (bayar === 'saldo' && saldo != null && tarif != null && saldo < tarif) {
      notify('Saldo tidak cukup', 'Isi saldo di Akun > Dompet, atau pilih bayar tunai.');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('minta_ojek', {
      p_jemput: jemput.trim(),
      p_tujuan: tujuan.trim(),
      p_lat: coords.lat,
      p_lng: coords.lng,
      p_bayar: bayar,
    });
    setBusy(false);
    if (error) {
      notify('Gagal memesan ojek', error.message);
      return;
    }
    setTujuan('');
    load();
  }

  function batal() {
    if (!ride) return;
    konfirmasi(
      'Batalkan perjalanan?',
      'Kalau kamu bayar dengan saldo, saldo dikembalikan.',
      async () => {
        const { error } = await supabase.rpc('batal_ojek', { p_id: ride.id });
        if (error) notify('Gagal membatalkan', error.message);
        load();
      }
    );
  }

  const aktif =
    !!ride && (ride.status === 'mencari' || ride.status === 'dijemput' || ride.status === 'diantar');

  if (chat && ride) {
    return (
      <ChatRoom threadType="ojek" threadId={ride.id} userId={userId} onBack={() => setChat(false)} />
    );
  }

  const markers: MapMarker[] = [];
  if (aktif && ride) {
    markers.push({ id: 'jemput', lat: ride.jemput_lat, lng: ride.jemput_lng, label: 'Jemput', color: '#f59e0b' });
  } else if (coords) {
    markers.push({ id: 'me', lat: coords.lat, lng: coords.lng, label: 'Kamu', color: C.primary });
  }
  if (driverPos) {
    markers.push({ id: 'driver', lat: driverPos.lat, lng: driverPos.lng, label: 'Driver', color: C.navy });
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityLabel="Kembali">
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Ojek Kampus</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.flex}>
        {header}
        <ActivityIndicator style={{ marginTop: 24 }} color={C.primary} />
      </View>
    );
  }

  if (aktif && ride) {
    const judul =
      ride.status === 'mencari'
        ? 'Mencari driver…'
        : ride.status === 'dijemput'
          ? `${ride.driver_nama ?? 'Driver'} menuju lokasimu`
          : 'Sedang diantar ke tujuan';
    return (
      <View style={styles.flex}>
        {header}
        <ScrollView contentContainerStyle={styles.body}>
          <LiveMap markers={markers} height={220} />
          <View style={styles.card}>
            <Text style={styles.status}>{judul}</Text>
            {ride.status === 'mencari' && (
              <Text style={styles.muted}>Tunggu sebentar, driver terdekat akan mengambil pesananmu.</Text>
            )}
            {ride.status !== 'mencari' && !driverPos && (
              <Text style={styles.muted}>Driver belum membagikan lokasi.</Text>
            )}
            <Text style={styles.muted}>Jemput: {ride.jemput_text}</Text>
            <Text style={styles.muted}>Tujuan: {ride.tujuan_text}</Text>
            <Text style={styles.total}>
              {rupiah(ride.tarif)} ·{' '}
              {ride.metode_bayar === 'saldo' ? 'Sudah dibayar saldo' : 'Bayar tunai ke driver'}
            </Text>
          </View>
          {ride.driver_id && (
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setChat(true)}>
              <Text style={styles.primaryText}>Chat driver</Text>
            </TouchableOpacity>
          )}
          {ride.status !== 'diantar' && (
            <TouchableOpacity style={styles.dangerBtn} onPress={batal}>
              <Text style={styles.dangerText}>Batalkan</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    );
  }

  const terakhir = ride && !aktif ? ride : null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header}
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {coords ? (
          <LiveMap markers={markers} height={170} />
        ) : (
          <View style={styles.mapEmpty}>
            <Text style={styles.muted}>Ambil lokasimu untuk melihat peta.</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Jemput di</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Depan Gedung B"
            placeholderTextColor={C.muted}
            value={jemput}
            onChangeText={setJemput}
            maxLength={120}
          />
          <TouchableOpacity style={styles.outlineBtn} onPress={pakaiLokasi} disabled={locating}>
            {locating ? (
              <ActivityIndicator color={C.primary} />
            ) : (
              <Text style={styles.outlineText}>
                {coords ? 'Lokasi jemput tersimpan ✓ (ketuk untuk perbarui)' : 'Gunakan lokasi saya sekarang'}
              </Text>
            )}
          </TouchableOpacity>
          <Text style={styles.label}>Tujuan</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Gerbang utama"
            placeholderTextColor={C.muted}
            value={tujuan}
            onChangeText={setTujuan}
            maxLength={120}
          />
          <View style={styles.chips}>
            {TUJUAN.map((t) => (
              <TouchableOpacity key={t} style={styles.chip} onPress={() => setTujuan(t)}>
                <Text style={styles.chipText}>{t.trim()}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.payRow}>
          <TouchableOpacity
            style={[styles.payChip, bayar === 'tunai' && styles.payChipOn]}
            onPress={() => setBayar('tunai')}>
            <Text style={bayar === 'tunai' ? styles.payTextOn : styles.payText}>Tunai</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.payChip, bayar === 'saldo' && styles.payChipOn]}
            onPress={() => setBayar('saldo')}>
            <Text style={bayar === 'saldo' ? styles.payTextOn : styles.payText}>
              Saldo{saldo != null ? ` ${rupiah(saldo)}` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.muted}>Tarif (flat)</Text>
            <Text style={styles.total}>{tarif != null ? rupiah(tarif) : 'Rp --.---'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={pesan} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Pesan ojek</Text>}
        </TouchableOpacity>

        {terakhir && (
          <View style={styles.card}>
            <Text style={styles.label}>Perjalanan terakhir</Text>
            <Text style={styles.muted}>
              {terakhir.status === 'selesai' ? 'Selesai' : 'Dibatalkan'} · ke {terakhir.tujuan_text} ·{' '}
              {rupiah(terakhir.tarif)}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  body: { padding: 22, gap: 14 },
  mapEmpty: {
    height: 170,
    borderRadius: 20,
    backgroundColor: '#DCE6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE5F7',
  },
  label: { fontFamily: F.semi, fontSize: 14, color: C.navy },
  muted: { fontFamily: F.reg, fontSize: 13, color: C.muted },
  status: { fontFamily: F.xbold, fontSize: 18, color: C.navy },
  total: { fontFamily: F.xbold, fontSize: 15, color: C.primary },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  chipText: { fontFamily: F.semi, fontSize: 14, color: C.navy },
  payRow: { flexDirection: 'row', gap: 8 },
  payChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  payChipOn: { backgroundColor: C.primary, borderColor: C.primary },
  payText: { fontFamily: F.semi, fontSize: 13, color: C.navy },
  payTextOn: { fontFamily: F.xbold, fontSize: 13, color: '#fff' },
  primaryBtn: {
    minHeight: 52,
    backgroundColor: C.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: F.xbold, fontSize: 15, color: '#fff' },
  outlineBtn: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { fontFamily: F.bold, color: C.primary },
  dangerBtn: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.danger,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerText: { fontFamily: F.xbold, color: C.danger },
});