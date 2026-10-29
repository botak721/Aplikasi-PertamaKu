import { useState } from 'react';
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

type Role = 'customer' | 'driver' | 'merchant';
const ROLES: { value: Role; label: string }[] = [
  { value: 'customer', label: 'Mahasiswa' },
  { value: 'driver', label: 'Driver' },
  { value: 'merchant', label: 'Penjual' },
];

export function AuthForm() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  const [kampus, setKampus] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('customer');
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  async function submit() {
    const e = email.trim().toLowerCase();
    if (!e || !password || (isRegister && (!nama.trim() || !nim.trim() || !kampus.trim()))) {
      notify('Data belum lengkap', 'Isi semua kolom dulu ya.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(e)) {
      notify('Email tidak valid', 'Periksa lagi penulisan emailnya.');
      return;
    }
    if (password.length < 6) {
      notify('Kata sandi terlalu pendek', 'Minimal 6 karakter.');
      return;
    }
    setBusy(true);
    if (isRegister) {
      const { data, error } = await supabase.auth.signUp({
        email: e,
        password,
        options: {
          data: { nama: nama.trim(), nim: nim.trim(), kampus: kampus.trim(), role },
        },
      });
      if (error) {
        notify('Gagal daftar', error.message);
      } else if (!data.session) {
        notify('Cek email kamu', 'Klik link konfirmasi di email, lalu masuk.');
        setMode('login');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: e, password });
      if (error) notify('Gagal masuk', error.message);
    }
    setBusy(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.logo}>
            Kampus<Text style={styles.logoGo}>Go</Text>
          </Text>
          <Text style={styles.title}>{isRegister ? 'Daftar' : 'Masuk ke KampusGo'}</Text>
          <Text style={styles.subtitle}>
            {isRegister ? 'Buat akun KampusGo, gratis.' : 'Urusan kampus, gas dulu.'}
          </Text>
        </View>

        <View style={styles.body}>
          {isRegister && (
            <>
              <Text style={styles.label}>Nama lengkap</Text>
              <TextInput
                style={styles.input}
                placeholder="Nama lengkap"
                placeholderTextColor={C.muted}
                value={nama}
                onChangeText={setNama}
              />
              <Text style={styles.label}>NIM</Text>
              <TextInput
                style={styles.input}
                placeholder="NIM"
                placeholderTextColor={C.muted}
                value={nim}
                onChangeText={setNim}
              />
              <Text style={styles.label}>Kampus</Text>
              <TextInput
                style={styles.input}
                placeholder="Nama kampus"
                placeholderTextColor={C.muted}
                value={kampus}
                onChangeText={setKampus}
              />
              <Text style={styles.label}>Daftar sebagai</Text>
              <View style={styles.roleRow}>
                {ROLES.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.roleBtn, role === r.value && styles.roleBtnActive]}
                    onPress={() => setRole(r.value)}>
                    <Text style={[styles.roleText, role === r.value && styles.roleTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={styles.label}>Email kampus</Text>
          <TextInput
            style={styles.input}
            placeholder="nama@kampus.ac.id"
            placeholderTextColor={C.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Text style={styles.label}>Kata sandi</Text>
          <TextInput
            style={styles.input}
            placeholder="Masukkan kata sandi"
            placeholderTextColor={C.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.primaryBtn} onPress={submit} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>{isRegister ? 'Daftar' : 'Masuk'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode(isRegister ? 'login' : 'register')}>
            <Text style={styles.switchText}>
              {isRegister ? 'Sudah punya akun? ' : 'Belum punya akun? '}
              <Text style={styles.switchLink}>{isRegister ? 'Masuk' : 'Daftar'}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  header: {
    backgroundColor: C.primary,
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 22,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    alignItems: 'center',
    gap: 8,
  },
  logo: { fontFamily: F.xbold, fontSize: 22, color: '#fff' },
  logoGo: { color: C.yellow },
  title: { fontFamily: F.xbold, fontSize: 28, color: '#fff', textAlign: 'center' },
  subtitle: { fontFamily: F.reg, fontSize: 14, color: '#fff', opacity: 0.9, textAlign: 'center' },
  body: {
    flex: 1,
    padding: 22,
    gap: 6,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  label: { fontFamily: F.semi, fontSize: 14, color: C.navy, marginTop: 8 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontFamily: F.reg,
    fontSize: 15,
    color: C.navy,
    backgroundColor: C.white,
  },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  roleText: { fontFamily: F.semi, color: C.navy },
  roleTextActive: { color: '#fff' },
  primaryBtn: {
    minHeight: 52,
    backgroundColor: C.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  primaryText: { fontFamily: F.xbold, fontSize: 16, color: '#fff' },
  switchText: {
    fontFamily: F.reg,
    fontSize: 14,
    color: C.navy,
    textAlign: 'center',
    marginTop: 18,
  },
  switchLink: { fontFamily: F.xbold, color: C.primary },
});