import { auth, db } from "../firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";

export type UserProfile = {
  username?: string | null;
  bloodGroup?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  updatedAt?: any;
};

export function subscribeMyProfile(cb: (p: UserProfile | null) => void) {
  const user = auth.currentUser;
  if (!user) return () => {};

  return onSnapshot(doc(db, "users", user.uid), (snap) => {
    cb(snap.exists() ? (snap.data() as UserProfile) : null);
  });
}

export async function updateMyProfile(patch: UserProfile) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  await setDoc(
    doc(db, "users", user.uid),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
