import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

export async function getCoords(): Promise<{ lat: number; lng: number } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'Izin lokasi ditolak',
      'Aktifkan izin lokasi untuk Expo Go di pengaturan HP, lalu coba lagi.'
    );
    return null;
  }
  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    Alert.alert('Gagal mengambil lokasi', 'Pastikan lokasi/GPS HP aktif, lalu coba lagi.');
    return null;
  }
}

export function jarakKm(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
}

export function openRoute(lat: number, lng: number) {
  Linking.openURL(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
  ).catch(() => Alert.alert('Gagal membuka peta', 'Pastikan Google Maps atau browser tersedia.'));
}