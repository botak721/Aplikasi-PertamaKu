import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { DriverHome } from '@/components/driver-home';
import { DriverOjek } from '@/components/driver-ojek';
import { C, F } from '@/constants/kampusgo';

export function DriverShell({ userId, nama }: { userId: string; nama: string }) {
  const [mode, setMode] = useState<'makanan' | 'ojek'>('makanan');

  return (
    <View style={styles.flex}>
      <View style={styles.modes}>
        {(
          [
            { key: 'makanan', label: 'Antar Makanan' },
            { key: 'ojek', label: 'Ojek Kampus' },
          ] as const
        ).map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.mode, mode === m.key && styles.modeOn]}
            onPress={() => setMode(m.key)}>
            <Text style={mode === m.key ? styles.modeTextOn : styles.modeText}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={[styles.flex, mode !== 'makanan' && styles.hidden]}>
        <DriverHome userId={userId} nama={nama} />
      </View>
      <View style={[styles.flex, mode !== 'ojek' && styles.hidden]}>
        <DriverOjek userId={userId} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hidden: { display: 'none' },
  modes: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  mode: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeOn: { backgroundColor: C.navy, borderColor: C.navy },
  modeText: { fontFamily: F.semi, fontSize: 14, color: C.navy },
  modeTextOn: { fontFamily: F.xbold, fontSize: 14, color: '#fff' },
});