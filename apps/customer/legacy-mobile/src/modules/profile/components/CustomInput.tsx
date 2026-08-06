import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { TextInput } from "react-native-paper";
import { COLORS } from '../../../theme/colors';

type Props = {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  error?: string;
  editable?: boolean;
  keyboardType?: "default" | "email-address" | "number-pad";
  multiline?: boolean;
};

export const CustomInput = memo(function CustomInput(props: Props) {
  const { label, value, onChangeText, placeholder, error, editable = true, keyboardType = "default", multiline = false } = props;
  return (
    <View style={styles.wrap}>
      <TextInput
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        editable={editable}
        keyboardType={keyboardType}
        multiline={multiline}
        outlineColor={COLORS.borderSoft}
        activeOutlineColor={COLORS.navy}
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: 5 },
  input: { backgroundColor: COLORS.white },
  error: { color: COLORS.red700, fontSize: 12, fontWeight: "600" },
});






