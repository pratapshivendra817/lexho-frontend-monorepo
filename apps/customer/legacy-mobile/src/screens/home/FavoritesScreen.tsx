import { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import { addFavorite, removeFavorite } from "../../api/favoritesApi";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchFavorites } from "../../redux/favoritesSlice";
import { COLORS } from '../../theme/colors';

export function FavoritesScreen() {
  const dispatch = useAppDispatch();
  const { list, loading, error } = useAppSelector((s) => s.favorites);
  const [serviceId, setServiceId] = useState("");
  useEffect(() => { dispatch(fetchFavorites()); }, [dispatch]);

  const add = async () => {
    const trimmed = serviceId.trim();
    if (!trimmed) {
      return;
    }
    await addFavorite({ serviceId: trimmed });
    setServiceId("");
    dispatch(fetchFavorites());
  };
  const remove = async (id: string) => { await removeFavorite(id); dispatch(fetchFavorites()); };

  return <View style={styles.root}><Text variant="headlineSmall">Favorites</Text><TextInput mode="outlined" label="Service ID" value={serviceId} onChangeText={setServiceId} /><Button mode="contained" onPress={add} disabled={!serviceId.trim()}>Add Favorite</Button>{loading ? <Text>Loading...</Text> : null}{error ? <Text style={styles.err}>{error}</Text> : null}<FlatList data={list} keyExtractor={(item, i) => String(item?.id ?? i)} renderItem={({ item }) => <View style={styles.row}><Text>{item?.name ?? 'Favorite'}</Text><Button compact onPress={() => remove(String(item?.id))}>Remove</Button></View>} /></View>;
}

const styles = StyleSheet.create({ root: { flex: 1, padding: 16, gap: 8 }, row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.gray, flexDirection: 'row', justifyContent: 'space-between' }, err: { color: COLORS.danger } });






