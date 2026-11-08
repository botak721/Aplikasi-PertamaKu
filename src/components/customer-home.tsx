import { CariScreen } from "@/components/cari-screen";
import { ChatList } from "@/components/chat-list";
import { ChatRoom } from "@/components/chat-room";
import { DompetScreen } from "@/components/dompet-screen";
import { InfoKampusScreen } from "@/components/info-kampus";
import { OjekScreen } from "@/components/ojek-screen";
import { PromoScreen } from "@/components/promo-screen";
import { RatingScreen } from "@/components/rating-screen";
import { TemanBelajarScreen } from "@/components/teman-belajar";
import { TitipBeli } from "@/components/titip-beli";
import { TrackOrder } from "@/components/track-order";
import type { IconName } from "@/components/ui";
import { Icon, shadow } from "@/components/ui";
import { C, F } from "@/constants/kampusgo";
import { getCoords } from "@/lib/geo";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Merchant = { id: string; nama: string | null };
type MenuItem = { id: string; nama: string; harga: number };
type Tab = "beranda" | "pesanan" | "chat" | "akun";
type Filter = "aktif" | "selesai" | "dibatalkan";
type Pt = { lat: number; lng: number };

function rupiah(n: number) {
  return "Rp " + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function tgl(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}

function Header({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>{title}</Text>
      {children}
    </View>
  );
}

/* ---------------- Beranda ---------------- */

const LAYANAN: { key: string; icon: IconName; judul: string; desc: string }[] =
  [
    {
      key: "kantin",
      icon: "restaurant",
      judul: "Titip Kantin",
      desc: "Menu kantin fav",
    },
    {
      key: "titip_beli",
      icon: "shopping-bag",
      judul: "Titip Beli",
      desc: "Print, ATK & snack",
    },
    {
      key: "belajar",
      icon: "group",
      judul: "Teman Belajar",
      desc: "Kelompok & tugas",
    },
    {
      key: "ojek",
      icon: "two-wheeler",
      judul: "Ojek Kampus",
      desc: "Tarif flat keliling",
    },
    {
      key: "info",
      icon: "campaign",
      judul: "Info Kampus",
      desc: "Jadwal & event",
    },
    {
      key: "cari",
      icon: "storefront",
      judul: "Cari Kantin",
      desc: "Cari stan terdekat",
    },
  ];

const PROGRES: Record<string, { label: string; pct: number }> = {
  baru: { label: "Menunggu penjual", pct: 20 },
  diproses: { label: "Sedang disiapkan", pct: 45 },
  siap: { label: "Siap diantar", pct: 65 },
  diantar: { label: "Sedang diantar", pct: 85 },
};

function Beranda({
  nama,
  userId,
  onPick,
  onPromo,
  onDompet,
  onPesanan,
}: {
  nama: string;
  userId: string;
  onPick: (key: string) => void;
  onPromo: () => void;
  onDompet: () => void;
  onPesanan: () => void;
}) {
  const [q, setQ] = useState("");
  const [saldo, setSaldo] = useState<number | null>(null);
  const [kampus, setKampus] = useState("");
  const [aktif, setAktif] = useState<{
    merchant: string | null;
    status: string;
  } | null>(null);

  useEffect(() => {
    let hidup = true;
    const muat = async () => {
      const [s, p, o] = await Promise.all([
        supabase.rpc("saldo_saya"),
        supabase.from("profiles").select("kampus").eq("id", userId).single(),
        supabase
          .from("orders")
          .select("merchant_nama, status")
          .eq("customer_id", userId)
          .in("status", ["baru", "diproses", "siap", "diantar"])
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      if (!hidup) return;
      if (!s.error) setSaldo(s.data as number);
      setKampus((p.data as { kampus: string | null } | null)?.kampus ?? "");
      const baris = (
        (o.data ?? []) as { merchant_nama: string | null; status: string }[]
      )[0];
      setAktif(
        baris ? { merchant: baris.merchant_nama, status: baris.status } : null,
      );
    };
    muat();
    const timer = setInterval(muat, 15000);
    return () => {
      hidup = false;
      clearInterval(timer);
    };
  }, [userId]);

  const daftar = LAYANAN.filter((l) =>
    l.judul.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const info = aktif ? PROGRES[aktif.status] : null;

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={bs.header}>
        <View style={bs.topRow}>
          <View style={bs.campusPill}>
            <Icon name="location-on" size={16} color="#fff" />
            <Text style={bs.campusText} numberOfLines={1}>
              {kampus || "KampusGo"}
            </Text>
          </View>
          <View style={bs.avatar}>
            <Text style={bs.avatarText}>
              {nama.trim().charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
        </View>
        <View style={{ gap: 4 }}>
          <Text style={bs.hello}>Halo, {nama}! 👋</Text>
          <Text style={bs.title}>Mau titip apa hari ini?</Text>
          <Text style={bs.sub}>Urusan kampus, gas dulu.</Text>
        </View>
        <View style={bs.search}>
          <Icon name="search" size={20} color={C.muted} />
          <TextInput
            style={bs.searchInput}
            placeholder="Cari layanan kampus"
            placeholderTextColor={C.muted}
            value={q}
            onChangeText={setQ}
          />
        </View>
      </View>

      <View style={bs.content}>
        <View style={bs.wallet}>
          <View style={{ gap: 4 }}>
            <Text style={bs.walletLabel}>DOMPET KAMPUSGO</Text>
            <Text style={bs.walletAmount}>
              {saldo == null ? "Rp --.---" : rupiah(saldo)}
            </Text>
          </View>
          <View style={bs.walletActions}>
            <TouchableOpacity
              style={bs.action}
              onPress={onDompet}
              accessibilityLabel="Top Up"
            >
              <View style={bs.actionIcon}>
                <Icon name="add-circle-outline" size={22} color={C.primary} />
              </View>
              <Text style={bs.actionText}>Top Up</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={bs.action}
              onPress={onDompet}
              accessibilityLabel="Riwayat"
            >
              <View style={bs.actionIcon}>
                <Icon name="history" size={22} color={C.primary} />
              </View>
              <Text style={bs.actionText}>Riwayat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {aktif && info && (
          <View style={bs.aktifCard}>
            <View style={bs.aktifTop}>
              <View style={bs.dot} />
              <Text style={bs.aktifLabel}>PESANAN BERJALAN</Text>
            </View>
            <View style={bs.aktifRow}>
              <View style={bs.aktifIcon}>
                <Icon name="two-wheeler" size={24} color={C.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={bs.aktifTitle} numberOfLines={1}>
                  {aktif.merchant ?? "Penjual"}
                </Text>
                <Text style={bs.muted}>Titip Kantin • {info.label}</Text>
              </View>
            </View>
            <View style={bs.track}>
              <View style={[bs.fill, { width: `${info.pct}%` }]} />
            </View>
            <View style={bs.aktifBottom}>
              <Text style={bs.muted}>{info.label}</Text>
              <TouchableOpacity onPress={onPesanan}>
                <Text style={bs.cekLive}>Cek Live ›</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ gap: 12 }}>
          <Text style={bs.section}>Layanan Kampus</Text>
          <View style={bs.grid}>
            {daftar.map((l) => (
              <TouchableOpacity
                key={l.key}
                style={bs.tile}
                onPress={() => onPick(l.key)}
              >
                <View style={bs.tileIcon}>
                  <Icon name={l.icon} size={24} color={C.primary} />
                </View>
                <Text style={bs.tileTitle}>{l.judul}</Text>
                <Text style={bs.tileDesc} numberOfLines={2}>
                  {l.desc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {daftar.length === 0 && (
            <Text style={styles.empty}>Layanan tidak ditemukan.</Text>
          )}
        </View>

        <TouchableOpacity style={bs.promo} onPress={onPromo}>
          <View style={bs.promoChip}>
            <Icon name="bolt" size={14} color="#fff" />
            <Text style={bs.promoChipText}>Promo Mahasiswa</Text>
          </View>
          <Text style={bs.promoTitle}>Pakai voucher khusus mahasiswa</Text>
          <Text style={bs.promoText}>
            Lihat voucher aktif dan pakai kodenya saat checkout.
          </Text>
          <View style={bs.promoLink}>
            <Text style={bs.promoLinkText}>Lihat voucher</Text>
            <Icon name="arrow-forward" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const bs = StyleSheet.create({
  header: {
    backgroundColor: C.primary,
    paddingTop: 20,
    paddingBottom: 52,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 14,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  campusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  campusText: {
    fontFamily: F.semi,
    fontSize: 13,
    color: "#fff",
    flexShrink: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: F.xbold, fontSize: 16, color: C.primary },
  hello: { fontFamily: F.reg, fontSize: 14, color: "#fff" },
  title: {
    fontFamily: F.xbold,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: -0.5,
    color: "#fff",
  },
  sub: { fontFamily: F.reg, fontSize: 14, color: "#C1CAFF" },
  search: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  searchInput: { flex: 1, fontFamily: F.reg, fontSize: 14, color: C.navy },
  content: { paddingHorizontal: 20, gap: 20 },
  wallet: {
    marginTop: -30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    ...shadow,
  },
  walletLabel: {
    fontFamily: F.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: C.muted,
  },
  walletAmount: { fontFamily: F.xbold, fontSize: 24, color: C.navy },
  walletActions: { flexDirection: "row", gap: 12 },
  action: { alignItems: "center", gap: 4 },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  actionText: { fontFamily: F.semi, fontSize: 11, color: C.navy },
  aktifCard: {
    padding: 16,
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    ...shadow,
  },
  aktifTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  aktifLabel: {
    fontFamily: F.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    color: C.primary,
  },
  aktifRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  aktifIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  aktifTitle: { fontFamily: F.xbold, fontSize: 16, color: C.navy },
  muted: { fontFamily: F.reg, fontSize: 13, color: C.muted },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.soft,
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: 3, backgroundColor: C.primary },
  aktifBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cekLive: { fontFamily: F.xbold, fontSize: 14, color: C.primary },
  section: { fontFamily: F.xbold, fontSize: 18, color: C.navy },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  tile: {
    width: "31.5%",
    minHeight: 124,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
  },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  tileTitle: {
    fontFamily: F.xbold,
    fontSize: 13,
    color: C.navy,
    textAlign: "center",
  },
  tileDesc: {
    fontFamily: F.reg,
    fontSize: 11,
    color: C.muted,
    textAlign: "center",
  },
  promo: { padding: 16, gap: 8, backgroundColor: C.ink, borderRadius: 18 },
  promoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  promoChipText: { fontFamily: F.bold, fontSize: 12, color: "#fff" },
  promoTitle: {
    fontFamily: F.xbold,
    fontSize: 18,
    lineHeight: 24,
    color: "#fff",
  },
  promoText: { fontFamily: F.reg, fontSize: 13, color: "#C1CAFF" },
  promoLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  promoLinkText: { fontFamily: F.xbold, fontSize: 14, color: "#fff" },
});

/* ---------------- Layanan: Titip Kantin ---------------- */

function MerchantList({ onPick }: { onPick: (m: Merchant) => void }) {
  const [list, setList] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, nama")
      .eq("role", "merchant")
      .then(({ data, error }) => {
        if (error) notify("Gagal memuat penjual", error.message);
        else setList((data ?? []) as Merchant[]);
        setLoading(false);
      });
  }, []);

  if (loading)
    return <ActivityIndicator style={{ marginTop: 24 }} color={C.primary} />;

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
          <Text style={styles.muted}>Lihat menu</Text>
        </TouchableOpacity>
      )}
    />
  );
}

function MenuView({
  userId,
  merchant,
  kode,
  onKode,
  onOrdered,
}: {
  userId: string;
  merchant: Merchant;
  kode: string;
  onKode: (k: string) => void;
  onOrdered: () => void;
}) {
  void userId;
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [alamat, setAlamat] = useState("");
  const [sending, setSending] = useState(false);
  const [coords, setCoords] = useState<Pt | null>(null);
  const [locating, setLocating] = useState(false);
  const [kodeInput, setKodeInput] = useState("");
  const [promo, setPromo] = useState<{ diskon: number; nama: string } | null>(
    null,
  );
  const [promoError, setPromoError] = useState<string | null>(null);
  const [bayar, setBayar] = useState<"tunai" | "saldo">("tunai");
  const [saldo, setSaldo] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("menu_items")
      .select("id, nama, harga")
      .eq("merchant_id", merchant.id)
      .eq("tersedia", true)
      .order("nama")
      .then(({ data, error }) => {
        if (error) notify("Gagal memuat menu", error.message);
        else setItems((data ?? []) as MenuItem[]);
        setLoading(false);
      });
  }, [merchant.id]);

  useEffect(() => {
    supabase.rpc("saldo_saya").then(({ data, error }) => {
      if (!error) setSaldo(data as number);
    });
  }, []);

  const total = useMemo(
    () => items.reduce((sum, it) => sum + it.harga * (cart[it.id] ?? 0), 0),
    [items, cart],
  );
  const jumlahItem = Object.values(cart).reduce((a, b) => a + b, 0);

  useEffect(() => {
    if (!kode || total <= 0) {
      setPromo(null);
      setPromoError(null);
      return;
    }
    let batal = false;
    supabase
      .rpc("cek_voucher", { p_kode: kode, p_subtotal: total })
      .then(({ data, error }) => {
        if (batal) return;
        if (error) {
          setPromo(null);
          setPromoError(error.message);
        } else {
          const d = data as { diskon: number; nama: string };
          setPromo({ diskon: d.diskon, nama: d.nama });
          setPromoError(null);
        }
      });
    return () => {
      batal = true;
    };
  }, [kode, total]);

  function ubah(id: string, delta: number) {
    setCart((c) => {
      const next = Math.max(0, (c[id] ?? 0) + delta);
      const copy = { ...c };
      if (next === 0) delete copy[id];
      else copy[id] = next;
      return copy;
    });
  }

  async function pakaiLokasi() {
    setLocating(true);
    const c = await getCoords();
    setLocating(false);
    if (c) setCoords(c);
  }

  function pasangKode() {
    const k = kodeInput.trim().toUpperCase();
    if (!k) return;
    onKode(k);
    setKodeInput("");
  }

  const bayarTotal = Math.max(0, total - (promo?.diskon ?? 0));

  async function pesan() {
    if (jumlahItem === 0) {
      notify("Keranjang kosong", "Pilih menu dulu ya.");
      return;
    }
    if (!coords) {
      notify("Lokasi belum ada", 'Tekan "Gunakan lokasi saya sekarang" dulu.');
      return;
    }
    if (!alamat.trim()) {
      notify("Alamat kosong", "Isi gedung dan ruang tujuan dulu.");
      return;
    }
    if (kode && promoError) {
      notify("Promo belum bisa dipakai", promoError);
      return;
    }
    if (bayar === "saldo" && saldo != null && saldo < bayarTotal) {
      notify(
        "Saldo tidak cukup",
        "Isi saldo di Akun > Dompet, atau pilih bayar tunai.",
      );
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
      p_kode: kode || null,
      p_bayar: bayar,
    });
    setSending(false);
    if (error) {
      notify("Gagal membuat pesanan", error.message);
      return;
    }
    onKode("");
    notify("Pesanan terkirim!", "Penjual akan segera memprosesnya.");
    onOrdered();
  }

  return (
    <View style={styles.flex}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={C.primary} />
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
        <View style={styles.promoRow}>
          {kode ? (
            <View style={styles.promoChip}>
              <Text style={styles.promoChipText}>Promo {kode}</Text>
              <TouchableOpacity onPress={() => onKode("")}>
                <Text style={styles.promoLepas}>Lepas</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TextInput
                style={[styles.input, styles.flex]}
                placeholder="Kode promo"
                placeholderTextColor={C.muted}
                autoCapitalize="characters"
                value={kodeInput}
                onChangeText={setKodeInput}
              />
              <TouchableOpacity style={styles.pakaiBtn} onPress={pasangKode}>
                <Text style={styles.pakaiText}>Pakai</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        {promo && (
          <Text style={styles.diskonText}>
            Hemat {rupiah(promo.diskon)} dengan {promo.nama}
          </Text>
        )}
        {kode !== "" && total <= 0 && (
          <Text style={styles.muted}>
            Pilih menu untuk melihat potongan promo.
          </Text>
        )}
        {promoError && <Text style={styles.promoErr}>{promoError}</Text>}

        <View style={styles.payRow}>
          <TouchableOpacity
            style={[styles.payChip, bayar === "tunai" && styles.payChipOn]}
            onPress={() => setBayar("tunai")}
          >
            <Text style={bayar === "tunai" ? styles.payTextOn : styles.payText}>
              Tunai
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.payChip, bayar === "saldo" && styles.payChipOn]}
            onPress={() => setBayar("saldo")}
          >
            <Text style={bayar === "saldo" ? styles.payTextOn : styles.payText}>
              Saldo{saldo != null ? ` ${rupiah(saldo)}` : ""}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={pakaiLokasi}
          disabled={locating}
        >
          {locating ? (
            <ActivityIndicator color={C.primary} />
          ) : (
            <Text style={styles.outlineText}>
              {coords
                ? "Lokasi antar tersimpan ✓ (ketuk untuk perbarui)"
                : "Gunakan lokasi saya sekarang"}
            </Text>
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Gedung / ruang (contoh: Gedung B, Ruang 204)"
          placeholderTextColor={C.muted}
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
              Pesan ({jumlahItem} item) • {rupiah(bayarTotal)}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ServiceScreen({
  layanan,
  userId,
  initialMerchant,
  kode,
  onKode,
  onBack,
  onOrdered,
}: {
  layanan: string;
  userId: string;
  initialMerchant?: Merchant | null;
  kode: string;
  onKode: (k: string) => void;
  onBack: () => void;
  onOrdered: () => void;
}) {
  const [merchant, setMerchant] = useState<Merchant | null>(
    initialMerchant ?? null,
  );
  const judul = layanan === "kantin" ? "Titip Kantin" : "Titip Beli";

  function kembali() {
    if (merchant && !initialMerchant) setMerchant(null);
    else onBack();
  }

  return (
    <View style={styles.flex}>
      <View style={styles.header}>
        <TouchableOpacity onPress={kembali}>
          <Text style={styles.headerBack}>‹ Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {merchant ? (merchant.nama ?? "Penjual") : judul}
        </Text>
        {layanan === "kantin" && !merchant && (
          <Text style={styles.headerSub}>Pilih kantin atau warung</Text>
        )}
      </View>
      <View style={styles.serviceBody}>
        {layanan === "kantin" ? (
          merchant ? (
            <MenuView
              userId={userId}
              merchant={merchant}
              kode={kode}
              onKode={onKode}
              onOrdered={onOrdered}
            />
          ) : (
            <MerchantList onPick={setMerchant} />
          )
        ) : (
          <TitipBeli userId={userId} />
        )}
      </View>
    </View>
  );
}

/* ---------------- Pesanan ---------------- */

const ORDER_LABEL: Record<string, string> = {
  baru: "Menunggu penjual",
  diproses: "Disiapkan",
  siap: "Siap diantar",
  diantar: "Diantar",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};
const TITIP_LABEL: Record<string, string> = {
  terbuka: "Dicari teman",
  diambil: "Dibelikan",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

type Row = {
  key: string;
  at: string;
  jenis: string;
  label: string;
  status: string;
  kategori: Filter;
  ringkas: string;
  total: number;
  dinilai: boolean;
  order: { id: string; dest: Pt | null; merchant: Pt | null } | null;
};

function toPt(lat: unknown, lng: unknown): Pt | null {
  return typeof lat === "number" && typeof lng === "number"
    ? { lat, lng }
    : null;
}

function PesananTab({
  userId,
  initial,
  onRate,
}: {
  userId: string;
  initial: Filter;
  onRate: (orderId: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>(initial);
  const [rows, setRows] = useState<Row[]>([]);
  const [refreshing, setRefreshing] = useState(true);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      const [o, t, r] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id, merchant_nama, total, status, created_at, dest_lat, dest_lng, merchant_lat, merchant_lng, order_items(jumlah)",
          )
          .eq("customer_id", userId)
          .order("created_at", { ascending: false }),
        supabase
          .from("titip_requests")
          .select("id, barang, estimasi_harga, upah, status, created_at")
          .eq("requester_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("ratings").select("order_id").eq("customer_id", userId),
      ]);
      const err = o.error ?? t.error ?? r.error;
      if (err) {
        if (!silent) notify("Gagal memuat pesanan", err.message);
      } else {
        const sudah = new Set(
          ((r.data ?? []) as any[]).map((x) => x.order_id as string),
        );
        const orderRows: Row[] = ((o.data ?? []) as any[]).map((x) => ({
          key: "o" + x.id,
          at: x.created_at,
          jenis: "Titip Kantin",
          label: ORDER_LABEL[x.status] ?? x.status,
          status: x.status,
          kategori:
            x.status === "selesai"
              ? "selesai"
              : x.status === "dibatalkan"
                ? "dibatalkan"
                : "aktif",
          ringkas: `${tgl(x.created_at)} · ${(x.order_items ?? []).reduce(
            (a: number, i: any) => a + i.jumlah,
            0,
          )} item · ${x.merchant_nama ?? "Penjual"}`,
          total: x.total,
          dinilai: sudah.has(x.id),
          order: {
            id: x.id,
            dest: toPt(x.dest_lat, x.dest_lng),
            merchant: toPt(x.merchant_lat, x.merchant_lng),
          },
        }));
        const titipRows: Row[] = ((t.data ?? []) as any[]).map((x) => ({
          key: "t" + x.id,
          at: x.created_at,
          jenis: "Titip Beli",
          label: TITIP_LABEL[x.status] ?? x.status,
          status: x.status,
          kategori:
            x.status === "selesai"
              ? "selesai"
              : x.status === "dibatalkan"
                ? "dibatalkan"
                : "aktif",
          ringkas: `${tgl(x.created_at)} · ${x.barang}`,
          total: x.estimasi_harga + x.upah,
          dinilai: true,
          order: null,
        }));
        setRows(
          [...orderRows, ...titipRows].sort((a, b) => (a.at < b.at ? 1 : -1)),
        );
      }
      setRefreshing(false);
    },
    [userId],
  );

  useEffect(() => {
    load();
    const timer = setInterval(() => load(true), 10000);
    return () => clearInterval(timer);
  }, [load]);

  const shown = rows.filter((x) => x.kategori === filter);
  const FILTERS: { key: Filter; label: string }[] = [
    { key: "aktif", label: "Aktif" },
    { key: "selesai", label: "Selesai" },
    { key: "dibatalkan", label: "Dibatalkan" },
  ];

  return (
    <View style={styles.flex}>
      <Header title="Pesanan">
        <View style={styles.pillRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.pill,
                filter === f.key ? styles.pillOn : styles.pillOff,
              ]}
              onPress={() => setFilter(f.key)}
            >
              <Text
                style={
                  filter === f.key ? styles.pillTextOn : styles.pillTextOff
                }
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Header>
      <FlatList
        style={styles.flex}
        contentContainerStyle={styles.body}
        data={shown}
        keyExtractor={(x) => x.key}
        refreshing={refreshing}
        onRefresh={() => load()}
        ListEmptyComponent={
          <Text style={styles.empty}>Belum ada pesanan di sini.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.jenis}</Text>
              <Text style={styles.badge}>{item.label}</Text>
            </View>
            <Text style={styles.muted}>{item.ringkas}</Text>
            <Text style={styles.totalText}>{rupiah(item.total)}</Text>
            {item.order && item.status === "diantar" && (
              <TrackOrder
                orderId={item.order.id}
                dest={item.order.dest}
                merchant={item.order.merchant}
              />
            )}
            {item.order && item.status === "selesai" && !item.dinilai && (
              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={() => onRate(item.order!.id)}
              >
                <Text style={styles.outlineText}>Beri nilai driver</Text>
              </TouchableOpacity>
            )}
            {item.order && item.status === "selesai" && item.dinilai && (
              <Text style={styles.muted}>Sudah dinilai ✓</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

/* ---------------- Chat ---------------- */

function ChatTab() {
  return (
    <View style={styles.flex}>
      <Header title="Chat" />
      <View style={styles.centerBox}>
        <Text style={styles.cardTitle}>Belum ada percakapan</Text>
        <Text style={[styles.muted, { textAlign: "center", marginTop: 6 }]}>
          Chat dengan driver dan teman yang membantumu akan muncul di sini.
          Fitur ini segera hadir.
        </Text>
      </View>
    </View>
  );
}

/* ---------------- Akun ---------------- */

function AkunTab({
  userId,
  nama,
  onRiwayat,
  onDompet,
}: {
  userId: string;
  nama: string;
  onRiwayat: () => void;
  onDompet: () => void;
}) {
  const [kampus, setKampus] = useState("");
  const [nPesanan, setNPesanan] = useState<number | null>(null);
  const [nTitip, setNTitip] = useState<number | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("kampus")
      .eq("id", userId)
      .single()
      .then(({ data }) =>
        setKampus((data as { kampus: string | null } | null)?.kampus ?? ""),
      );
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", userId)
      .then(({ count }) => setNPesanan(count ?? 0));
    supabase
      .from("titip_requests")
      .select("id", { count: "exact", head: true })
      .eq("requester_id", userId)
      .then(({ count }) => setNTitip(count ?? 0));
    supabase.rpc("saldo_saya").then(({ data, error }) => {
      if (!error) setSaldo(data as number);
    });
  }, [userId]);

  const MENU: { label: string; value?: string; onPress: () => void }[] = [
    { label: "Riwayat pesanan", onPress: onRiwayat },
    {
      label: "Dompet",
      value: saldo != null ? rupiah(saldo) : undefined,
      onPress: onDompet,
    },
    {
      label: "Alamat antar",
      onPress: () => notify("Alamat antar", "Segera hadir."),
    },
    { label: "Bantuan", onPress: () => notify("Bantuan", "Segera hadir.") },
  ];

  return (
    <View style={styles.flex}>
      <Header title="Akun" />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {nama.trim().charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{nama}</Text>
            <Text style={styles.muted}>{kampus || "Kampus belum diisi"}</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{nPesanan ?? "–"}</Text>
            <Text style={styles.muted}>Pesanan</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{nTitip ?? "–"}</Text>
            <Text style={styles.muted}>Titipan</Text>
          </View>
        </View>

        {MENU.map((m) => (
          <TouchableOpacity
            key={m.label}
            style={styles.menuRow}
            onPress={m.onPress}
          >
            <Text style={styles.menuText}>{m.label}</Text>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              {m.value ? <Text style={styles.menuValue}>{m.value}</Text> : null}
              <Text style={styles.muted}>›</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => supabase.auth.signOut()}
        >
          <Text style={styles.logoutText}>Keluar</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ---------------- Navigasi bawah + wadah ---------------- */

const NAV: { key: Tab; label: string; icon: IconName }[] = [
  { key: "beranda", label: "Beranda", icon: "home" },
  { key: "pesanan", label: "Pesanan", icon: "receipt-long" },
  { key: "chat", label: "Chat", icon: "chat-bubble-outline" },
  { key: "akun", label: "Akun", icon: "person-outline" },
];

function BottomNav({
  tab,
  onChange,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <View style={ns.bar}>
      {NAV.map((n) => {
        const on = tab === n.key;
        return (
          <TouchableOpacity
            key={n.key}
            style={ns.item}
            onPress={() => onChange(n.key)}
            accessibilityLabel={n.label}
          >
            <Icon name={n.icon} size={24} color={on ? C.primary : C.muted} />
            <Text style={on ? ns.on : ns.off}>{n.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const ns = StyleSheet.create({
  bar: {
    height: 68,
    flexDirection: "row",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: C.line,
    shadowColor: "#0A0F1E",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  on: { fontFamily: F.xbold, fontSize: 11, color: C.primary },
  off: { fontFamily: F.reg, fontSize: 11, color: C.muted },
});

export function CustomerHome({
  userId,
  nama,
}: {
  userId: string;
  nama: string;
}) {
  const [tab, setTab] = useState<Tab>("beranda");
  const [layanan, setLayanan] = useState<string | null>(null);
  const [pesananFilter, setPesananFilter] = useState<Filter>("aktif");
  const [room, setRoom] = useState<{
    type: "order" | "titip";
    id: string;
  } | null>(null);
  const [rating, setRating] = useState<string | null>(null);
  const [cari, setCari] = useState(false);
  const [toko, setToko] = useState<Merchant | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const [kodePromo, setKodePromo] = useState("");
  const [dompet, setDompet] = useState(false);

  function selesaiPesan() {
    setLayanan(null);
    setToko(null);
    setPesananFilter("aktif");
    setTab("pesanan");
  }

  if (rating) {
    return <RatingScreen orderId={rating} onDone={() => setRating(null)} />;
  }

  if (dompet) {
    return <DompetScreen onBack={() => setDompet(false)} />;
  }

  if (room) {
    return (
      <ChatRoom
        threadType={room.type}
        threadId={room.id}
        userId={userId}
        onBack={() => setRoom(null)}
      />
    );
  }

  if (promoOpen) {
    return (
      <PromoScreen
        kode={kodePromo}
        onBack={() => setPromoOpen(false)}
        onPakai={(k) => {
          setKodePromo(k);
          setPromoOpen(false);
        }}
      />
    );
  }

  if (toko) {
    return (
      <ServiceScreen
        layanan="kantin"
        userId={userId}
        initialMerchant={toko}
        kode={kodePromo}
        onKode={setKodePromo}
        onBack={() => setToko(null)}
        onOrdered={selesaiPesan}
      />
    );
  }

  if (cari) {
    return (
      <CariScreen
        onBack={() => setCari(false)}
        onPick={(m) => {
          setCari(false);
          setToko(m);
        }}
      />
    );
  }

  if (layanan === "belajar") {
    return (
      <TemanBelajarScreen userId={userId} onBack={() => setLayanan(null)} />
    );
  }

  if (layanan === "ojek") {
    return <OjekScreen userId={userId} onBack={() => setLayanan(null)} />;
  }

  if (layanan === "info") {
    return <InfoKampusScreen onBack={() => setLayanan(null)} />;
  }

  if (layanan) {
    return (
      <ServiceScreen
        layanan={layanan}
        userId={userId}
        kode={kodePromo}
        onKode={setKodePromo}
        onBack={() => setLayanan(null)}
        onOrdered={selesaiPesan}
      />
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.flex}>
        {tab === "beranda" && (
          <Beranda
            nama={nama}
            userId={userId}
            onPick={(key) => (key === "cari" ? setCari(true) : setLayanan(key))}
            onPromo={() => setPromoOpen(true)}
            onDompet={() => setDompet(true)}
            onPesanan={() => {
              setPesananFilter("aktif");
              setTab("pesanan");
            }}
          />
        )}
        {tab === "pesanan" && (
          <PesananTab
            key={pesananFilter}
            userId={userId}
            initial={pesananFilter}
            onRate={setRating}
          />
        )}
        {tab === "chat" && (
          <ChatList
            userId={userId}
            onOpen={(type, id) => setRoom({ type, id })}
          />
        )}
        {tab === "akun" && (
          <AkunTab
            userId={userId}
            nama={nama}
            onRiwayat={() => {
              setPesananFilter("selesai");
              setTab("pesanan");
            }}
            onDompet={() => setDompet(true)}
          />
        )}
      </View>
      <BottomNav tab={tab} onChange={setTab} />
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
  headerTitle: { fontFamily: F.xbold, fontSize: 24, color: "#fff" },
  headerSub: { fontFamily: F.reg, fontSize: 14, color: "#fff", opacity: 0.9 },
  headerBack: { fontFamily: F.semi, fontSize: 15, color: "#fff" },
  search: {
    backgroundColor: "#fff",
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  searchInput: { fontFamily: F.reg, fontSize: 14, color: C.navy },
  body: { padding: 22, gap: 14 },
  serviceBody: { flex: 1, paddingHorizontal: 22, paddingTop: 16 },
  sectionTitle: { fontFamily: F.xbold, fontSize: 18, color: C.navy },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  service: {
    width: "48%",
    minHeight: 112,
    padding: 14,
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DDE5F7",
  },
  serviceOff: { opacity: 0.6 },
  serviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceEmoji: { fontSize: 22 },
  serviceTitle: { fontFamily: F.xbold, fontSize: 15, color: C.navy },
  muted: { fontFamily: F.reg, fontSize: 13, color: C.muted },
  empty: {
    fontFamily: F.reg,
    textAlign: "center",
    color: C.muted,
    marginTop: 24,
  },
  promo: { backgroundColor: C.ink, borderRadius: 16, padding: 16, gap: 4 },
  promoTitle: { fontFamily: F.xbold, fontSize: 16, color: C.navy },
  promoText: { fontFamily: F.reg, fontSize: 13, color: C.navy },

  card: {
    padding: 14,
    gap: 6,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DDE5F7",
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontFamily: F.xbold, fontSize: 16, color: C.navy },
  badge: {
    fontFamily: F.xbold,
    fontSize: 12,
    color: C.primary,
    backgroundColor: C.soft,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  totalText: { fontFamily: F.xbold, fontSize: 15, color: C.navy },
  price: { fontFamily: F.semi, fontSize: 14, color: C.primary, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDE5F7",
    marginBottom: 8,
  },
  qtyBox: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: F.bold,
    lineHeight: 22,
  },
  qty: {
    fontFamily: F.bold,
    fontSize: 16,
    minWidth: 20,
    textAlign: "center",
    color: C.navy,
  },
  checkout: { gap: 8, paddingVertical: 10 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: F.reg,
    fontSize: 15,
    color: C.navy,
    backgroundColor: "#fff",
  },
  primaryBtn: {
    minHeight: 52,
    backgroundColor: C.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: { fontFamily: F.xbold, fontSize: 15, color: "#fff" },
  outlineBtn: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: C.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineText: { fontFamily: F.bold, color: C.primary },
  promoRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  promoChip: {
    flex: 1,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: C.soft,
  },
  promoChipText: { fontFamily: F.xbold, fontSize: 14, color: C.primary },
  promoLepas: { fontFamily: F.bold, fontSize: 13, color: C.danger },
  pakaiBtn: {
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  pakaiText: { fontFamily: F.xbold, fontSize: 14, color: "#fff" },
  diskonText: { fontFamily: F.bold, fontSize: 13, color: C.primary },
  promoErr: { fontFamily: F.semi, fontSize: 13, color: C.danger },
  payRow: { flexDirection: "row", gap: 8 },
  payChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  payChipOn: { backgroundColor: C.primary, borderColor: C.primary },
  payText: { fontFamily: F.semi, fontSize: 13, color: C.navy },
  payTextOn: { fontFamily: F.xbold, fontSize: 13, color: "#fff" },
  menuValue: { fontFamily: F.bold, fontSize: 14, color: C.primary },

  pillRow: { flexDirection: "row", gap: 8 },
  pill: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    justifyContent: "center",
  },
  pillOn: { backgroundColor: "#fff" },
  pillOff: { backgroundColor: "rgba(255,255,255,0.18)" },
  pillTextOn: { fontFamily: F.xbold, fontSize: 14, color: C.primary },
  pillTextOff: { fontFamily: F.semi, fontSize: 14, color: "#fff" },

  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DDE5F7",
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontFamily: F.xbold, fontSize: 22, color: C.primary },
  statRow: { flexDirection: "row", gap: 12 },
  stat: {
    flex: 1,
    alignItems: "center",
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#DDE5F7",
  },
  statNum: { fontFamily: F.xbold, fontSize: 22, color: C.primary },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 52,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDE5F7",
  },
  menuText: { fontFamily: F.semi, fontSize: 15, color: C.navy },
  logoutBtn: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.danger,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  logoutText: { fontFamily: F.xbold, color: C.danger },

  nav: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 6,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#DDE5F7",
  },
  navBtn: {
    minHeight: 44,
    minWidth: 76,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnOn: { backgroundColor: C.soft },
  navTextOn: { fontFamily: F.xbold, fontSize: 14, color: C.primary },
  navTextOff: { fontFamily: F.reg, fontSize: 14, color: C.muted },
});
