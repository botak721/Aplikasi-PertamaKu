import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';

export function LocationSharer({ orderIds, userId }: { orderIds: string[]; userId: string }) {
  const idsRef = useRef(orderIds);
  idsRef.current = orderIds;
  const active = orderIds.length > 0;

  useEffect(() => {
    if (!active) return;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 5 },
        (pos) => {
          idsRef.current.forEach((id) => {
            supabase
              .from('driver_locations')
              .upsert(
                {
                  order_id: id,
                  driver_id: userId,
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'order_id' }
              )
              .then(() => {});
          });
        }
      );
      if (cancelled) subscription.remove();
      else sub = subscription;
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [active, userId]);

  return null;
}