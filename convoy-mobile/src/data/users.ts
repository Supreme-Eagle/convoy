import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  rating?: number;
  kmRidden?: number;
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    id: userId,
    email: data.email ?? "",
    displayName: data.displayName ?? data.email ?? "",
    photoUrl: data.photoUrl ?? "",
    rating: data.rating ?? 0,
    kmRidden: data.kmRidden ?? 0,
  };
}
