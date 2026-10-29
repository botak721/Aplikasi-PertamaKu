import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { jarakKm, openRoute } from "@/lib/geo";
import { LocationSharer } from "@/components/location-sharer";

type Item = { nama: string; jumlah: number };
type Order = {
  id: string;
  merchant_nama: string | null;
  alamat: string;
  total: number;
  status: string;
  created_at: string;
  merchant_lat: number | null;
  merchant_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  order_items: Item[];
};

function rupiah(n: number) {
  return "Rp " + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const SELECT =
  "id, merchant_nama, alamat, total, status, created_at, merchant_lat, merchant_lng, dest_lat, dest_lng, order_items(nama, jumlah)";

export function DriverHome({ userId, nama }: { userId: string; nama: string }) {
  const [tab, setTab] = useState<"tersedia" | "saya">("tersedia");
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(true);
  const [aktifIds, setAktifIds] = useState<string[]>([]);

  const loadAktif = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("id")
      .eq("driver_id", userId)
      .eq("status", "diantar");
    setAktifIds((data ?? []).map((o) => o.id as string));
  }, [userId]);

  useEffect(() => {
    loadAktif();
    const timer = setInterval(loadAktif, 10000);
    return () => clearInterval(timer);
  }, [loadAktif]);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      const query = supabase
        .from("orders")
        .select(SELECT)
        .order("created_at", { ascending: false });
      const { data, error } =
        tab === "tersedia"
          ? await query.eq("status", "siap").is("driver_id", null)
          : await query.eq("driver_id", userId);
      if (error) {
        if (!silent) Alert.alert("Gagal memuat pesanan", error.message);
      } else {
        setOrders((data ?? []) as Order[]);
      }
      setRefreshing(false);
    },
    [tab, userId],
  );

  useEffect(() => {
    setOrders([]);
    load();
    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
  }, [load]);

  async function ambil(id: string) {
    const { data, error } = await supabase
      .from("orders")
      .update({ status: "diantar", driver_id: userId })
      .eq("id", id)
      .eq("status", "siap")
      .is("driver_id", null)
      .select("id");
    if (error) {
      Alert.alert("Gagal mengambil pesanan", error.message);
      return;
    }
    if (!data || data.length === 0) {
      Alert.alert("Sudah diambil", "Pesanan ini sudah diambil driver lain.");
      load(true);
      return;
    }
    Alert.alert("Berhasil", 'Pesanan ada di tab "Pengantaran Saya".');
    setTab("saya");
    loadAktif();
  }

  async function selesai(id: string) {
    const { error } = await supabase
      .from("orders")
      .update({ status: "selesai" })
      .eq("id", id)
      .eq("driver_id", userId);
    if (error) Alert.alert("Gagal menyelesaikan", error.message);
    else {
      load(true);
      loadAktif();
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Halo, {nama}!</Text>
          <Text style={styles.subtitle}>Diperbarui otomatis tiap 10 detik</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logout}>Keluar</Text>
        </TouchableOpacity>
      </View>

      <LocationSharer orderIds={aktifIds} userId={userId} />
      {aktifIds.length > 0 && (
        <Text style={styles.sharing}>
          Lokasimu sedang dibagikan ke customer. Biarkan aplikasi tetap terbuka.
        </Text>
      )}

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "tersedia" && styles.tabActive]}
          onPress={() => setTab("tersedia")}
        >
          <Text
            style={[styles.tabText, tab === "tersedia" && styles.tabTextActive]}
          >
            Pesanan Tersedia
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "saya" && styles.tabActive]}
          onPress={() => setTab("saya")}
        >
          <Text
            style={[styles.tabText, tab === "saya" && styles.tabTextActive]}
          >
            Pengantaran Saya
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(o) => o.id}
        refreshing={refreshing}
        onRefresh={() => load()}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {tab === "tersedia"
              ? "Belum ada pesanan siap diantar."
              : "Belum ada pengantaran."}
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Ambil di: {item.merchant_nama ?? "Penjual"}
            </Text>
            {item.order_items.map((it, i) => (
              <Text key={i} style={styles.line}>
                {it.jumlah}x {it.nama}
              </Text>
            ))}
            <Text style={styles.meta}>Antar ke: {item.alamat}</Text>
            {item.merchant_lat != null && item.dest_lat != null && (
              <Text style={styles.meta}>
                Jarak penjual ke customer:{" "}
                {jarakKm(
                  item.merchant_lat,
                  item.merchant_lng!,
                  item.dest_lat,
                  item.dest_lng!,
                )}{" "}
                km
              </Text>
            )}
            <View style={styles.routeRow}>
              {item.merchant_lat != null && (
                <TouchableOpacity
                  style={styles.routeBtn}
                  onPress={() =>
                    openRoute(item.merchant_lat!, item.merchant_lng!)
                  }
                >
                  <Text style={styles.routeText}>Rute ke penjual</Text>
                </TouchableOpacity>
              )}
              {item.dest_lat != null && (
                <TouchableOpacity
                  style={styles.routeBtn}
                  onPress={() => openRoute(item.dest_lat!, item.dest_lng!)}
                >
                  <Text style={styles.routeText}>Rute ke customer</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.total}>
              Total pesanan: {rupiah(item.total)}
            </Text>
            <Text style={styles.meta}>
              {new Date(item.created_at).toLocaleString("id-ID")}
            </Text>

            {tab === "tersedia" && (
              <TouchableOpacity
                style={styles.btn}
                onPress={() => ambil(item.id)}
              >
                <Text style={styles.btnText}>Ambil Pesanan</Text>
              </TouchableOpacity>
            )}
            {tab === "saya" && item.status === "diantar" && (
              <TouchableOpacity
                style={styles.btn}
                onPress={() => selesai(item.id)}
              >
                <Text style={styles.btnText}>Tandai Selesai</Text>
              </TouchableOpacity>
            )}
            {tab === "saya" && item.status === "selesai" && (
              <Text style={styles.done}>Selesai</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#111" },
  subtitle: { fontSize: 13, color: "#666" },
  logout: { color: "#d00", fontWeight: "600" },
  tabs: { flexDirection: "row", gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  tabActive: { backgroundColor: "#00AA13", borderColor: "#00AA13" },
  tabText: { color: "#333", fontWeight: "600" },
  tabTextActive: { color: "#fff" },
  empty: { textAlign: "center", color: "#777", marginTop: 24 },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
    marginBottom: 6,
  },
  line: { fontSize: 15, color: "#111" },
  meta: { fontSize: 13, color: "#666", marginTop: 2 },
  total: { fontSize: 15, fontWeight: "700", color: "#00AA13", marginTop: 6 },
  btn: {
    backgroundColor: "#00AA13",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  done: { color: "#00AA13", fontWeight: "700", marginTop: 10 },
  sharing: { fontSize: 13, color: "#2563eb", marginBottom: 8 },
  routeRow: { flexDirection: "row", gap: 8, marginTop: 10 },
  routeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#00AA13",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  routeText: { color: "#00AA13", fontWeight: "700", fontSize: 13 },
});
