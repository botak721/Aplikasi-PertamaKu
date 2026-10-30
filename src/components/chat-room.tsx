import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
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

type Msg = { id: string; sender_id: string; sender_nama: string | null; isi: string; created_at: string };
type Info = { nama: string; aktif: boolean };

const CEPAT = ['Saya di depan gedung', 'Tunggu sebentar'];

export function ChatRoom({
  threadType,
  threadId,
  userId,
  onBack,
}: {
  threadType: 'order' | 'titip' | 'grup';
  threadId: string;
  userId: string;
  onBack: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [info, setInfo] = useState<Info | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);

  const load = useCallback(async () => {
    const [m, i] = await Promise.all([
      supabase
        .from('messages')
        .select('id, sender_id, sender_nama, isi, created_at')
        .eq('thread_type', threadType)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true })
        .limit(200),
      supabase.rpc('chat_info', { p_type: threadType, p_id: threadId }),
    ]);
    if (!m.error) {
      const list = (m.data ?? []) as Msg[];
      setMsgs((prev) =>
        prev.length === list.length && prev[prev.length - 1]?.id === list[list.length - 1]?.id
          ? prev
          : list
      );
    }
    if (!i.error && i.data) setInfo(i.data as Info);
    setLoading(false);
  }, [threadType, threadId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [load]);

  async function kirim(isi: string) {
    const s = isi.trim();
    if (!s || sending) return;
    setSending(true);
    const { error } = await supabase.rpc('kirim_pesan', {
      p_type: threadType,
      p_id: threadId,
      p_isi: s,
    });
    setSending(false);
    if (error) {
      notify('Gagal mengirim', error.message);
      return;
    }
    setText('');
    load();
  }

  const aktif = info?.aktif ?? false;
  const sub = aktif
    ? threadType === 'order'
      ? 'Sedang mengantar pesanan lu'
      : threadType === 'titip'
        ? 'Sedang dibelikan'
        : 'Obrolan kelompok'
    : threadType === 'grup'
      ? 'Kelompok sudah ditutup'
      : 'Percakapan sudah selesai';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} accessibilityLabel="Kembali">
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {info?.nama ?? 'Chat'}
          </Text>
        </View>
        <Text style={styles.sub}>{sub}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={C.primary} />
      ) : (
        <ScrollView
          ref={scroller}
          style={styles.flex}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: true })}>
          {msgs.length === 0 && (
            <Text style={styles.empty}>Belum ada pesan. Sapa duluan, yuk.</Text>
          )}
          {msgs.map((m) => {
            const saya = m.sender_id === userId;
            return (
              <View key={m.id} style={[styles.bubble, saya ? styles.mine : styles.theirs]}>
                {!saya && threadType === 'grup' && (
                  <Text style={styles.sender}>{m.sender_nama ?? 'Anggota'}</Text>
                )}
                <Text style={saya ? styles.mineText : styles.theirsText}>{m.isi}</Text>
              </View>
            );
          })}
        </ScrollView>
      )}

      {aktif ? (
        <View style={styles.footer}>
          {threadType !== 'grup' && (
            <View style={styles.chips}>
              {CEPAT.map((c) => (
                <TouchableOpacity key={c} style={styles.chip} onPress={() => kirim(c)}>
                  <Text style={styles.chipText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Tulis pesan"
              placeholderTextColor={C.muted}
              value={text}
              onChangeText={setText}
              maxLength={500}
              onSubmitEditing={() => kirim(text)}
              returnKeyType="send"
            />
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => kirim(text)}
              disabled={sending}
              accessibilityLabel="Kirim">
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendText}>➤</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text style={styles.closed}>Percakapan ini sudah ditutup. Kamu masih bisa membaca isinya.</Text>
      )}
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
    gap: 8,
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
  title: { flex: 1, fontFamily: F.xbold, fontSize: 22, color: '#fff' },
  sub: { fontFamily: F.reg, fontSize: 13, color: '#fff', opacity: 0.9, paddingLeft: 56 },
  list: { padding: 22, gap: 12, flexGrow: 1 },
  empty: { fontFamily: F.reg, color: C.muted, textAlign: 'center', marginTop: 24 },
  bubble: { maxWidth: '75%', paddingVertical: 10, paddingHorizontal: 14, gap: 2 },
  theirs: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#DDE5F7',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
  },
  mine: {
    alignSelf: 'flex-end',
    backgroundColor: C.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  sender: { fontFamily: F.xbold, fontSize: 12, color: C.primary },
  theirsText: { fontFamily: F.reg, fontSize: 14, color: C.navy },
  mineText: { fontFamily: F.reg, fontSize: 14, color: '#fff' },
  footer: { paddingHorizontal: 22, paddingBottom: 14, paddingTop: 6, gap: 10 },
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
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: F.reg,
    fontSize: 15,
    color: C.navy,
    backgroundColor: '#fff',
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontSize: 18 },
  closed: {
    fontFamily: F.reg,
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    padding: 16,
  },
});