import { auth, db } from "../firebase";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

export type AppNotification = {
  type: string;
  message: string;
  eventId?: string;
  createdAt?: any;
  readAt?: any | null;
};

export function subscribeMyNotifications(
  cb: (items: Array<{ id: string; data: AppNotification }>) => void
) {
  const user = auth.currentUser;
  if (!user) return () => {};

  const q = query(
    collection(db, "users", user.uid, "notifications"),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, data: d.data() as AppNotification })));
  });
}

export async function markNotificationRead(notificationId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  await updateDoc(doc(db, "users", user.uid, "notifications", notificationId), {
    readAt: serverTimestamp(),
  });
}
