import React, { memo } from "react";
import { Pressable, Text, View } from "react-native";

const OPTIONS = [
  { label: "Male", value: "MALE" },
  { label: "Female", value: "FEMALE" },
  { label: "Other", value: "OTHER" },
];

type Props = {
  value: string;
  onChange: (value: string) => void;
  styles: any;
  disabled?: boolean;
};

function GenderSelectorComponent({ value, onChange, styles, disabled = false }: Props) {
  return (
    <View style={styles.genderRow}>
      {OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <Pressable
            key={option.value}
            disabled={disabled}
            style={[styles.genderButton, active ? styles.genderButtonActive : null, disabled ? styles.genderButtonDisabled : null]}
            onPress={() => onChange(option.value)}
          >
            <Text style={[styles.genderText, active ? styles.genderTextActive : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const GenderSelector = memo(GenderSelectorComponent);
