import { useRef } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { COLORS } from '../../theme/colors';

type Props = { value: string; onChange: (v: string) => void; length?: number };


export function OTPInput({ value, onChange, length = 6 }: Props) {
  const ref = useRef<TextInput>(null);
  const digits = Array.from({ length }).map((_, i) => value[i] ?? "");

  return (
    <Pressable style={styles.row} onPress={() => ref.current?.focus()}>
      {digits.map((digit, i) => (
        <View key={i} style={styles.box}>
          <TextInput value={digit} editable={false} style={styles.char} />
        </View>
      ))}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(text) => onChange(text.replace(/[^0-9]/g, "").slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  box: { width: 42, height: 48, borderWidth: 1, borderColor: COLORS.slate300, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
  char: { fontSize: 20, fontWeight: "800", color: COLORS.slate900 },
  hidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
});





