import { useMutation, useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { useState } from "react";
import { addReview, getServiceReviews } from "../../api/reviewApi";

export function ReviewScreen() {
  const [serviceId, setServiceId] = useState('');
  const reviews = useQuery({ queryKey: ['reviews', serviceId], queryFn: () => getServiceReviews(serviceId) });
  const add = useMutation({ mutationFn: () => addReview({ serviceId, rating: 5, comment: 'Great service' }) });

  return <View style={styles.root}><Text variant="headlineSmall">Reviews</Text><TextInput mode="outlined" label="Service ID" value={serviceId} onChangeText={setServiceId} /><Button mode="contained" onPress={() => add.mutate()} loading={add.isPending} disabled={!serviceId.trim()}>Add Review</Button><Text>{JSON.stringify(reviews.data ?? [], null, 2)}</Text></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, padding: 16, gap: 10 } });


