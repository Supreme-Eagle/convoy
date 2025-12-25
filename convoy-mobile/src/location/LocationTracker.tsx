import React, { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { doc, onSnapshot, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth/AuthProvider";
import { geohashForLocation } from "geofire-common";

export function LocationTracker() {
  const { user } = useAuth();
  const locSub = useRef<Location.LocationSubscription | null>(null);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      const d: any = snap.data();
      const v = d?.settings?.locationSharingEnabled;
      setEnabled(v !== false); // default ON
    });
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    let alive = true;

    async function stop() {
      locSub.current?.remove();
      locSub.current = null;
    }

    async function start() {
      if (!user) return;

      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== "granted") return;

      await stop();
      locSub.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
        async (pos) => {
          if (!alive) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const geohash = geohashForLocation([lat, lng]);
          await updateDoc(doc(db, "users", user.uid), {
            lastLocation: { lat, lng, geohash, updatedAt: serverTimestamp() },
            updatedAt: serverTimestamp(),
          });
        }
      );
    }

    if (enabled) start();
    else stop();

    return () => {
      alive = false;
      stop();
    };
  }, [user?.uid, enabled]);

  return null;
}
