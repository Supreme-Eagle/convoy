import { db } from "../firebase";
import { collection, onSnapshot } from "firebase/firestore";

export function subscribeToMyGroupIds(userId: string, cb: (ids: string[]) => void) {
  const col = collection(db, "userGroups", userId, "groups");
  return onSnapshot(col, (snap) => {
    const out: string[] = [];
    snap.forEach((d) => out.push(d.id));
    cb(out);
  });
}
