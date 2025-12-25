import { auth, db } from "../firebase";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAt,
  endAt,
  where,
  writeBatch,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { geohashForLocation, geohashQueryBounds, distanceBetween } from "geofire-common";

export type RideEvent = {
  title: string;
  isPublic: boolean;
  leaderUid: string;
  startAt: Timestamp;
  joinCloseAt: Timestamp;
  memberCount: number;
  createdAt?: any;

  // location for Explore “near me”
  lat?: number | null;
  lng?: number | null;
  geohash?: string | null;
};

export type JoinRequest = {
  uid: string;
  createdAt?: any;
};

export type Member = {
  uid: string;
  role: "leader" | "member";
  joinedAt?: any;
};

export function rideRef(eventId: string) {
  return doc(db, "rideEvents", eventId);
}
export function membersDoc(eventId: string, uid: string) {
  return doc(db, "rideEvents", eventId, "members", uid);
}
export function joinReqDoc(eventId: string, uid: string) {
  return doc(db, "rideEvents", eventId, "joinRequests", uid);
}
export function joinReqCol(eventId: string) {
  return collection(db, "rideEvents", eventId, "joinRequests");
}

export function subscribeUpcomingRides(cb: (rides: Array<{ id: string; data: RideEvent }>) => void) {
  const now = Timestamp.now();
  const q = query(
    collection(db, "rideEvents"),
    where("startAt", ">=", now),
    orderBy("startAt", "asc")
  );

  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, data: d.data() as RideEvent })));
  });
}

/**
 * Nearby rides for Explore (geohash bounds query + exact distance filter)
 * Note: We only orderBy geohash here (time filtering done client-side).
 */
