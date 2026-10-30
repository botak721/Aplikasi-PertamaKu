import { useEffect, useState } from 'react';
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
import { notify } from '@/lib/notify';
import { C, F } from '@/constants/kampusgo';

const TAGS = ['Cepat', 'Ramah', 'Tepat waktu', 'Sesuai pesanan'];

export function RatingScreen({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const [nama, setNama] = useState('Driver');
  const [bintang, setBintang] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [ulasan, setUlasan] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.rpc('chat_info', { p_type: 'order', p_id: orderId }).then(({ data }) => {
      const n = (data as { nama?: string } | null)?.nama;
      if (n) setNama(n);
    });
  }, [orderId]);

  function toggle(tag: string) {
    setTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  }

  async function kirim() {
    if (bintang === 0) {
      notify('Pilih bintang dulu', 'Ketuk bintang untuk memberi nilai.');
      return;
    }
    setSending(true);
    const { error } = await supabase.rpc('beri_rating', {
      p_order: orderId,
      p_bintang: bintang,
      p_tags: tags,
      p_ulasan: ulasan.trim(),
    });
    setSending(false);
    if (error) {
      notify('Gagal mengirim ulasan', error.message);
      return;
    }
    notify('Terima kasih!', 'Ulasanmu sudah terkirim.');
    onDone();
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onDone} accessibilityLabel="Kembali">
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Beri nilai</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{nama.trim().charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <Text style={styles.question}>Gimana pesanan lu?</Text>
          <Text style={styles.muted}>{nama} · Titip Kantin</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setBintang(n)}
                accessibilityLabel={`${n} bintang`}>
                <Text style={[styles.star, { color: n <= bintang ? C.yellow : C.border }]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.chips}>
          {TAGS.map((t) => {
            const on = tags.includes(t);
            return (
              <TouchableOpacity
                key={t}
                style={[styles.chip, on && styles.chipOn]}
                onPress={() => toggle(t)}>
                <Text style={on ? styles.chipTextOn : styles.chipText}>{t}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Tulis ulasan</Text>
        <TextInput
          style={styles.input}
          placeholder="Ceritain pengalaman lu"
          placeholderTextColor={C.muted}
          multiline
          maxLength={500}
          value={ulasan}
          onChangeText={setUlasan}
        />

        <TouchableOpacity style={styles.primaryBtn} onPress={kirim} disabled={sending}>
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>Kirim ulasan</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={onDone}>
          <Text style={styles.skipText}>Lewati</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
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
  body: { padding: 22, gap: 16 },
  card: {
    padding: 20,
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE5F7',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: F.xbold, fontSize: 28, color: C.primary },
  question: { fontFamily: F.xbold, fontSize: 18, color: C.navy },
  muted: { fontFamily: F.reg, fontSize: 13, color: C.muted },
  stars: { flexDirection: 'row', gap: 6 },
  star: { fontSize: 40 },
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
  label: { fontFamily: F.semi, fontSize: 14, color: C.muted },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: F.reg,
    fontSize: 15,
    color: C.navy,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  primaryBtn: {
    minHeight: 52,
    backgroundColor: C.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontFamily: F.xbold, fontSize: 15, color: '#fff' },
  skipBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontFamily: F.semi, fontSize: 14, color: C.muted },
});