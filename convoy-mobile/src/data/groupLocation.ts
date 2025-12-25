import { db } from "../firebase";
import {
  collection,
  doc,
  GeoPoint,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

export type GroupLocationMember = {
  id: string; // uid
  displayName?: string;
  role?: "leader" | "member";
  status?: "online" | "offline";
  location?: { latitude: number; longitude: number };
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  locationUpdatedAt?: any;
};

function memberRef(groupId: string, userId: string) {
  return doc(db, "groupMembers", groupId, "members", userId);
}

export async function updateMyGroupLocation(params: {
  groupId: string;
  userId: string;
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
}) {
  // updateDoc will NOT recreate docs; if user left, update simply fails and can be ignored. [web:2893]
  await updateDoc(memberRef(params.groupId, params.userId), {
    location: new GeoPoint(params.latitude, params.longitude),
    heading: params.heading ?? null,
    speed: params.speed ?? null,
    accuracy: params.accuracy ?? null,
    locationUpdatedAt: serverTimestamp(),
  });
}

export function subscribeToGroupLocations(groupId: string, cb: (items: GroupLocationMember[]) => void) {
  const col = collection(db, "groupMembers", groupId, "members");
  return onSnapshot(col, (snap) => {
    const out: GroupLocationMember[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      const gp: GeoPoint | undefined = data.location;
      out.push({
        id: d.id,
        displayName: data.displayName,
        role: data.role,
        status: data.status,
        location: gp ? { latitude: gp.latitude, longitude: gp.longitude } : undefined,
        heading: data.heading ?? null,
        speed: data.speed ?? null,
        accuracy: data.accuracy ?? null,
        locationUpdatedAt: data.locationUpdatedAt,
      });
    });
    cb(out);
  });
}
