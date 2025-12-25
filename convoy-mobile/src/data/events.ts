import { db, storage } from "../firebase";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import * as FileSystem from "expo-file-system/legacy";

export type RideEvent = {
  id: string;
  title: string;
  date: Timestamp;
  startTime: string;      // "HH:MM AM/PM"
  endTime: string;        // "HH:MM AM/PM"
  startPoint: string;
  endPoint: string;
  thumbnailUrl?: string;
  createdBy: string;
  createdAt?: any;
};

export function subscribeToEvents(cb: (items: RideEvent[]) => void) {
  const q = query(collection(db, "events"), orderBy("date", "asc"));
  return onSnapshot(q, (snap) => {
    const out: RideEvent[] = [];
    snap.forEach((d) => {
      const data = d.data() as any;
      out.push({
        id: d.id,
        title: data.title ?? "",
        date: data.date,
        startTime: data.startTime ?? "",
        endTime: data.endTime ?? "",
        startPoint: data.startPoint ?? "",
        endPoint: data.endPoint ?? "",
        thumbnailUrl: data.thumbnailUrl || undefined,
        createdBy: data.createdBy ?? "",
        createdAt: data.createdAt,
      });
    });
    cb(out);
  });
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });
}

export async function uploadEventThumbnail(userId: string, localUri: string) {
  // Upload as base64 string (uploadString) which works well with Expo FileSystem. [web:2745]
  const path = `event-thumbnails/${userId}/${Date.now()}.jpg`;
  const storageRef = ref(storage, path);

  console.log("[thumb] uri:", localUri);

  const base64 = await withTimeout(
    FileSystem.readAsStringAsync(localUri, { encoding: "base64" }),
    20000,
    "Read image"
  );

  const snap = await withTimeout(
    uploadString(storageRef, base64, "base64", { contentType: "image/jpeg" }),
    40000,
    "Upload image"
  );

  const url = await withTimeout(getDownloadURL(snap.ref), 15000, "Get download URL");
  console.log("[thumb] uploaded url:", url);

  return url;
}

export async function createEvent(input: {
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  startPoint: string;
  endPoint: string;
  thumbnailUrl?: string;
  createdBy: string;
}) {
  return await addDoc(collection(db, "events"), {
    title: input.title,
    date: Timestamp.fromDate(input.date),
    startTime: input.startTime,
    endTime: input.endTime,
    startPoint: input.startPoint,
    endPoint: input.endPoint,
    thumbnailUrl: input.thumbnailUrl ?? "",
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  });
}
