import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

export function CartScreen() { return <View style={styles.root}><Text variant="headlineSmall">Cart</Text><Text>Cart API module is wired and ready for integration.</Text></View>; }
const styles = StyleSheet.create({ root: { flex: 1, padding: 16, gap: 8 } });
