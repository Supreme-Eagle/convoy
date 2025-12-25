import { initializeApp, getApp, getApps } from "firebase/app";
import { initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBzVkR2gYqY7_Wssn5ZjFS0MelZuP8-5nU",
  authDomain: "convoy-4e35a.firebaseapp.com",
  projectId: "convoy-4e35a",
  storageBucket: "convoy-4e35a.firebasestorage.app",
  messagingSenderId: "341548138392",
  appId: "1:341548138392:web:0524b1db7dc204789875ed",
  measurementId: "G-RPSWBQSJ4C",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence,
});

export const db = getFirestore(app);
export const storage = getStorage(app);
