import type { IconName } from "@/components/ui";
import { Icon, LogoMark, shadow } from "@/components/ui";
import { C, F } from "@/constants/kampusgo";
import { notify } from "@/lib/notify";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import type { KeyboardTypeOptions } from "react-native";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type Role = "customer" | "driver" | "merchant";

const ROLES: { value: Role; label: string; icon: IconName }[] = [
  { value: "customer", label: "Mahasiswa", icon: "school" },
  { value: "merchant", label: "Penjual / Kantin", icon: "storefront" },
  { value: "driver", label: "Driver Kampus", icon: "two-wheeler" },
];

const KAMPUS = [
  "Universitas Indonesia (Depok & Salemba)",
  "Institut Teknologi Bandung",
  "Universitas Gadjah Mada",
  "Institut Teknologi Sepuluh Nopember",
  "Universitas Padjadjaran",
  "Universitas Diponegoro",
];

function Field({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  icon: IconName;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  const [tampil, setTampil] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <View style={s.box}>
        <Icon name={icon} size={20} color={C.muted} />
        <TextInput
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor={C.muted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!!secure && !tampil}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? "none"}
        />
        {secure && (
          <TouchableOpacity
            onPress={() => setTampil(!tampil)}
            accessibilityLabel={
              tampil ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
            }
          >
            <Icon
              name={tampil ? "visibility" : "visibility-off"}
              size={20}
              color={C.muted}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [kampus, setKampus] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [role, setRole] = useState<Role>("customer");
  const [setuju, setSetuju] = useState(false);
  const [pilihKampus, setPilihKampus] = useState(false);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";

  async function submit() {
    const e = email.trim().toLowerCase();
    if (!e || !password) {
      notify("Data belum lengkap", "Isi email dan kata sandi dulu ya.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      notify("Email tidak valid", "Periksa lagi penulisan emailnya.");
      return;
    }
    if (isRegister) {
      if (!nama.trim() || !kampus || (role !== "merchant" && !nim.trim())) {
        notify("Data belum lengkap", "Isi nama, kampus, dan NIM ya.");
        return;
      }
      if (password.length < 8) {
        notify("Kata sandi terlalu pendek", "Minimal 8 karakter.");
        return;
      }
      if (password !== konfirmasi) {
        notify("Kata sandi tidak sama", "Konfirmasi kata sandinya harus sama.");
        return;
      }
      if (!setuju) {
        notify(
          "Persetujuan diperlukan",
          "Centang persetujuan Ketentuan Layanan & Privasi dulu.",
        );
        return;
      }
    }
    setBusy(true);
    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email: e,
        password,
        options: { data: { nama: nama.trim(), nim: nim.trim(), kampus, role } },
      });
      if (error) {
        notify("Gagal daftar", error.message);
      } else if (!data.session) {
        notify("Cek email kamu", "Klik link konfirmasi di email, lalu masuk.");
        setMode("login");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: e,
        password,
      });
      if (error) notify("Gagal masuk", error.message);
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={s.flex}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.header}>
          {isRegister && (
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => setMode("login")}
              accessibilityLabel="Kembali ke Masuk"
            >
              <Icon name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          <View style={s.brand}>
            <LogoMark size={48} inverted />
            <View>
              <Text style={s.brandName}>KampusGo</Text>
              <Text style={s.brandTag}>GAS DULU URUSAN KAMPUS</Text>
            </View>
          </View>
          <Text style={s.title}>
            {isRegister ? "Gabung KampusGo" : "Masuk ke Akun Kampusmu"}
          </Text>
          <Text style={s.subtitle}>
            {isRegister
              ? "Urusan kampus, gas dulu."
              : "Urusan kampus, gas dulu. Praktis buat kantin & titipan."}
          </Text>
        </View>

        <View style={s.card}>
          {isRegister && (
            <>
              <Text style={s.label}>Pilih Peran Akun</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.roleRow}
              >
                {ROLES.map((r) => {
                  const on = role === r.value;
                  return (
                    <TouchableOpacity
                      key={r.value}
                      style={[s.role, on && s.roleOn]}
                      onPress={() => setRole(r.value)}
                    >
                      <Icon
                        name={r.icon}
                        size={18}
                        color={on ? "#fff" : C.muted}
                      />
                      <Text style={on ? s.roleTextOn : s.roleText}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={s.divider} />

              <Field
                label="Nama Lengkap"
                icon="person-outline"
                placeholder="cth. Dimas Arya Pratama"
                value={nama}
                onChangeText={setNama}
                autoCapitalize="words"
              />
              <View style={{ gap: 8 }}>
                <Text style={s.label}>Asal Kampus</Text>
                <TouchableOpacity
                  style={s.box}
                  onPress={() => setPilihKampus(true)}
                >
                  <Icon name="apartment" size={20} color={C.primary} />
                  <Text
                    style={[
                      s.input,
                      { paddingVertical: 14 },
                      !kampus && { color: C.muted },
                    ]}
                    numberOfLines={1}
                  >
                    {kampus || "Pilih kampus"}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={22} color={C.muted} />
                </TouchableOpacity>
              </View>
              <Field
                label={
                  role === "merchant"
                    ? "NIM (boleh dikosongkan)"
                    : "Nomor Induk Mahasiswa (NIM)"
                }
                icon="badge"
                placeholder="cth. 2106721990"
                value={nim}
                onChangeText={setNim}
                keyboardType="numeric"
              />
            </>
          )}

          <Field
            label={
              isRegister
                ? "Email Mahasiswa / Pribadi"
                : "Email Mahasiswa / Kampus"
            }
            icon="mail-outline"
            placeholder={
              isRegister
                ? "email@kampus.ac.id"
                : "nama@kampus.ac.id atau email aktif"
            }
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <Field
            label={isRegister ? "Kata Sandi" : "Kata Sandi / Password"}
            icon="lock-outline"
            placeholder={
              isRegister ? "Minimal 8 karakter" : "Masukkan kata sandi akun"
            }
            value={password}
            onChangeText={setPassword}
            secure
          />
          {isRegister && (
            <>
              <Field
                label="Konfirmasi Kata Sandi"
                icon="lock-outline"
                placeholder="Ulangi kata sandi"
                value={konfirmasi}
                onChangeText={setKonfirmasi}
                secure
              />
              <TouchableOpacity
                style={s.terms}
                onPress={() => setSetuju(!setuju)}
              >
                <View style={[s.check, setuju && s.checkOn]}>
                  {setuju && <Icon name="check" size={16} color="#fff" />}
                </View>
                <Text style={s.termsText}>
                  Saya menyetujui{" "}
                  <Text style={s.termsStrong}>
                    Ketentuan Layanan & Privasi KampusGo
                  </Text>
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={s.primaryBtn}
            onPress={submit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={s.primaryText}>
                  {isRegister ? "Daftar Akun KampusGo" : "Masuk Sekarang"}
                </Text>
                <Icon name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={() => setMode(isRegister ? "login" : "register")}
        >
          <Text style={s.switchText}>
            {isRegister ? "Sudah punya akun? " : "Belum punya akun? "}
            <Text style={s.switchLink}>
              {isRegister ? "Masuk di sini" : "Daftar Akun Baru"}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={pilihKampus}
        transparent
        animationType="slide"
        onRequestClose={() => setPilihKampus(false)}
      >
        <Pressable style={s.overlay} onPress={() => setPilihKampus(false)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            <Text style={s.sheetTitle}>Pilih Asal Kampus</Text>
            {KAMPUS.map((k) => (
              <TouchableOpacity
                key={k}
                style={s.sheetRow}
                onPress={() => {
                  setKampus(k);
                  setPilihKampus(false);
                }}
              >
                <Text
                  style={[
                    s.sheetText,
                    kampus === k && { color: C.primary, fontFamily: F.xbold },
                  ]}
                >
                  {k}
                </Text>
                {kampus === k && (
                  <Icon name="check" size={20} color={C.primary} />
                )}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    backgroundColor: C.primary,
    paddingTop: 28,
    paddingBottom: 56,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandName: { fontFamily: F.xbold, fontSize: 20, color: "#fff" },
  brandTag: {
    fontFamily: F.bold,
    fontSize: 10,
    letterSpacing: 0.8,
    color: "#C1CAFF",
  },
  title: {
    fontFamily: F.xbold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: "#fff",
  },
  subtitle: { fontFamily: F.reg, fontSize: 14, color: "#C1CAFF" },
  card: {
    marginTop: -28,
    marginHorizontal: 20,
    padding: 16,
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.line,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
    ...shadow,
  },
  label: { fontFamily: F.semi, fontSize: 14, color: C.navy },
  box: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  input: { flex: 1, fontFamily: F.reg, fontSize: 15, color: C.navy },
  roleRow: { gap: 8, paddingVertical: 4 },
  role: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "#fff",
  },
  roleOn: { backgroundColor: C.primary, borderColor: C.primary },
  roleText: { fontFamily: F.semi, fontSize: 14, color: C.muted },
  roleTextOn: { fontFamily: F.xbold, fontSize: 14, color: "#fff" },
  divider: { height: 1, backgroundColor: C.line },
  terms: { flexDirection: "row", alignItems: "center", gap: 10 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkOn: { backgroundColor: C.primary, borderColor: C.primary },
  termsText: { flex: 1, fontFamily: F.reg, fontSize: 13, color: C.muted },
  termsStrong: { fontFamily: F.semi, color: C.navy },
  primaryBtn: {
    minHeight: 52,
    flexDirection: "row",
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryText: { fontFamily: F.xbold, fontSize: 15, color: "#fff" },
  switchText: {
    fontFamily: F.reg,
    fontSize: 14,
    color: C.muted,
    textAlign: "center",
    marginTop: 22,
  },
  switchLink: { fontFamily: F.xbold, color: C.navy },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(10,15,30,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 4,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",
  },
  sheetTitle: {
    fontFamily: F.xbold,
    fontSize: 18,
    color: C.navy,
    marginBottom: 8,
  },
  sheetRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  sheetText: { flex: 1, fontFamily: F.semi, fontSize: 15, color: C.navy },
});
