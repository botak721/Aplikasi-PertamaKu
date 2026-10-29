import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';
import { C, F } from '@/constants/kampusgo';

type Row = {
  key: string;
  type: 'order' | 'titip';
  id: string;
  judul: string;
  info: string;
  at: string;
};

function tgl(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function ChatList({
  userId,
  onOpen,
}: {
  userId: string;
  onOpen: (type: 'order' | 'titip', id: string) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [refreshing, setRefreshing] = useState(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [o, t] = await Promise.all([
      supabase
        .from('orders')
        .select('id, merchant_nama, status, created_at')
        .eq('customer_id', userId)
        .not('driver_id', 'is', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('titip_requests')
        .select('id, barang, status, created_at')
        .not('helper_id', 'is', null)
        .or(`requester_id.eq.${userId},helper_id.eq.${userId}`)
        .order('created_at', { ascending: false }),
    ]);
    const err = o.error ?? t.error;
    if (err) {
      notify('Gagal memuat chat', err.message);
    } else {
      const a: Row[] = ((o.data ?? []) as any[]).map((x) => ({
        key: 'o' + x.id,
        type: 'order',
        id: x.id,
        judul: `Driver · ${x.merchant_nama ?? 'Penjual'}`,
        info: `${x.status === 'diantar' ? 'Sedang diantar' : 'Selesai'} · ${tgl(x.created_at)}`,
        at: x.created_at,
      }));
      const b: Row[] = ((t.data ?? []) as any[]).map((x) => ({
        key: 't' + x.id,
        type: 'titip',
        id: x.id,
        judul: `Titip Beli · ${x.barang}`,
        info: `${x.status === 'diambil' ? 'Sedang dibelikan' : 'Selesai'} · ${tgl(x.created_at)}`,
        at: x.created_at,
      }));
      setRows([...a, ...b].sort((p, q) => (p.at < q.at ? 1 : -1)));
    }
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
      </View>
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.body}
        data={rows}
        keyExtractor={(r) => r.key}
        refreshing={refreshing}
        onRefresh={load}
        ListEmptyComponent={
          <Text style={styles.empty}>
            Belum ada percakapan. Chat dengan driver atau teman yang membantumu muncul di sini saat
            pesanan sedang diantar atau dibelikan.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onOpen(item.type, item.id)}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.judul}
            </Text>
            <Text style={styles.muted}>{item.info}</Text>
          </TouchableOpacity>
        )}
      />
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
  },
  headerTitle: { fontFamily: F.xbold, fontSize: 24, color: '#fff' },
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
  cardTitle: { fontFamily: F.xbold, fontSize: 16, color: C.navy },
  muted: { fontFamily: F.reg, fontSize: 13, color: C.muted },
});