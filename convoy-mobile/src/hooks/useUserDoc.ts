import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../auth/AuthProvider';

export function useUserDoc() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { 
        setData(null); 
        setLoading(false); 
        return; 
    }
    // Real-time listener for user data
    const unsub = onSnapshot(doc(db, "users", user.uid), 
      (docSnapshot) => {
         if (docSnapshot.exists()) {
             setData(docSnapshot.data());
         } else {
             console.log("No profile found for user");
         }
         setLoading(false);
      }, 
      (error) => {
         console.error("Firestore Read Error (Check Rules):", error);
         setLoading(false);
      }
    );
    return () => unsub();
  }, [user]);

  return { data, loading };
}
