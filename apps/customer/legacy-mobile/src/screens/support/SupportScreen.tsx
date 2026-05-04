import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export function SupportScreen() {
  return <View style={styles.root}><Text variant="headlineSmall">Support</Text><Text>Create and track support tickets from this module.</Text></View>;
}
const styles = StyleSheet.create({ root: { flex: 1, padding: 16, gap: 8 } });
