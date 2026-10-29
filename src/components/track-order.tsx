import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '@/lib/supabase';
import { jarakKm } from '@/lib/geo';
import { LiveMap, MapMarker } from '@/components/live-map';

type Point = { lat: number; lng: number };
type DriverPos = Point & { updated_at: string };

export function TrackOrder({
  orderId,
  dest,
  merchant,
}: {
  orderId: string;
  dest: Point | null;
  merchant: Point | null;
}) {
  const [open, setOpen] = useState(false);
  const [driver, setDriver] = useState<DriverPos | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from('driver_locations')
        .select('lat, lng, updated_at')
        .eq('order_id', orderId)
        .maybeSingle();
      if (alive) setDriver((data as DriverPos | null) ?? null);
    };
    load();
    const timer = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [open, orderId]);

  const markers: MapMarker[] = [];
  if (merchant) markers.push({ id: 'm', ...merchant, label: 'Penjual', color: '#f59e0b' });
  if (dest) markers.push({ id: 'd', ...dest, label: 'Kamu', color: '#00AA13' });
  if (driver) markers.push({ id: 'driver', lat: driver.lat, lng: driver.lng, label: 'Driver', color: '#2563eb' });

  return (
    <View>
      <TouchableOpacity style={styles.btn} onPress={() => setOpen(!open)}>
        <Text style={styles.btnText}>{open ? 'Tutup Peta' : 'Lacak Driver'}</Text>
      </TouchableOpacity>

      {open && (
        <>
          {markers.length > 0 ? (
            <LiveMap markers={markers} />
          ) : (
            <Text style={styles.info}>Belum ada data lokasi untuk pesanan ini.</Text>
          )}
          {driver ? (
            <Text style={styles.info}>
              {dest ? `Driver sekitar ${jarakKm(driver.lat, driver.lng, dest.lat, dest.lng)} km dari lokasimu. ` : ''}
              Diperbarui {new Date(driver.updated_at).toLocaleTimeString('id-ID')}
            </Text>
          ) : (
            <Text style={styles.info}>
              Driver belum membagikan lokasi. Pastikan driver membuka aplikasinya.
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderColor: '#2563eb',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  btnText: { color: '#2563eb', fontWeight: '700' },
  info: { fontSize: 13, color: '#555', marginTop: 8 },
});