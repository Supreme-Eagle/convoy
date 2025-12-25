import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, ScrollView, Image } from "react-native";
import {
  Text,
  Card,
  Button,
  TextInput,
  Dialog,
  Portal,
  List,
  ActivityIndicator,
} from "react-native-paper";
import { DatePickerModal, TimePickerModal } from "react-native-paper-dates";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../../src/auth/AuthProvider";
import { RideEvent, subscribeToEvents, createEvent, uploadEventThumbnail } from "../../src/data/events";

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function formatDDMMYYYY(d?: Date | null) {
  if (!d) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function formatHHMMAmPm(d?: Date | null) {
  if (!d) return "";
  let hours = d.getHours();
  const minutes = pad2(d.getMinutes());
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${pad2(hours)}:${minutes} ${ampm}`;
}
function atMidnight(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function CalendarTab() {
  const { user } = useAuth();

  const [events, setEvents] = useState<RideEvent[]>([]);
  useEffect(() => subscribeToEvents(setEvents), []);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | null>(null);

  const [startTimeDate, setStartTimeDate] = useState<Date | null>(null);
  const [endTimeDate, setEndTimeDate] = useState<Date | null>(null);

  const startTimeStr = useMemo(() => formatHHMMAmPm(startTimeDate), [startTimeDate]);
  const endTimeStr = useMemo(() => formatHHMMAmPm(endTimeDate), [endTimeDate]);

  const [startPoint, setStartPoint] = useState("");
  const [endPoint, setEndPoint] = useState("");

  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [startTimePickerVisible, setStartTimePickerVisible] = useState(false);
  const [endTimePickerVisible, setEndTimePickerVisible] = useState(false);

  const [thumbUri, setThumbUri] = useState<string>("");
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");

  const reset = () => {
    setTitle("");
    setDate(null);
    setStartTimeDate(null);
    setEndTimeDate(null);
    setStartPoint("");
    setEndPoint("");
    setThumbUri("");
    setUploadingThumb(false);
    setUploadError("");
  };

  const pickThumbnail = async () => {
    setUploadError("");

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setUploadError("Permission required to pick an image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [16, 9],
    });

    if (!result.canceled) {
      setThumbUri(result.assets[0].uri);
    }
  };

  const save = async () => {
    if (!user) return;
    if (!title.trim() || !date || !startTimeStr || !endTimeStr || !startPoint.trim() || !endPoint.trim()) return;

    setSaving(true);
    setUploadError("");

    try {
      let thumbnailUrl: string | undefined;

      if (thumbUri) {
        setUploadingThumb(true);
        thumbnailUrl = await uploadEventThumbnail(user.uid, thumbUri);
        setUploadingThumb(false);
      }

      await createEvent({
        title: title.trim(),
        date: atMidnight(date),
        startTime: startTimeStr,
        endTime: endTimeStr,
        startPoint: startPoint.trim(),
        endPoint: endPoint.trim(),
        thumbnailUrl,
        createdBy: user.uid,
      });

      setOpen(false);
      reset();
    } catch (err: any) {
      console.error("save event error", err);
      setUploadError(err?.message || "Upload failed. Check logs.");
      setUploadingThumb(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text variant="headlineSmall" style={{ color: "#F9FAFB" }}>Calendar</Text>
        <Button mode="contained" onPress={() => setOpen(true)} disabled={!user} style={{ borderRadius: 999 }}>
          Add event
        </Button>
      </View>

      {events.map((e) => (
        <Card key={e.id} style={styles.card}>
          {e.thumbnailUrl ? <Image source={{ uri: e.thumbnailUrl }} style={styles.thumb} /> : null}
          <Card.Content style={{ gap: 4, paddingTop: e.thumbnailUrl ? 8 : 12 }}>
            <Text variant="titleMedium" style={{ color: "#F9FAFB" }}>{e.title}</Text>
            <Text style={styles.meta}>
              {formatDDMMYYYY(e.date?.toDate ? e.date.toDate() : new Date())} · {e.startTime} - {e.endTime}
            </Text>
            <Text style={styles.meta}>Start: {e.startPoint}</Text>
            <Text style={styles.meta}>End: {e.endPoint}</Text>
          </Card.Content>
        </Card>
      ))}

      <Portal>
        <Dialog visible={open} onDismiss={() => { setOpen(false); reset(); }}>
          <Dialog.Title>Create event</Dialog.Title>
          <Dialog.Content style={{ gap: 10 }}>
            <TextInput label="Title" value={title} onChangeText={setTitle} mode="outlined" />

            <TextInput
              label="Date (DD/MM/YYYY)"
              value={formatDDMMYYYY(date)}
              mode="outlined"
              editable={false}
              right={<TextInput.Icon icon="calendar" onPress={() => setDatePickerVisible(true)} />}
            />

            <TextInput
              label="Start time (HH:MM AM/PM)"
              value={startTimeStr}
              mode="outlined"
              editable={false}
              right={<TextInput.Icon icon="clock-outline" onPress={() => setStartTimePickerVisible(true)} />}
            />

            <TextInput
              label="End time (HH:MM AM/PM)"
              value={endTimeStr}
              mode="outlined"
              editable={false}
              right={<TextInput.Icon icon="clock-outline" onPress={() => setEndTimePickerVisible(true)} />}
            />

            <TextInput label="Start point" value={startPoint} onChangeText={setStartPoint} mode="outlined" />
            <TextInput label="End point" value={endPoint} onChangeText={setEndPoint} mode="outlined" />

            <List.Item
              title="Thumbnail image"
              description={thumbUri ? "Tap to change" : "Optional"}
              left={(props) => <List.Icon {...props} icon="image-outline" />}
              right={() => <Button onPress={pickThumbnail}>Pick</Button>}
            />

            {thumbUri ? <Image source={{ uri: thumbUri }} style={styles.thumbPreview} /> : null}

            {uploadingThumb ? (
              <View style={styles.uploadRow}>
                <ActivityIndicator size="small" />
                <Text style={{ marginLeft: 8, color: "#E5E7EB" }}>Uploading image…</Text>
              </View>
            ) : null}

            {uploadError ? (
              <Text style={{ color: "#FCA5A5" }}>{uploadError}</Text>
            ) : null}
          </Dialog.Content>

          <Dialog.Actions>
            <Button onPress={() => { setOpen(false); reset(); }} disabled={saving}>Cancel</Button>
            <Button onPress={save} loading={saving} disabled={saving}>Save</Button>
          </Dialog.Actions>
        </Dialog>

        <DatePickerModal
          mode="single"
          visible={datePickerVisible}
          onDismiss={() => setDatePickerVisible(false)}
          date={date ?? new Date()}
          onConfirm={({ date }) => {
            setDatePickerVisible(false);
            setDate(date);
          }}
        />

        <TimePickerModal
          visible={startTimePickerVisible}
          onDismiss={() => setStartTimePickerVisible(false)}
          onConfirm={({ hours, minutes }) => {
            setStartTimePickerVisible(false);
            const d = new Date();
            d.setHours(hours, minutes, 0, 0);
            setStartTimeDate(d);
          }}
          hours={startTimeDate ? startTimeDate.getHours() : 9}
          minutes={startTimeDate ? startTimeDate.getMinutes() : 0}
        />

        <TimePickerModal
          visible={endTimePickerVisible}
          onDismiss={() => setEndTimePickerVisible(false)}
          onConfirm={({ hours, minutes }) => {
            setEndTimePickerVisible(false);
            const d = new Date();
            d.setHours(hours, minutes, 0, 0);
            setEndTimeDate(d);
          }}
          hours={endTimeDate ? endTimeDate.getHours() : 11}
          minutes={endTimeDate ? endTimeDate.getMinutes() : 0}
        />
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  card: { backgroundColor: "#0B1120", borderRadius: 18, marginBottom: 10, overflow: "hidden" },
  meta: { color: "#9CA3AF", fontSize: 12 },
  thumb: { width: "100%", height: 160, backgroundColor: "#111827" },
  thumbPreview: { width: "100%", height: 120, borderRadius: 12, marginTop: 8, backgroundColor: "#111827" },
  uploadRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
});