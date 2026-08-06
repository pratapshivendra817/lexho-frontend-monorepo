import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { COLORS } from '../../theme/colors';

export function EmptyStateCard({ title, subtitle, onPress }: { title: string; subtitle: string; onPress?: () => void }) {
  const content = (
    <>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.box} onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return (
    <View style={styles.box}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 16, borderRadius: 16, backgroundColor: COLORS.navyDark, borderWidth: 1, borderColor: COLORS.goldSoft },
  title: { fontSize: 16, fontWeight: "700", color: COLORS.white },
  subtitle: { marginTop: 4, color: COLORS.neutral100 },
});