export function subscribeNearbyRides(params: {
  center: { lat: number; lng: number };
  radiusKm: number; // 30
  cb: (items: Array<{ id: string; data: RideEvent; distanceKm: number }>) => void;
}): Unsubscribe {
  const center: [number, number] = [params.center.lat, params.center.lng];
  const radiusInM = params.radiusKm * 1000;

  const bounds = geohashQueryBounds(center, radiusInM);
  const byId = new Map<string, { id: string; data: RideEvent; distanceKm: number }>();
  const unsubs: Unsubscribe[] = [];

  const emit = () => {
    const nowMs = Date.now();
    const items = Array.from(byId.values())
      .filter((x) => x.data.startAt?.toMillis?.() ? x.data.startAt.toMillis() >= nowMs : true)
      .sort((a, b) => (a.data.startAt?.toMillis?.() ?? 0) - (b.data.startAt?.toMillis?.() ?? 0))
      .slice(0, 40);
    params.cb(items);
  };

  for (const b of bounds) {
    const q = query(
      collection(db, "rideEvents"),
      where("geohash", "!=", null),
      orderBy("geohash"),
      startAt(b[0]),
      endAt(b[1]),
      limit(80)
    );

    const un = onSnapshot(q, (snap) => {
      for (const d of snap.docs) {
        const data = d.data() as RideEvent;
        if (data.lat == null || data.lng == null) continue;

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

export function subscribeRide(eventId: string, cb: (ride: RideEvent | null) => void) {
  return onSnapshot(rideRef(eventId), (snap) => cb(snap.exists() ? (snap.data() as RideEvent) : null));
}

export function subscribeMyMemberDoc(eventId: string, uid: string, cb: (m: Member | null) => void) {
  return onSnapshot(membersDoc(eventId, uid), (snap) => cb(snap.exists() ? (snap.data() as Member) : null));
}

export function subscribeMyJoinRequest(eventId: string, uid: string, cb: (jr: JoinRequest | null) => void) {
  return onSnapshot(joinReqDoc(eventId, uid), (snap) => cb(snap.exists() ? (snap.data() as JoinRequest) : null));
}

export function subscribeJoinRequests(eventId: string, cb: (reqs: Array<{ uid: string; data: JoinRequest }>) => void) {
  const q = query(joinReqCol(eventId), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ uid: d.id, data: d.data() as JoinRequest }))));
}

export async function createRide(params: {
  title: string;
  isPublic: boolean;
  startAt: Date;
  location?: { lat: number; lng: number } | null;
}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const startAt = Timestamp.fromDate(params.startAt);
  const joinCloseAt = Timestamp.fromMillis(params.startAt.getTime() + 45 * 60 * 1000);

  const lat = params.location?.lat ?? null;
  const lng = params.location?.lng ?? null;
  const geohash = lat != null && lng != null ? geohashForLocation([lat, lng]) : null;

  const rideDoc = await addDoc(collection(db, "rideEvents"), {
    title: params.title.trim(),
    isPublic: params.isPublic,
    leaderUid: user.uid,
    startAt,
    joinCloseAt,
    memberCount: 1,
    lat,
    lng,
    geohash,
    createdAt: serverTimestamp(),
  } satisfies RideEvent);

  const batch = writeBatch(db);
  batch.set(membersDoc(rideDoc.id, user.uid), {
    uid: user.uid,
    role: "leader",
    joinedAt: serverTimestamp(),
  } satisfies Member);
  await batch.commit();

  return rideDoc.id;
}

export async function joinPublicRide(eventId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  await runTransaction(db, async (tx) => {
    const rideSnap = await tx.get(rideRef(eventId));
    if (!rideSnap.exists()) throw new Error("Ride not found");
    const ride = rideSnap.data() as RideEvent;

    if (!ride.isPublic) throw new Error("Not a public ride");
    if (Timestamp.now().toMillis() > ride.joinCloseAt.toMillis()) throw new Error("Join window closed");

    const memRef = membersDoc(eventId, user.uid);
    const memSnap = await tx.get(memRef);
    if (memSnap.exists()) return; // already a member => do not increment again

    tx.set(memRef, { uid: user.uid, role: "member", joinedAt: serverTimestamp() } satisfies Member, { merge: true });
    tx.update(rideRef(eventId), { memberCount: increment(1) });
    tx.delete(joinReqDoc(eventId, user.uid));
  });
}

export async function requestJoin(eventId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const rideSnap = await getDoc(rideRef(eventId));
  if (!rideSnap.exists()) throw new Error("Ride not found");
  const ride = rideSnap.data() as RideEvent;

  if (ride.isPublic) throw new Error("Public ride does not need request");
  if (Timestamp.now().toMillis() > ride.joinCloseAt.toMillis()) throw new Error("Join window closed");

  await setDoc(joinReqDoc(eventId, user.uid), {
    uid: user.uid,
    createdAt: serverTimestamp(),
  } satisfies JoinRequest);
}

export async function approveJoin(eventId: string, requesterUid: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  await runTransaction(db, async (tx) => {
    const rideSnap = await tx.get(rideRef(eventId));
    if (!rideSnap.exists()) throw new Error("Ride not found");
    const ride = rideSnap.data() as RideEvent;

    if (ride.leaderUid !== user.uid) throw new Error("Only leader can approve");

    const reqRef = joinReqDoc(eventId, requesterUid);
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists()) throw new Error("Request not found");

    const memRef = membersDoc(eventId, requesterUid);
    const memSnap = await tx.get(memRef);

    tx.set(memRef, { uid: requesterUid, role: "member", joinedAt: serverTimestamp() } satisfies Member, { merge: true });
    tx.delete(reqRef);

    if (!memSnap.exists()) tx.update(rideRef(eventId), { memberCount: increment(1) });

    const notifRef = doc(collection(db, "users", requesterUid, "notifications"));
    tx.set(notifRef, {
      type: "ride_join_approved",
      eventId,
      message: `Approved to join: ${ride.title}`,
      createdAt: serverTimestamp(),
      readAt: null,
    });
  });
}

export async function rejectJoin(eventId: string, requesterUid: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  await runTransaction(db, async (tx) => {
    const rideSnap = await tx.get(rideRef(eventId));
    if (!rideSnap.exists()) throw new Error("Ride not found");
    const ride = rideSnap.data() as RideEvent;

    if (ride.leaderUid !== user.uid) throw new Error("Only leader can reject");

    const reqRef = joinReqDoc(eventId, requesterUid);
    const reqSnap = await tx.get(reqRef);
    if (!reqSnap.exists()) return;

    tx.delete(reqRef);

    const notifRef = doc(collection(db, "users", requesterUid, "notifications"));
    tx.set(notifRef, {
      type: "ride_join_rejected",
      eventId,
      message: `Join request rejected: ${ride.title}`,
      createdAt: serverTimestamp(),
      readAt: null,
    });
  });
}
