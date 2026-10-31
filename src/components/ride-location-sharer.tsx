import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase';

export function RideLocationSharer({ rideIds, userId }: { rideIds: string[]; userId: string }) {
  const idsRef = useRef(rideIds);
  idsRef.current = rideIds;
  const active = rideIds.length > 0;

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
              .from('ride_locations')
              .upsert(
                {
                  ride_id: id,
                  driver_id: userId,
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'ride_id' }
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