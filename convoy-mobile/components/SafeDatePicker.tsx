import React, { useState } from 'react';
import { View, Platform, TouchableOpacity } from 'react-native';
import { TextInput, Text } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SafeDatePicker({ label, value, onChange, mode = 'date' }: any) {
  const [show, setShow] = useState(false);

  const handleChange = (event: any, selectedDate?: Date) => {
    setShow(false); // Close immediately
    if (event.type === 'set' && selectedDate) {
      onChange(selectedDate);
    }
  };

  if (Platform.OS === 'android') {
    return (
      <View style={{ marginBottom: 15 }}>
        <TouchableOpacity onPress={() => setShow(true)}>
          <TextInput
            label={label}
            value={mode === 'time' 
              ? value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
              : value.toLocaleDateString()}
            editable={false}
            right={<TextInput.Icon icon={mode === 'time' ? 'clock' : 'calendar'} onPress={() => setShow(true)} />}
            mode="outlined"
            style={{ backgroundColor: 'white' }}
          />
        </TouchableOpacity>
        {show && (
          <DateTimePicker
            value={value}
            mode={mode}
            display="default"
            onChange={handleChange}
          />
        )}
      </View>
    );
  }

  // iOS is different (inline usually preferred)
  return (
    <View style={{ marginBottom: 15 }}>
      <Text variant="bodyMedium" style={{ marginBottom: 5 }}>{label}</Text>
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        onChange={(e, d) => d && onChange(d)}
      />
    </View>
  );
}
