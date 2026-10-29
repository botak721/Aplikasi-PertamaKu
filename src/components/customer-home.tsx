import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { getCoords } from "@/lib/geo";
import { TrackOrder } from "@/components/track-order";
import { TitipBeli } from "@/components/titip-beli";

type Merchant = { id: string; nama: string | null };
type MenuItem = { id: string; nama: string; harga: number };
type Order = {
  id: string;
  merchant_nama: string | null;
  total: number;
  status: string;
  created_at: string;
  dest_lat: number | null;
  dest_lng: number | null;
  merchant_lat: number | null;
  merchant_lng: number | null;
};

const STATUS_LABEL: Record<string, string> = {
  baru: "Menunggu penjual",
  diproses: "Sedang disiapkan",
  siap: "Siap diantar",
  diantar: "Sedang diantar",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

function rupiah(n: number) {
  return "Rp " + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

const LAYANAN = [
  {
    key: "kantin",
    judul: "Titip Kantin",
    desc: "Pesan makanan dari kantin atau warung, diantar ke gedung atau kelas",
    aktif: true,
  },
  {
    key: "print",
    judul: "Fotokopi & Print",
    desc: "Upload file, ambil di tempat atau diantar",
    aktif: false,
  },
  {
    key: "ojek",
    judul: "Ojek Kampus",
    desc: "Antar jarak pendek di sekitar kampus",
    aktif: false,
  },
  {
    key: "titip_beli",
    judul: "Titip Beli",
    desc: "Minta tolong teman beli alat tulis, materai, buku",
    aktif: true,
  },
  {
    key: "belajar",
    judul: "Teman Belajar",
    desc: "Cari kelompok belajar",
    aktif: false,
  },
  {
    key: "info",
    judul: "Info Kampus",
    desc: "Jadwal, ruang kosong, dan kegiatan",
    aktif: false,
  },
];

function ServiceGrid({ onPick }: { onPick: (key: string) => void }) {
  return (
    <FlatList
      data={LAYANAN}
      keyExtractor={(l) => l.key}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.card, !item.aktif && styles.cardOff]}
          onPress={() =>
            item.aktif
              ? onPick(item.key)
              : Alert.alert(item.judul, "Segera hadir.")
          }
        >
          <Text style={styles.cardTitle}>
            {item.judul}
            {item.aktif ? "" : "  (segera)"}
          </Text>
          <Text style={styles.cardSub}>{item.desc}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

function MerchantList({ onPick }: { onPick: (m: Merchant) => void }) {
  const [list, setList] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, nama")
      .eq("role", "merchant")
      .then(({ data, error }) => {
        if (error) Alert.alert("Gagal memuat penjual", error.message);
        else setList((data ?? []) as Merchant[]);
        setLoading(false);
      });
  }, []);

  if (loading)
    return <ActivityIndicator style={{ marginTop: 24 }} color="#00AA13" />;

  return (
    <FlatList
      data={list}
      keyExtractor={(m) => m.id}
      ListEmptyComponent={
        <Text style={styles.empty}>Belum ada penjual terdaftar.</Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => onPick(item)}>
          <Text style={styles.cardTitle}>{item.nama ?? "Penjual"}</Text>
          <Text style={styles.cardSub}>Lihat menu</Text>
        </TouchableOpacity>
      )}
    />
  );
}

