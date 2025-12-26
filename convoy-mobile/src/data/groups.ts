import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, increment, runTransaction, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// --- 1. Subscriptions (Real-time) ---

export function subscribeToGroups(callback: (groups: any[]) => void) {
  const q = query(collection(db, "groups"));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(data);
  });
}

export function subscribeToMembers(groupId: string, callback: (members: any[]) => void) {
  const q = collection(db, "groups", groupId, "members");
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(data);
  });
}

// --- 2. Membership Checks & Updates ---

export async function isUserMember(groupId: string, userId: string): Promise<boolean> {
  if (!groupId || !userId) return false;
  try {
    const memberRef = doc(db, "groups", groupId, "members", userId);
    const snap = await getDoc(memberRef);
    return snap.exists();
  } catch (error) {
    return false;
  }
}

export async function setMemberStatus(groupId: string, userId: string, status: string, email: string) {
  try {
    const memberRef = doc(db, "groups", groupId, "members", userId);
    await updateDoc(memberRef, {
      status: status,
      lastActive: serverTimestamp()
    });
  } catch (error) {
    // console.log("Status update skipped:", error);
  }
}

// --- 3. CRUD Operations ---

export async function createGroup(groupData: any, creatorId: string) {
  const groupRef = doc(collection(db, "groups"));
  const batch = db.batch(); 
  batch.set(groupRef, { ...groupData, id: groupRef.id, createdBy: creatorId, memberCount: 1, createdAt: serverTimestamp() });
  const memberRef = doc(db, "groups", groupRef.id, "members", creatorId);
  batch.set(memberRef, { userId: creatorId, role: "leader", joinedAt: serverTimestamp() });
  await batch.commit();
  return groupRef.id;
}

export async function getUserGroups(userId: string) {
  try {
    const q = query(collection(db, "groups")); 
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) { return []; }
}

export async function getGroupDetails(groupId: string) {
  const snap = await getDoc(doc(db, "groups", groupId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
