import type { MapMarker } from "@/components/live-map";
import { LiveMap } from "@/components/live-map";
import { Icon, shadow } from "@/components/ui";
import { C, F } from "@/constants/kampusgo";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Pt = { lat: number; lng: number };
type Order = {
  id: string;
  merchant_nama: string | null;
  alamat: string;
  total: number;
  diskon: number;
  voucher_kode: string | null;
  metode_bayar: "tunai" | "saldo";
  status: "baru" | "diproses" | "siap" | "diantar" | "selesai" | "dibatalkan";
  driver_id: string | null;
  dest_lat: number | null;
  dest_lng: number | null;
  merchant_lat: number | null;
  merchant_lng: number | null;
  order_items: { nama: string; jumlah: number; harga: number }[];
};

const COLS =
  "id, merchant_nama, alamat, total, diskon, voucher_kode, metode_bayar, status, driver_id, dest_lat, dest_lng, merchant_lat, merchant_lng, order_items(nama, jumlah, harga)";

const JUDUL: Record<string, string> = {
  baru: "Menunggu kantin menerima pesanan",
  diproses: "Makanan sedang dimasak",
  siap: "Menunggu driver mengambil makanan",
  diantar: "Sedang diantar oleh driver mahasiswa",
  selesai: "Pesanan selesai",
  dibatalkan: "Pesanan dibatalkan",
};
const POSISI: Record<string, number> = {
  baru: -1,
  diproses: 1,
  siap: 2,
  diantar: 3,
  selesai: 5,
};
const LANGKAH = [
  "Pesanan diterima kantin",
  "Makanan sedang dimasak",
  "Driver mengambil makanan",
  "Dalam pengantaran ke lokasimu",
  "Pesanan selesai",
];