function MenuView({
  userId,
  merchant,
  onBack,
  onOrdered,
}: {
  userId: string;
  merchant: Merchant;
  onBack: () => void;
  onOrdered: () => void;
}) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [alamat, setAlamat] = useState("");
  const [sending, setSending] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [locating, setLocating] = useState(false);

  async function pakaiLokasi() {
    setLocating(true);
    const c = await getCoords();
    setLocating(false);
    if (c) setCoords(c);
  }

  useEffect(() => {
    supabase
      .from("menu_items")
      .select("id, nama, harga")
      .eq("merchant_id", merchant.id)
      .eq("tersedia", true)
      .order("nama")
      .then(({ data, error }) => {
        if (error) Alert.alert("Gagal memuat menu", error.message);
        else setItems((data ?? []) as MenuItem[]);
        setLoading(false);
      });
  }, [merchant.id]);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.harga * (cart[it.id] ?? 0), 0),
    [items, cart],
  );
  const jumlahItem = Object.values(cart).reduce((a, b) => a + b, 0);

  function ubah(id: string, delta: number) {
    setCart((c) => {
      const next = Math.max(0, (c[id] ?? 0) + delta);
      const copy = { ...c };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  async function pesan() {
    if (jumlahItem === 0) {
      Alert.alert("Keranjang kosong", "Pilih menu dulu ya.");
      return;
    }
    if (!coords) {
      Alert.alert(
        "Lokasi belum ada",
        'Tekan "Gunakan lokasi saya sekarang" dulu.',
      );
      return;
    }
    if (!alamat.trim()) {
      Alert.alert("Alamat kosong", "Isi alamat antar dulu.");
      return;
    }
    setSending(true);
    const { error } = await supabase.rpc("buat_pesanan", {
      p_merchant_id: merchant.id,
      p_alamat: alamat.trim(),
      p_items: items
        .filter((it) => cart[it.id])
        .map((it) => ({ menu_id: it.id, jumlah: cart[it.id] })),
      p_lat: coords.lat,
      p_lng: coords.lng,
    });
    setSending(false);

    if (error) {
      Alert.alert("Gagal membuat pesanan", error.message);
      return;
    }
    Alert.alert("Pesanan terkirim!", "Penjual akan segera memprosesnya.");
    onOrdered();
  }

  return (
    <View style={styles.flex}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>‹ Kembali</Text>
      </TouchableOpacity>
      <Text style={styles.title}>{merchant.nama ?? "Penjual"}</Text>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color="#00AA13" />
      ) : (
        <FlatList
          style={styles.flex}
          data={items}
          keyExtractor={(it) => it.id}
          ListEmptyComponent={
            <Text style={styles.empty}>Belum ada menu tersedia.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{item.nama}</Text>
                <Text style={styles.price}>{rupiah(item.harga)}</Text>
              </View>
              <View style={styles.qtyBox}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => ubah(item.id, -1)}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qty}>{cart[item.id] ?? 0}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => ubah(item.id, 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <View style={styles.checkout}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={pakaiLokasi}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color="#00AA13" />
          ) : (
            <Text style={styles.secondaryText}>
              {coords
                ? "Lokasi antar tersimpan ✓ (ketuk untuk perbarui)"
                : "Gunakan lokasi saya sekarang"}
            </Text>
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Gedung / ruang (contoh: Gedung B, Ruang 204)"
          placeholderTextColor="#888"
          value={alamat}
          onChangeText={setAlamat}
        />
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={pesan}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              Pesan ({jumlahItem} item) • {rupiah(total)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function OrdersView({ userId }: { userId: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, merchant_nama, total, status, created_at, dest_lat, dest_lng, merchant_lat, merchant_lng",
      )
      .eq("customer_id", userId)
      .order("created_at", { ascending: false });
    if (error) Alert.alert("Gagal memuat pesanan", error.message);
    else setOrders((data ?? []) as Order[]);
    setRefreshing(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <FlatList
      data={orders}
      keyExtractor={(o) => o.id}
      refreshing={refreshing}
      onRefresh={load}
      ListEmptyComponent={<Text style={styles.empty}>Belum ada pesanan.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {item.merchant_nama ?? "Penjual"}
          </Text>
          <Text style={styles.price}>{rupiah(item.total)}</Text>
          <Text style={styles.status}>
            {STATUS_LABEL[item.status] ?? item.status}
          </Text>
          <Text style={styles.cardSub}>
            {new Date(item.created_at).toLocaleString("id-ID")}
          </Text>
          {item.status === "diantar" && (
            <TrackOrder
              orderId={item.id}
              dest={
                item.dest_lat != null && item.dest_lng != null
                  ? { lat: item.dest_lat, lng: item.dest_lng }
                  : null
              }
              merchant={
                item.merchant_lat != null && item.merchant_lng != null
                  ? { lat: item.merchant_lat, lng: item.merchant_lng }
                  : null
              }
            />
          )}
        </View>
      )}
    />
  );
}

export function CustomerHome({
  userId,
  nama,
}: {
  userId: string;
  nama: string;
}) {
  const [tab, setTab] = useState<"cari" | "pesanan">("cari");
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [layanan, setLayanan] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Halo, {nama}!</Text>
          <Text style={styles.cardSub}>Mau pakai layanan apa hari ini?</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logout}>Keluar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "cari" && styles.tabActive]}
          onPress={() => {
            setTab("cari");
            setMerchant(null);
            setLayanan(null);
          }}
        >
          <Text
            style={[styles.tabText, tab === "cari" && styles.tabTextActive]}
          >
            Layanan
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "pesanan" && styles.tabActive]}
          onPress={() => setTab("pesanan")}
        >
          <Text
            style={[styles.tabText, tab === "pesanan" && styles.tabTextActive]}
          >
            Pesanan Saya
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "pesanan" ? (
        <OrdersView userId={userId} />
      ) : merchant ? (
        <MenuView
          userId={userId}
          merchant={merchant}
          onBack={() => setMerchant(null)}
          onOrdered={() => {
            setMerchant(null);
            setTab("pesanan");
          }}
        />
      ) : layanan === "kantin" ? (
        <>
          <TouchableOpacity onPress={() => setLayanan(null)}>
            <Text style={styles.back}>‹ Semua layanan</Text>
          </TouchableOpacity>
          <MerchantList onPick={setMerchant} />
        </>
      ) : layanan === "titip_beli" ? (
        <>
          <TouchableOpacity onPress={() => setLayanan(null)}>
            <Text style={styles.back}>‹ Semua layanan</Text>
          </TouchableOpacity>
          <TitipBeli userId={userId} />
        </>
      ) : (
        <ServiceGrid onPick={setLayanan} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#111" },
  logout: { color: "#d00", fontWeight: "600" },
  back: { color: "#00AA13", fontSize: 16, marginBottom: 8 },
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
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#111" },
  cardOff: { opacity: 0.55 },
  cardSub: { fontSize: 13, color: "#666", marginTop: 2 },
  price: { fontSize: 14, color: "#00AA13", marginTop: 2 },
  status: { fontSize: 14, fontWeight: "600", color: "#c60", marginTop: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  qtyBox: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00AA13",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 22,
  },
  qty: {
    fontSize: 16,
    fontWeight: "600",
    minWidth: 20,
    textAlign: "center",
    color: "#111",
  },
  checkout: { gap: 8, paddingTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fafafa",
  },
  primaryBtn: {
    backgroundColor: "#00AA13",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: "#00AA13",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryText: { color: "#00AA13", fontWeight: "700" },
});
