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
import { notify, konfirmasi } from '@/lib/notify';
import { C, F } from '@/constants/kampusgo';

type Jenis = 'pengumuman' | 'kegiatan' | 'jadwal' | 'ruang';
type Item = {
  id: string;
  jenis: Jenis;
  judul: string;
  mulai: string | null;
  berakhir: string;
};

const JENIS: { key: Jenis; label: string }[] = [
  { key: 'pengumuman', label: 'Pengumuman' },
  { key: 'kegiatan', label: 'Kegiatan' },
  { key: 'jadwal', label: 'Jadwal' },
  { key: 'ruang', label: 'Ruang kosong' },
];

function hariIni() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseWaktu(tgl: string, jam: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(tgl.trim());
  const t = /^(\d{1,2})[:.](\d{2})$/.exec(jam.trim());
  if (!m || !t) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +t[1], +t[2]);
  if (
    isNaN(d.getTime()) ||
    d.getFullYear() !== +m[1] ||
    d.getMonth() !== +m[2] - 1 ||
    d.getDate() !== +m[3] ||
    d.getHours() !== +t[1] ||
    d.getMinutes() !== +t[2]
  ) {
    return null;
  }
  return d;
}

export function AdminHome({ nama }: { nama: string }) {
  const [jenis, setJenis] = useState<Jenis>('pengumuman');
  const [judul, setJudul] = useState('');
  const [isi, setIsi] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [gedung, setGedung] = useState('');
  const [ruang, setRuang] = useState('');
  const [tgl, setTgl] = useState(hariIni());
  const [jam, setJam] = useState('');
  const [jamSelesai, setJamSelesai] = useState('');
  const [busy, setBusy] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('info_kampus')
      .select('id, jenis, judul, mulai, berakhir')
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) notify('Gagal memuat info', error.message);
    else setItems((data ?? []) as Item[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function pasang() {
    let p_judul = judul.trim();
    let p_mulai: Date | null = null;
    let p_selesai: Date | null = null;

    if (jenis === 'ruang') {
      if (!gedung.trim() || !ruang.trim()) {
        notify('Data belum lengkap', 'Isi gedung dan ruang.');
        return;
      }
      p_judul = `${gedung.trim()} · Ruang ${ruang.trim()}`;
      p_mulai = parseWaktu(tgl, jam);
      p_selesai = parseWaktu(tgl, jamSelesai);
      if (!p_mulai || !p_selesai) {
        notify('Waktu tidak valid', 'Tanggal pakai format 2026-11-05, jam pakai format 13:30.');
        return;
      }
    } else {
      if (p_judul.length < 2) {
        notify('Judul belum diisi', 'Judul minimal 2 huruf.');
        return;
      }
      if (jenis !== 'pengumuman') {
        p_mulai = parseWaktu(tgl, jam);
        if (!p_mulai) {
          notify('Waktu tidak valid', 'Tanggal pakai format 2026-11-05, jam pakai format 13:30.');
          return;
        }
      }
    }

    setBusy(true);
    const { error } = await supabase.rpc('pasang_info', {
      p_jenis: jenis,
      p_judul,
      p_isi: jenis === 'pengumuman' ? isi.trim() : null,
      p_lokasi: jenis === 'kegiatan' || jenis === 'jadwal' ? lokasi.trim() : null,
      p_mulai: p_mulai ? p_mulai.toISOString() : null,
      p_selesai: p_selesai ? p_selesai.toISOString() : null,
    });
    setBusy(false);
    if (error) {
      notify('Gagal memasang info', error.message);
      return;
    }
    notify('Terpasang', 'Info sudah tampil di aplikasi mahasiswa.');
    setJudul('');
    setIsi('');
    setLokasi('');
    setGedung('');
    setRuang('');
    setJam('');
    setJamSelesai('');
    load();
  }

  function hapus(item: Item) {
    konfirmasi('Hapus info?', item.judul, async () => {
      const { error } = await supabase.rpc('hapus_info', { p_id: item.id });
      if (error) notify('Gagal menghapus', error.message);
      load();
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.flex}>
            <Text style={styles.title}>Admin Info Kampus</Text>
            <Text style={styles.sub}>Masuk sebagai {nama}</Text>
          </View>
          <TouchableOpacity onPress={() => supabase.auth.signOut()}>
            <Text style={styles.logout}>Keluar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.section}>Pasang info baru</Text>
        <View style={styles.chips}>
          {JENIS.map((j) => (
            <TouchableOpacity
              key={j.key}
              style={[styles.chip, jenis === j.key && styles.chipOn]}
              onPress={() => setJenis(j.key)}>
              <Text style={jenis === j.key ? styles.chipTextOn : styles.chipText}>{j.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {jenis !== 'ruang' && (
          <>
            <Text style={styles.label}>Judul</Text>
            <TextInput
              style={styles.input}
              placeholder={
                jenis === 'pengumuman'
                  ? 'Contoh: Perpustakaan tutup lebih awal'
                  : jenis === 'kegiatan'
                    ? 'Contoh: Seminar Karier'
                    : 'Contoh: UTS Basis Data'
              }
              placeholderTextColor={C.muted}
              value={judul}
              onChangeText={setJudul}
              maxLength={120}
            />
          </>
        )}

        {jenis === 'pengumuman' && (
          <>
            <Text style={styles.label}>Isi pengumuman</Text>
            <TextInput
              style={[styles.input, styles.inputTall]}
              placeholder="Tulis kabar penting dari kampus"
              placeholderTextColor={C.muted}
              multiline
              value={isi}
              onChangeText={setIsi}
              maxLength={500}
            />
          </>
        )}

        {(jenis === 'kegiatan' || jenis === 'jadwal') && (
          <>
            <Text style={styles.label}>Lokasi</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Aula Gedung A"
              placeholderTextColor={C.muted}
              value={lokasi}
              onChangeText={setLokasi}
              maxLength={120}
            />
          </>
        )}

        {jenis === 'ruang' && (
          <>
            <Text style={styles.label}>Gedung</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: Gedung B"
              placeholderTextColor={C.muted}
              value={gedung}
              onChangeText={setGedung}
              maxLength={50}
            />
            <Text style={styles.label}>Ruang</Text>
            <TextInput
              style={styles.input}
              placeholder="Contoh: 204"
              placeholderTextColor={C.muted}
              value={ruang}
              onChangeText={setRuang}
              maxLength={50}
            />
          </>
        )}

        {jenis !== 'pengumuman' && (
          <>
            <Text style={styles.label}>Tanggal (TTTT-BB-HH)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-11-05"
              placeholderTextColor={C.muted}
              value={tgl}
              onChangeText={setTgl}
              maxLength={10}
            />
            <Text style={styles.label}>{jenis === 'ruang' ? 'Kosong mulai jam' : 'Jam mulai'} (JJ:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="13:30"
              placeholderTextColor={C.muted}
              value={jam}
              onChangeText={setJam}
              maxLength={5}
            />
          </>
        )}

        {jenis === 'ruang' && (
          <>
            <Text style={styles.label}>Kosong sampai jam (JJ:MM)</Text>
            <TextInput
              style={styles.input}
              placeholder="15:00"
              placeholderTextColor={C.muted}
              value={jamSelesai}
              onChangeText={setJamSelesai}
              maxLength={5}
            />
          </>
        )}

        <TouchableOpacity style={styles.primaryBtn} onPress={pasang} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Pasang info</Text>}
        </TouchableOpacity>

        <Text style={[styles.section, { marginTop: 10 }]}>Info terpasang</Text>
        {loading ? (
          <ActivityIndicator color={C.primary} />
        ) : items.length === 0 ? (
          <Text style={styles.muted}>Belum ada info.</Text>
        ) : (
          items.map((it) => {
            const lewat = new Date(it.berakhir).getTime() <= Date.now();
            return (
              <View key={it.id} style={[styles.row, lewat && { opacity: 0.55 }]}>
                <View style={styles.flex}>
                  <Text style={styles.rowTitle}>{it.judul}</Text>
                  <Text style={styles.muted}>
                    {JENIS.find((j) => j.key === it.jenis)?.label}
                    {it.mulai
                      ? ` · ${new Date(it.mulai).toLocaleString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}`
                      : ''}
                    {lewat ? ' · sudah berakhir' : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => hapus(it)}>
                  <Text style={styles.hapus}>Hapus</Text>
                </TouchableOpacity>
              </View>
            );
          })
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
  title: { fontFamily: F.xbold, fontSize: 22, color: '#fff' },
  sub: { fontFamily: F.reg, fontSize: 13, color: '#fff', opacity: 0.9 },
  logout: { fontFamily: F.xbold, fontSize: 14, color: C.yellow },
  body: { padding: 22, gap: 8 },
  section: { fontFamily: F.xbold, fontSize: 16, color: C.navy },
  label: { fontFamily: F.semi, fontSize: 14, color: C.navy, marginTop: 4 },
  muted: { fontFamily: F.reg, fontSize: 13, color: C.muted },
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
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontFamily: F.semi, fontSize: 14, color: C.navy },
  chipTextOn: { fontFamily: F.xbold, fontSize: 14, color: '#fff' },
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
  inputTall: { minHeight: 90, paddingTop: 12, textAlignVertical: 'top' },
  primaryBtn: {
    minHeight: 52,
    backgroundColor: C.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  primaryText: { fontFamily: F.xbold, fontSize: 15, color: '#fff' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DDE5F7',
  },
  rowTitle: { fontFamily: F.xbold, fontSize: 14, color: C.navy },
  hapus: { fontFamily: F.xbold, fontSize: 13, color: C.danger },
});