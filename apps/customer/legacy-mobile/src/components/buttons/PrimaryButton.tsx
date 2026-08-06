import { Button } from "react-native-paper";
import { palette, radii } from "../../constants/theme";

type Props = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  buttonColor?: string;
  textColor?: string;
  borderColor?: string;
  accessibilityLabel?: string;
};

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  buttonColor,
  textColor,
  borderColor,
  accessibilityLabel,
}: Props) {
  return (
    <Button
      mode="contained"
      onPress={onPress}
      loading={loading}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      buttonColor={buttonColor ?? palette.primary}
      textColor={textColor ?? palette.white}
      contentStyle={{ minHeight: 48 }}
      style={{ borderRadius: radii.pill, borderWidth: borderColor ? 1 : 0, borderColor }}
      labelStyle={{ fontWeight: "800", letterSpacing: 0.2 }}
    >
      {label}
    </Button>
  );
}


