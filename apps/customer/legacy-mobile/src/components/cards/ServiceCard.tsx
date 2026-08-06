import { StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { palette } from "../../constants/theme";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { COLORS } from '../../theme/colors';

export function ServiceCard({
  title,
  price,
  subtitle,
  badge = "Recommended",
}: {
  title: string;
  price?: string;
  subtitle?: string;
  badge?: string;
}) {
  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.badge}>
          <MaterialCommunityIcon name="sparkles" size={11} color={COLORS.blue600} />
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {price ? <Text style={styles.price}>{price}</Text> : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 170,
    minHeight: 128,
    marginRight: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    shadowColor: COLORS.slate900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: "hidden",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.offWhite,
    marginBottom: 8,
  },
  badgeText: {
    color: COLORS.blue600,
    fontSize: 10,
    fontWeight: "700",
  },
  title: { fontWeight: "800", color: COLORS.slate900, fontSize: 15, lineHeight: 20 },
  subtitle: { marginTop: 6, color: COLORS.slate500, fontSize: 12, lineHeight: 16 },
  price: { marginTop: 8, color: palette.primaryDark, fontWeight: "700", fontSize: 14 },
});