function rupiah(n: number) {
  return "Rp " + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function DetailPesananScreen({
  orderId,
  onBack,
  onChat,
  onRate,
}: {
  orderId: string;
  onBack: () => void;
  onChat: (orderId: string) => void;
  onRate: (orderId: string) => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [driverNama, setDriverNama] = useState<string | null>(null);
  const [driverPos, setDriverPos] = useState<Pt | null>(null);
  const [dinilai, setDinilai] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      const { data, error } = await supabase
        .from("orders")
        .select(COLS)
        .eq("id", orderId)
        .single();
      if (error || !data) {
        if (manual || loading)
          notify(
            "Gagal memuat pesanan",
            error?.message ?? "Pesanan tidak ditemukan.",
          );
        setLoading(false);
        setRefreshing(false);
        return;
      }
      const o = data as unknown as Order;
      setOrder(o);

      if (o.driver_id) {
        const info = await supabase.rpc("chat_info", {
          p_type: "order",
          p_id: orderId,
        });
        const nama = (info.data as { nama?: string } | null)?.nama;
        if (nama) setDriverNama(nama);
      }
      if (o.status === "diantar") {
        const loc = await supabase
          .from("driver_locations")
          .select("lat, lng")
          .eq("order_id", orderId)
          .maybeSingle();
        setDriverPos((loc.data as Pt | null) ?? null);
      } else {
        setDriverPos(null);
      }
      if (o.status === "selesai") {
        const rt = await supabase
          .from("ratings")
          .select("order_id")
          .eq("order_id", orderId)
          .maybeSingle();
        setDinilai(!!rt.data);
      }
      setLoading(false);
      setRefreshing(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderId],
  );

  useEffect(() => {
    load();
    const timer = setInterval(() => load(), 5000);
    return () => clearInterval(timer);
  }, [load]);

  const kode = "#KG-" + orderId.slice(0, 4).toUpperCase();

  const top = (
    <View style={s.topBar}>
      <TouchableOpacity
        style={s.backBtn}
        onPress={onBack}
        accessibilityLabel="Kembali"
      >
        <Icon name="arrow-back" size={22} color={C.navy} />
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={s.topSub}>KANTIN & TITIP KAMPUS</Text>
        <Text style={s.topTitle}>Detail Pesanan {kode}</Text>
      </View>
    </View>
  );

  if (loading || !order) {
    return (
      <View style={s.flex}>
        {top}
        <ActivityIndicator style={{ marginTop: 24 }} color={C.primary} />
      </View>
    );
  }

  const pos = POSISI[order.status];
  const batal = order.status === "dibatalkan";
  const subtotal = order.total + order.diskon;
  const markers: MapMarker[] = [];
  if (order.merchant_lat != null && order.merchant_lng != null) {
    markers.push({
      id: "m",
      lat: order.merchant_lat,
      lng: order.merchant_lng,
      label: "Stand",
      color: C.muted,
    });
  }
  if (order.dest_lat != null && order.dest_lng != null) {
    markers.push({
      id: "d",
      lat: order.dest_lat,
      lng: order.dest_lng,
      label: "Kamu",
      color: C.primary,
    });
  }
  if (driverPos)
    markers.push({
      id: "drv",
      lat: driverPos.lat,
      lng: driverPos.lng,
      label: "Driver",
      color: C.navy,
    });

  return (
    <View style={s.flex}>
      {top}
      <ScrollView
        contentContainerStyle={s.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
          />
        }
      >
        <View style={s.hero}>
          <View style={s.heroPills}>
            <View style={s.heroPill}>
              <Text style={s.heroPillText} numberOfLines={1}>
                {order.alamat}
              </Text>
            </View>
            {order.status === "diantar" && (
              <View style={s.livePill}>
                <View style={s.liveDot} />
                <Text style={s.livePillText}>Live Tracking</Text>
              </View>
            )}
          </View>
          <Text style={s.heroTitle}>{JUDUL[order.status]}</Text>
          <View style={s.heroRow}>
            <Icon name="location-on" size={18} color="#C1CAFF" />
            <Text style={s.heroSub}>Menuju {order.alamat}</Text>
          </View>

          {!batal && (
            <View style={s.steps}>
              {LANGKAH.map((l, i) => {
                const selesai = i < pos;
                const aktif = i === pos;
                return aktif ? (
                  <View key={l} style={s.stepNow}>
                    <View style={s.stepNowIcon}>
                      <Icon name="two-wheeler" size={18} color={C.primary} />
                    </View>
                    <Text style={s.stepNowText}>{l}</Text>
                  </View>
                ) : (
                  <View key={l} style={s.stepRow}>
                    <View style={[s.stepDot, selesai && s.stepDotOn]}>
                      {selesai && <Icon name="check" size={14} color="#fff" />}
                    </View>
                    <Text
                      style={[s.stepText, selesai ? s.stepDone : s.stepPending]}
                    >
                      {l}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {order.status === "diantar" && markers.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardLabel}>PELACAKAN LIVE</Text>
            <LiveMap markers={markers} height={220} />
            <Text style={s.muted}>
              {driverPos
                ? "Posisi driver diperbarui tiap 5 detik."
                : "Driver belum membagikan lokasi."}
            </Text>
          </View>
        )}

        {order.driver_id && (
          <View style={s.card}>
            <Text style={s.cardLabel}>DRIVER MAHASISWA REKAN</Text>
            <View style={s.driverRow}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {(driverNama ?? "D").trim().charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={s.driverName}>{driverNama ?? "Driver"}</Text>
            </View>
            <TouchableOpacity
              style={s.primaryBtn}
              onPress={() => onChat(order.id)}
            >
              <Icon name="chat-bubble-outline" size={20} color="#fff" />
              <Text style={s.primaryText}>Chat Driver</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.card}>
          <View style={s.standRow}>
            <View style={s.standIcon}>
              <Icon name="storefront" size={22} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.cardLabel}>KANTIN KAMPUS</Text>
              <Text style={s.standName}>{order.merchant_nama ?? "Stand"}</Text>
            </View>
          </View>
          <View style={s.line} />
          {order.order_items.map((it, i) => (
            <View key={i} style={s.itemRow}>
              <Text style={s.itemName}>
                {it.jumlah}x {it.nama}
              </Text>
              <Text style={s.itemPrice}>{rupiah(it.harga * it.jumlah)}</Text>
            </View>
          ))}
        </View>

        <View style={s.card}>
          <View style={s.standRow}>
            <Text style={s.payTitle}>Rincian Pembayaran</Text>
            <Text style={s.payBadge}>
              {order.metode_bayar === "saldo" ? "KampusPay" : "Tunai"}
            </Text>
          </View>
          <View style={s.line} />
          <View style={s.itemRow}>
            <Text style={s.muted}>Subtotal Makanan</Text>
            <Text style={s.itemPrice}>{rupiah(subtotal)}</Text>
          </View>
          {order.diskon > 0 && (
            <View style={s.itemRow}>
              <Text style={s.promoText}>
                Diskon Voucher {order.voucher_kode ?? ""}
              </Text>
              <Text style={s.promoText}>-{rupiah(order.diskon)}</Text>
            </View>
          )}
          <View style={s.line} />
          <View style={s.itemRow}>
            <View>
              <Text style={s.totalLabel}>Total Pembayaran</Text>
              <Text style={s.promoText}>
                {order.metode_bayar === "saldo"
                  ? "Lunas via KampusPay"
                  : "Bayar tunai ke driver"}
              </Text>
            </View>
            <Text style={s.total}>{rupiah(order.total)}</Text>
          </View>
        </View>

        {order.status === "selesai" && !dinilai && (
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => onRate(order.id)}
          >
            <Icon name="star-outline" size={20} color="#fff" />
            <Text style={s.primaryText}>Beri Nilai Driver</Text>
          </TouchableOpacity>
        )}
        {order.status === "selesai" && dinilai && (
          <Text style={s.muted}>Kamu sudah menilai driver ✓</Text>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  topSub: {
    fontFamily: F.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: C.muted,
  },
  topTitle: { fontFamily: F.xbold, fontSize: 18, color: C.navy },
  body: { padding: 20, gap: 14 },
  hero: { backgroundColor: C.primary, borderRadius: 24, padding: 18, gap: 12 },
  heroPills: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  heroPill: {
    flexShrink: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: C.ink,
  },
  heroPillText: { fontFamily: F.bold, fontSize: 12, color: "#fff" },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#fff",
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  livePillText: { fontFamily: F.bold, fontSize: 12, color: C.primary },
  heroTitle: {
    fontFamily: F.xbold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.4,
    color: "#fff",
  },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroSub: { flex: 1, fontFamily: F.reg, fontSize: 14, color: "#C1CAFF" },
  steps: {
    backgroundColor: "rgba(10,15,30,0.28)",
    borderRadius: 18,
    padding: 12,
    gap: 10,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 28,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotOn: { backgroundColor: C.primary, borderColor: "#fff" },
  stepText: { fontFamily: F.semi, fontSize: 14 },
  stepDone: {
    color: "rgba(255,255,255,0.7)",
    textDecorationLine: "line-through",
  },
  stepPending: { color: "rgba(255,255,255,0.45)" },
  stepNow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  stepNowIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNowText: { flex: 1, fontFamily: F.xbold, fontSize: 14, color: C.primary },
  card: {
    padding: 16,
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    ...shadow,
  },
  cardLabel: {
    fontFamily: F.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: C.muted,
  },
  muted: { fontFamily: F.reg, fontSize: 13, color: C.muted },
  driverRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: F.xbold, fontSize: 20, color: C.primary },
  driverName: { fontFamily: F.xbold, fontSize: 17, color: C.navy },
  primaryBtn: {
    minHeight: 52,
    flexDirection: "row",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontFamily: F.xbold, fontSize: 15, color: "#fff" },
  standRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
  },
  standIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  standName: { fontFamily: F.xbold, fontSize: 17, color: C.navy },
  line: { height: 1, backgroundColor: C.line },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  itemName: { flex: 1, fontFamily: F.semi, fontSize: 14, color: C.navy },
  itemPrice: { fontFamily: F.semi, fontSize: 14, color: C.navy },
  payTitle: { fontFamily: F.xbold, fontSize: 16, color: C.navy },
  payBadge: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.primary,
    backgroundColor: C.soft,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  promoText: { fontFamily: F.semi, fontSize: 13, color: C.primary },
  totalLabel: { fontFamily: F.xbold, fontSize: 16, color: C.navy },
  total: { fontFamily: F.xbold, fontSize: 22, color: C.primary },
});
