import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { MerchantMenu } from "@/components/merchant-menu";

type Role = "customer" | "driver" | "merchant";
type Profile = { nama: string | null; role: Role };

const ROLES: { value: Role; label: string }[] = [
  { value: "customer", label: "Customer" },
  { value: "driver", label: "Driver" },
  { value: "merchant", label: "Penjual" },
];

function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("customer");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email || !password || (mode === "register" && !nama)) {
      Alert.alert("Data belum lengkap", "Isi semua kolom dulu ya.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Password terlalu pendek", "Minimal 6 karakter.");
      return;
    }
    setBusy(true);
    if (mode === "register") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nama, role } },
      });
      if (error) {
        Alert.alert("Gagal daftar", error.message);
      } else if (!data.session) {
        Alert.alert(
          "Cek email kamu",
          "Klik link konfirmasi di email, lalu login.",
        );
        setMode("login");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) Alert.alert("Gagal login", error.message);
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.form}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Gojek Mini</Text>
        <Text style={styles.subtitle}>
          {mode === "login" ? "Masuk ke akunmu" : "Buat akun baru"}
        </Text>

        {mode === "register" && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Nama"
              placeholderTextColor="#888"
              value={nama}
              onChangeText={setNama}
            />
            <Text style={styles.label}>Daftar sebagai</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r.value}
                  style={[
                    styles.roleBtn,
                    role === r.value && styles.roleBtnActive,
                  ]}
                  onPress={() => setRole(r.value)}
                >
                  <Text
                    style={[
                      styles.roleText,
                      role === r.value && styles.roleTextActive,
                    ]}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#888"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#888"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              {mode === "login" ? "Masuk" : "Daftar"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode(mode === "login" ? "register" : "login")}
        >
          <Text style={styles.link}>
            {mode === "login"
              ? "Belum punya akun? Daftar"
              : "Sudah punya akun? Masuk"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function RoleHome({ profile }: { profile: Profile | null }) {
  const roleLabel =
    profile?.role === "driver"
      ? "Driver"
      : profile?.role === "merchant"
        ? "Penjual"
        : "Customer";

  return (
    <View style={styles.center}>
      <Text style={styles.title}>Halo, {profile?.nama ?? "Pengguna"}!</Text>
      <Text style={styles.subtitle}>Kamu masuk sebagai {roleLabel}</Text>
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.primaryText}>Keluar</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("nama, role")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setProfile(data as Profile | null));
  }, [session]);

  return (
    <SafeAreaView style={styles.screen}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00AA13" />
        </View>
      ) : session ? (
        profile?.role === "merchant" ? (
          <MerchantMenu
            userId={session.user.id}
            nama={profile.nama ?? "Penjual"}
          />
        ) : (
          <RoleHome profile={profile} />
        )
      ) : (
        <AuthForm />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: "#ffffff" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  form: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 12,
  },
  label: { fontSize: 14, color: "#333", marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#fafafa",
  },
  roleRow: { flexDirection: "row", gap: 8 },
  roleBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  roleBtnActive: { backgroundColor: "#00AA13", borderColor: "#00AA13" },
  roleText: { color: "#333", fontWeight: "600" },
  roleTextActive: { color: "#fff" },
  primaryBtn: {
    backgroundColor: "#00AA13",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  link: { color: "#00AA13", textAlign: "center", marginTop: 12, fontSize: 15 },
});
