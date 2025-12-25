import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

export type GroupDoc = {
  name: string;
  city: string;
  isPublic: boolean;
  createdBy: string;
  createdAt?: any;
};

export type GroupMemberDoc = {
  uid: string;
  role: "owner" | "member";
  joinedAt?: any;
};

export type GroupRequestDoc = {
  uid: string;
  status: "pending";
  requestedAt?: any;
};

export async function createGroup(name: string, city: string, isPublic: boolean) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const gref = await addDoc(collection(db, "groups"), {
    name: name.trim(),
    city: city.trim(),
    isPublic,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  } as GroupDoc);

  const batch = writeBatch(db);

  batch.set(doc(db, "groups", gref.id, "members", user.uid), {
    uid: user.uid,
    role: "owner",
    joinedAt: serverTimestamp(),
  } as GroupMemberDoc);

  batch.set(doc(db, "users", user.uid, "groups", gref.id), {
    groupId: gref.id,
    name: name.trim(),
    city: city.trim(),
    isPublic,
    role: "owner",
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return gref.id;
}

export function subscribeMyGroups(uid: string, cb: (rows: any[]) => void) {
  const q = query(collection(db, "users", uid, "groups"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))));
}

export function subscribeGroup(groupId: string, cb: (g: any | null) => void) {
  return onSnapshot(doc(db, "groups", groupId), (snap) => cb(snap.exists() ? { id: snap.id, ...(snap.data() as any) } : null));
}

export function subscribeMembers(groupId: string, cb: (rows: Array<{ id: string } & GroupMemberDoc>) => void) {
  const q = query(collection(db, "groups", groupId, "members"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as GroupMemberDoc) }))));
}

export function subscribeRequests(groupId: string, cb: (rows: Array<{ id: string } & GroupRequestDoc>) => void) {
  const q = query(collection(db, "groups", groupId, "requests"));
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as GroupRequestDoc) }))));
}

export async function requestToJoin(groupId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  await setDoc(doc(db, "groups", groupId, "requests", user.uid), {
    uid: user.uid,
    status: "pending",
    requestedAt: serverTimestamp(),
  } as GroupRequestDoc);
}

export async function joinPublicGroup(groupId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const g = await getDoc(doc(db, "groups", groupId));
  if (!g.exists()) throw new Error("Group not found");
  const data = g.data() as GroupDoc;
  if (!data.isPublic) throw new Error("Group is private, request to join");

  const batch = writeBatch(db);
  batch.set(doc(db, "groups", groupId, "members", user.uid), {
    uid: user.uid,
    role: "member",
    joinedAt: serverTimestamp(),
  } as GroupMemberDoc);

  batch.set(doc(db, "users", user.uid, "groups", groupId), {
    groupId,
    name: data.name,
    city: data.city,
    isPublic: data.isPublic,
    role: "member",
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function approveRequest(groupId: string, requesterUid: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");

  const ownerSnap = await getDoc(doc(db, "groups", groupId, "members", user.uid));
  if (!ownerSnap.exists() || (ownerSnap.data() as GroupMemberDoc).role !== "owner") {
    throw new Error("Only owner can approve");
  }

  const g = await getDoc(doc(db, "groups", groupId));
  if (!g.exists()) throw new Error("Group not found");
  const data = g.data() as GroupDoc;

  const batch = writeBatch(db);
  batch.set(doc(db, "groups", groupId, "members", requesterUid), {
    uid: requesterUid,
    role: "member",
    joinedAt: serverTimestamp(),
  } as GroupMemberDoc);

  batch.set(doc(db, "users", requesterUid, "groups", groupId), {
    groupId,
    name: data.name,
    city: data.city,
    isPublic: data.isPublic,
    role: "member",
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });

  batch.delete(doc(db, "groups", groupId, "requests", requesterUid));
  await batch.commit();
}

export async function leaveGroup(groupId: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not signed in");
  const batch = writeBatch(db);
  batch.delete(doc(db, "groups", groupId, "members", user.uid));
  batch.delete(doc(db, "users", user.uid, "groups", groupId));
  await batch.commit();
}

export async function setGroupName(groupId: string, name: string) {
  await updateDoc(doc(db, "groups", groupId), { name: name.trim() });
}
