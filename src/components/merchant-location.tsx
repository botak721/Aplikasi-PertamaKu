import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { getCoords } from '@/lib/geo';

export function MerchantLocation({ userId }: { userId: string }) {
  const [alamat, setAlamat] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('lat, lng, alamat')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          setAlamat(data.alamat ?? '');
          if (data.lat != null && data.lng != null) {
            setCoords({ lat: data.lat, lng: data.lng });
          }
        }
        setLoading(false);
      });
  }, [userId]);

  async function pakaiLokasi() {
    setLocating(true);
    const c = await getCoords();
    setLocating(false);
    if (c) setCoords(c);
  }

  async function simpan() {
    if (!coords) {
      Alert.alert('Lokasi belum ada', 'Tekan "Gunakan lokasi saya sekarang" dulu.');
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from('profiles')
      .update({ lat: coords.lat, lng: coords.lng, alamat: alamat.trim() })
      .eq('id', userId)
      .select('id');
    setSaving(false);
    if (error || !data || data.length === 0) {
      Alert.alert('Gagal menyimpan', error?.message ?? 'Coba lagi.');
      return;
    }
    Alert.alert('Tersimpan', 'Lokasi tokomu sudah diperbarui.');
  }

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} color="#2547D0" />;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lokasi Toko</Text>
      <Text style={styles.subtitle}>
        Berdirilah di tokomu lalu ambil lokasi. Driver memakainya untuk rute penjemputan.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Alamat toko (contoh: Jl. Margonda Raya No. 10)"
        placeholderTextColor="#5B6785"
        value={alamat}
        onChangeText={setAlamat}
      />

      <TouchableOpacity style={styles.secondaryBtn} onPress={pakaiLokasi} disabled={locating}>
        {locating ? (
          <ActivityIndicator color="#2547D0" />
        ) : (
          <Text style={styles.secondaryText}>Gunakan lokasi saya sekarang</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.coords}>
        {coords
          ? `Koordinat: ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
          : 'Koordinat belum diatur'}
      </Text>

      <TouchableOpacity style={styles.primaryBtn} onPress={simpan} disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.primaryText}>Simpan Lokasi</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, fontFamily: 'PlusJakartaSans_700Bold', color: '#0E1B5C' },
  subtitle: { fontSize: 14, color: '#5B6785' },
  input: {
    borderWidth: 1,
    borderColor: '#C9D6F5',
    borderRadius: 14,
    padding: 12,
    fontSize: 16,
    color: '#0E1B5C',
    backgroundColor: '#FFFFFF',
  },
  coords: { fontSize: 14, color: '#0E1B5C' },
  primaryBtn: { backgroundColor: '#2547D0', padding: 14, borderRadius: 14, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#2547D0',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondaryText: { color: '#2547D0', fontFamily: 'PlusJakartaSans_700Bold' },
});