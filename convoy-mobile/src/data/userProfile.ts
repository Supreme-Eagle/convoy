import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export async function checkOnboardingStatus(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return true; // No doc = Needs onboarding
    return !snap.data().onboardingComplete;
  } catch (e) {
    return false; // Fail safe
  }
}
