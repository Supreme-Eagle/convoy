import React from "react";
import { View } from "react-native";
import { Appbar, Dialog, Portal, TextInput, Button } from "react-native-paper";
import { useRouter } from "expo-router";
import RouteBuilderMap from "../../../src/components/RouteBuilderMap"; 
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../../src/firebase";
import { useAuth } from "../../../src/auth/AuthProvider";

export default function CreateRouteScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [points, setPoints] = React.useState<any[]>([]);
  const [showSave, setShowSave] = React.useState(false);
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleSavePrompt = (pts: any[]) => {
     setPoints(pts);
     setShowSave(true);
  };

  const doSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "rides"), {
        type: "Route",
        title: name || "New Route",
        path: points,
        createdBy: user.displayName || "Rider",
        userId: user.uid,
        createdAt: serverTimestamp(),
        stats: { distance: 0 }
      });
      router.back();
    } catch(e) {
       console.log(e);
    } finally {
       setSaving(false);
       setShowSave(false);
    }
  };

  return (
    <View style={{flex: 1, backgroundColor: "#020617"}}>
      <Appbar.Header style={{ backgroundColor: "#020617" }}>
         <Appbar.BackAction color="white" onPress={() => router.back()} />
         <Appbar.Content title="Route Builder" titleStyle={{color: "white"}} />
      </Appbar.Header>
      
      <RouteBuilderMap onSave={handleSavePrompt} />

      <Portal>
        <Dialog visible={showSave} onDismiss={() => setShowSave(false)} style={{backgroundColor: "#0F172A"}}>
           <Dialog.Title style={{color: "white"}}>Save Route</Dialog.Title>
           <Dialog.Content>
              <TextInput label="Route Name" value={name} onChangeText={setName} style={{backgroundColor: "#1E293B"}} textColor="white" />
           </Dialog.Content>
           <Dialog.Actions>
              <Button onPress={() => setShowSave(false)}>Cancel</Button>
              <Button onPress={doSave} loading={saving}>Save</Button>
           </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
