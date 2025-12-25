import { auth, db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAt,
  endAt,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { geohashForLocation, geohashQueryBounds, distanceBetween } from "geofire-common";

export type SosEvent = {
  uid: string;
  status: "active" | "resolved";
  createdAt?: any;
  resolvedAt?: any;

  lat: number;
  lng: number;
  geohash: string;

  username?: string | null;
  bloodGroup?: string | null;
};

export function subscribeActiveSosNear(params: {
  center: { lat: number; lng: number };
  radiusKm: number; // 5.5
  cb: (items: Array<{ id: string; data: SosEvent; distanceKm: number }>) => void;
}): Unsubscribe {
  const center: [number, number] = [params.center.lat, params.center.lng];
  const radiusInM = params.radiusKm * 1000;

  // Firestore geohash querying uses multiple bounds queries + client-side distance filtering. [web:2906]
  const bounds = geohashQueryBounds(center, radiusInM);

  const byId = new Map<string, { id: string; data: SosEvent; distanceKm: number }>();
  const unsubs: Unsubscribe[] = [];

  const emit = () => {
    const items = Array.from(byId.values())
      .sort((a, b) => (b.data.createdAt?.toMillis?.() ?? 0) - (a.data.createdAt?.toMillis?.() ?? 0))
      .slice(0, 20);
    params.cb(items);
  };

  for (const b of bounds) {
    const q = query(
      collection(db, "sosEvents"),
      where("status", "==", "active"),
      orderBy("geohash"),
      startAt(b[0]),
      endAt(b[1]),
      limit(50)
    );

    const un = onSnapshot(q, (snap) => {
      for (const d of snap.docs) {
        const data = d.data() as SosEvent;
        const distKm = distanceBetween(center, [data.lat, data.lng]);
        if (distKm <= params.radiusKm) byId.set(d.id, { id: d.id, data, distanceKm: distKm });
        else byId.delete(d.id);
      }
      emit();
    });

    unsubs.push(un);
  }

  return () => unsubs.forEach((u) => u());
}

export async function triggerSos(params: { lat: number; lng: number }) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  // profile snapshot (best-effort)
  let username: string | null = null;
  let bloodGroup: string | null = null;
  try {
    const p = await getDoc(doc(db, "users", user.uid));
    if (p.exists()) {
      const u = p.data() as any;
      username = u.username ?? null;
      bloodGroup = u.bloodGroup ?? null;
    }
  } catch {}

  const geohash = geohashForLocation([params.lat, params.lng]);

  // Create SOS + pointer atomically + prevent multiple active SOS
  const sosId = await runTransaction(db, async (tx) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await tx.get(userRef);
    const activeSosId = userSnap.exists() ? (userSnap.data() as any).activeSosId : null;

    if (activeSosId) {
      const activeRef = doc(db, "sosEvents", activeSosId);
      const activeSnap = await tx.get(activeRef);
      if (activeSnap.exists() && (activeSnap.data() as any).status === "active") {
        throw new Error("You already have an active SOS");
      }
    }

    const sosRef = doc(collection(db, "sosEvents"));
    tx.set(sosRef, {
      uid: user.uid,
      status: "active",
      lat: params.lat,
      lng: params.lng,
      geohash,
      username,
      bloodGroup,
      createdAt: serverTimestamp(),
    } satisfies SosEvent);

    tx.set(userRef, { activeSosId: sosRef.id, activeSosAt: serverTimestamp() }, { merge: true });
    return sosRef.id;
  });

  return sosId;
}

export async function resolveSos(sosId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  await runTransaction(db, async (tx) => {
    const ref = doc(db, "sosEvents", sosId);
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error("SOS not found");

    const data = snap.data() as SosEvent;
    if (data.uid !== user.uid) throw new Error("Only sender can resolve");

    tx.update(ref, { status: "resolved", resolvedAt: serverTimestamp() });
    tx.set(doc(db, "users", user.uid), { activeSosId: null }, { merge: true });
  });
}
