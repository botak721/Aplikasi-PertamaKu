import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { ChatRoom } from '@/components/chat-room';
import { C, F } from '@/constants/kampusgo';

type Anggota = { user_id: string; nama: string | null };
type Grup = {
  id: string;
  creator_id: string;
  jenis: 'kelompok' | 'bareng';
  mata_kuliah: string;
  judul: string;
  jadwal: string;
  lokasi: string;
  kapasitas: number;
  status: 'buka' | 'penuh' | 'selesai';
  kampus: string | null;
  study_members: Anggota[];
};
type Tab = 'kelompok' | 'bareng' | 'saya';

const WARNA = [C.primary, C.yellow, '#BFD3FF'];
const TABS: { key: Tab; label: string }[] = [
  { key: 'kelompok', label: 'Kelompok' },
  { key: 'bareng', label: 'Belajar bareng' },
  { key: 'saya', label: 'Saya' },
];

function FormKelompok({ onBatal, onSelesai }: { onBatal: () => void; onSelesai: () => void }) {
  const [jenis, setJenis] = useState<'kelompok' | 'bareng'>('kelompok');
  const [mk, setMk] = useState('');
  const [judul, setJudul] = useState('');
  const [jadwal, setJadwal] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [kapasitas, setKapasitas] = useState(4);
  const [busy, setBusy] = useState(false);

  async function buat() {
    if (mk.trim().length < 2 || judul.trim().length < 2 || jadwal.trim().length < 2 || lokasi.trim().length < 2) {
      notify('Data belum lengkap', 'Isi mata kuliah, judul, jadwal, dan lokasi (minimal 2 huruf).');
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('buat_kelompok', {
      p_jenis: jenis,
      p_mk: mk.trim(),
      p_judul: judul.trim(),
      p_jadwal: jadwal.trim(),
      p_lokasi: lokasi.trim(),
      p_kapasitas: kapasitas,
    });
    setBusy(false);
    if (error) {
      notify('Gagal membuat kelompok', error.message);
      return;
    }
    notify('Kelompok dibuat', 'Teman-temanmu sudah bisa bergabung.');
    onSelesai();
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBatal} accessibilityLabel="Kembali">
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Buat kelompok</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Jenis</Text>
        <View style={styles.pillRowDark}>
          {(
            [
              { key: 'kelompok', label: 'Kelompok tugas' },
              { key: 'bareng', label: 'Belajar bareng' },
            ] as const
          ).map((j) => (
            <TouchableOpacity
              key={j.key}
              style={[styles.chip, jenis === j.key && styles.chipOn]}
              onPress={() => setJenis(j.key)}>
              <Text style={jenis === j.key ? styles.chipTextOn : styles.chipText}>{j.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.label}>Mata kuliah</Text>
        <TextInput
          style={styles.input}
          placeholder="Contoh: Basis Data"
          placeholderTextColor={C.muted}
          value={mk}
          onChangeText={setMk}
          maxLength={80}
        />
        <Text style={styles.label}>Judul</Text>
        <TextInput
          style={styles.input}
          placeholder={jenis === 'kelompok' ? 'Contoh: Tugas kelompok' : 'Contoh: Belajar buat UTS'}
          placeholderTextColor={C.muted}
          value={judul}
          onChangeText={setJudul}
          maxLength={100}
        />
        <Text style={styles.label}>Jadwal</Text>
        <TextInput
          style={styles.input}
          placeholder="Contoh: Kamis, 15.00"
          placeholderTextColor={C.muted}
          value={jadwal}
          onChangeText={setJadwal}
          maxLength={80}
        />
        <Text style={styles.label}>Lokasi</Text>
        <TextInput
          style={styles.input}
          placeholder="Contoh: Perpustakaan lantai 2"
          placeholderTextColor={C.muted}
          value={lokasi}
          onChangeText={setLokasi}
          maxLength={100}
        />
        <Text style={styles.label}>Jumlah orang (termasuk kamu)</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setKapasitas(Math.max(2, kapasitas - 1))}>
            <Text style={styles.stepText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.stepNum}>{kapasitas}</Text>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => setKapasitas(Math.min(12, kapasitas + 1))}>
            <Text style={styles.stepText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.primaryBtn} onPress={buat} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Buat kelompok</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function TemanBelajarScreen({ userId, onBack }: { userId: string; onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('kelompok');
  const [grup, setGrup] = useState<Grup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [membuat, setMembuat] = useState(false);
  const [chatId, setChatId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    const { data, error } = await supabase
      .from('study_groups')
      .select(
        'id, creator_id, jenis, mata_kuliah, judul, jadwal, lokasi, kapasitas, status, kampus, study_members(user_id, nama)'
      )
      .neq('status', 'selesai')
      .order('created_at', { ascending: false });
    if (error) notify('Gagal memuat kelompok', error.message);
    else setGrup((data ?? []) as unknown as Grup[]);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function jalankan(fn: string, id: string, sukses?: string) {
    const { error } = await supabase.rpc(fn, { p_id: id });
    if (error) notify('Gagal', error.message);
    else if (sukses) notify('Berhasil', sukses);
    load();
  }

  if (chatId) {
    return (
      <ChatRoom threadType="grup" threadId={chatId} userId={userId} onBack={() => setChatId(null)} />
    );
  }

  if (membuat) {
    return (
      <FormKelompok
        onBatal={() => setMembuat(false)}
        onSelesai={() => {
          setMembuat(false);
          setTab('saya');
          load();
        }}
      />
    );
  }

  const saya = (g: Grup) => g.study_members.some((m) => m.user_id === userId);
  const tampil = grup.filter((g) =>
    tab === 'saya' ? saya(g) : g.jenis === tab && g.status === 'buka'
  );

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityLabel="Kembali">
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Teman Belajar</Text>
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
        <FlatList
          style={styles.flex}
          contentContainerStyle={styles.body}
          data={tampil}
          keyExtractor={(g) => g.id}
          refreshing={refreshing}
          onRefresh={load}
          ListHeaderComponent={
            <Text style={styles.section}>{tab === 'saya' ? 'Kelompok saya' : 'Lagi cari anggota'}</Text>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'saya'
                ? 'Kamu belum ikut kelompok apa pun.'
                : 'Belum ada yang mencari anggota. Buat kelompok pertamamu!'}
            </Text>
          }
          renderItem={({ item }) => {
            const anggota = item.study_members;
            const aku = saya(item);
            const pembuat = item.creator_id === userId;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{item.mata_kuliah}</Text>
                    <Text style={styles.muted}>{item.judul}</Text>
                  </View>
                  <Text style={[styles.badge, item.status !== 'buka' && styles.badgeOff]}>
                    {item.status === 'buka' ? 'Buka' : 'Penuh'}
                  </Text>
                </View>
                <Text style={styles.muted}>
                  {item.jadwal} · {item.lokasi}
                </Text>
                {!!item.kampus && <Text style={styles.muted}>Kampus: {item.kampus}</Text>}
                <View style={styles.cardBottom}>
                  <View style={styles.avatars}>
                    {anggota.slice(0, 3).map((a, i) => (
                      <View
                        key={a.user_id}
                        style={[
                          styles.avatar,
                          { backgroundColor: WARNA[i % WARNA.length], marginLeft: i === 0 ? 0 : -8 },
                        ]}>
                        <Text style={styles.avatarText}>
                          {(a.nama ?? '?').trim().charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    ))}
                    <Text style={[styles.muted, { marginLeft: 8 }]}>
                      {anggota.length} dari {item.kapasitas} orang
                    </Text>
                  </View>
                </View>

                {aku ? (
                  <View style={styles.actions}>
                    <TouchableOpacity style={[styles.btn, styles.flex]} onPress={() => setChatId(item.id)}>
                      <Text style={styles.btnText}>Chat</Text>
                    </TouchableOpacity>
                    {pembuat ? (
                      <TouchableOpacity
                        style={[styles.btnOutline, styles.flex]}
                        onPress={() =>
                          konfirmasi('Tutup kelompok?', 'Kelompok tidak akan muncul lagi dan obrolan ditutup.', () =>
                            jalankan('tutup_kelompok', item.id)
                          )
                        }>
                        <Text style={styles.btnOutlineText}>Tutup</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.btnOutline, styles.flex]}
                        onPress={() =>
                          konfirmasi('Keluar dari kelompok?', item.mata_kuliah, () =>
                            jalankan('keluar_kelompok', item.id)
                          )
                        }>
                        <Text style={styles.btnOutlineText}>Keluar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.btn}
                    onPress={() => jalankan('gabung_kelompok', item.id, 'Kamu sudah bergabung. Buka tab Saya untuk chat.')}>
                    <Text style={styles.btnText}>Gabung</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setMembuat(true)}>
          <Text style={styles.primaryText}>Buat kelompok</Text>
        </TouchableOpacity>
      </View>
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
  body: { padding: 22, gap: 12 },
  section: { fontFamily: F.xbold, fontSize: 16, color: C.navy, marginBottom: 4 },
  empty: { fontFamily: F.reg, textAlign: 'center', color: C.muted, marginTop: 24 },
  muted: { fontFamily: F.reg, fontSize: 13, color: C.muted },
  card: {
    padding: 16,
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE5F7',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitle: { fontFamily: F.xbold, fontSize: 16, color: C.navy },
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
  cardBottom: { flexDirection: 'row', alignItems: 'center' },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: F.xbold, fontSize: 13, color: C.navy },
  actions: { flexDirection: 'row', gap: 8 },
  btn: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontFamily: F.xbold, fontSize: 14, color: '#fff' },
  btnOutline: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: { fontFamily: F.xbold, fontSize: 14, color: C.primary },
  footer: { padding: 16, paddingTop: 8 },
  primaryBtn: {
    minHeight: 52,
    backgroundColor: C.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryText: { fontFamily: F.xbold, fontSize: 15, color: '#fff' },
  label: { fontFamily: F.semi, fontSize: 14, color: C.navy, marginTop: 4 },
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
  pillRowDark: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
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
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: '#fff', fontSize: 22, fontFamily: F.bold, lineHeight: 26 },
  stepNum: { fontFamily: F.xbold, fontSize: 20, color: C.navy, minWidth: 28, textAlign: 'center' },
});