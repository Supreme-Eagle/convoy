import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

type AuthContextType = {
  user: User | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const sub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setInitializing(false);

      // Ensure user profile doc exists (so we can show email in member list)
      if (u) {
        await setDoc(
          doc(db, "users", u.uid),
          {
            email: u.email ?? "",
            displayName: u.email ?? "",
            photoUrl: u.photoURL ?? "",
            rating: 5.0,
            kmRidden: 0,
            updatedAt: new Date(),
          },
          { merge: true }
        );
      }
    });
    return sub;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signUp = async (email: string, password: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await setDoc(
      doc(db, "users", cred.user.uid),
      {
        email: cred.user.email ?? "",
        displayName: cred.user.email ?? "",
        photoUrl: cred.user.photoURL ?? "",
        rating: 5.0,
        kmRidden: 0,
        createdAt: new Date(),
      },
      { merge: true }
    );
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, initializing, signIn, signUp, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
