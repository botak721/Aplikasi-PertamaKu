import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { supabase } from '@/lib/supabase';
import { AuthForm } from '@/components/auth-form';
import { MerchantHome } from '@/components/merchant-home';
import { CustomerHome } from '@/components/customer-home';
import { DriverHome } from '@/components/driver-home';
import { C, F } from '@/constants/kampusgo';

type Role = 'customer' | 'driver' | 'merchant';
type Profile = { nama: string | null; role: Role };

export default function HomeScreen() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    supabase
      .from('profiles')
      .select('nama, role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setProfile(data as Profile | null);
        setProfileLoading(false);
      });
  }, [session]);

  const ready = (fontsLoaded || !!fontError) && !loading && !(session && profileLoading);

  let content;
  if (!ready) {
    content = (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  } else if (!session) {
    content = <AuthForm />;
  } else if (profile?.role === 'merchant') {
    content = <MerchantHome userId={session.user.id} nama={profile.nama ?? 'Penjual'} />;
  } else if (profile?.role === 'customer') {
    content = <CustomerHome userId={session.user.id} nama={profile.nama ?? 'Mahasiswa'} />;
  } else if (profile?.role === 'driver') {
    content = <DriverHome userId={session.user.id} nama={profile.nama ?? 'Driver'} />;
  } else {
    content = (
      <View style={styles.center}>
        <Text style={styles.msg}>Profil tidak ditemukan.</Text>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.link}>Keluar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <SafeAreaView style={styles.screen}>{content}</SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  msg: { fontFamily: F.semi, fontSize: 16, color: C.navy },
  link: { fontFamily: F.xbold, fontSize: 15, color: C.primary },
});