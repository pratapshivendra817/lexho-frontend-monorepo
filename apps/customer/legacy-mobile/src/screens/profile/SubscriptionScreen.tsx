import { useEffect } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import { createSubscription } from "../../api/subscriptionApi";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchSubscriptions } from "../../redux/subscriptionSlice";

export function SubscriptionScreen() {
  const dispatch = useAppDispatch();
  const { list, loading, error } = useAppSelector((s) => s.subscriptions);
  useEffect(() => { dispatch(fetchSubscriptions()); }, [dispatch]);

  const create = async () => { await createSubscription({ planId: 'monthly-cleaning' }); dispatch(fetchSubscriptions()); };

  return <View style={styles.root}><Text variant="headlineSmall">Subscriptions</Text><Button mode="contained" onPress={create}>Create Demo Subscription</Button>{loading ? <Text>Loading...</Text> : null}{error ? <Text style={styles.err}>{error}</Text> : null}<FlatList data={list} keyExtractor={(item, i) => String(item?.id ?? i)} renderItem={({ item }) => <Text style={styles.row}>{item?.name ?? item?.planId ?? 'Subscription'}</Text>} /></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, padding: 16, gap: 8 }, row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' }, err: { color: '#DC2626' } });
