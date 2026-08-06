import { useEffect, useMemo, useRef } from "react";
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Card, Chip, Text } from "react-native-paper";

import type { Banner } from "../types/api";

type Props = {
  banners: Banner[];
  onClick: (id: string) => void;
  onImpression: (id: string) => void;
  onRedeem?: (id: string) => void;
};

export function BannerCarousel({ banners, onClick, onImpression, onRedeem }: Props) {
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Banner>>(null);
  const indexRef = useRef(0);
  const impressed = useRef(new Set<string>());

  const itemWidth = useMemo(() => Math.max(260, width - 32), [width]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const timer = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % banners.length;
      listRef.current?.scrollToIndex({ index: indexRef.current, animated: true });
    }, 3500);
    return () => clearInterval(timer);
  }, [banners.length]);

  if (!banners.length) return null;

  return (
    <FlatList
      ref={listRef}
      horizontal
      data={banners}
      keyExtractor={(item, index) => `${item.id}-${index}`}
      showsHorizontalScrollIndicator={false}
      pagingEnabled
      onViewableItemsChanged={({ viewableItems }) => {
        viewableItems.forEach((entry) => {
          const id = entry.item?.id;
          if (!id || impressed.current.has(id)) return;
          impressed.current.add(id);
          onImpression(id);
        });
      }}
      renderItem={({ item }) => (
        <Pressable onPress={() => onClick(item.id)} style={[styles.itemWrap, { width: itemWidth }]}>
          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              <View style={styles.copy}>
                <Text variant="titleLarge">{item.title}</Text>
                {item.promoCode ? <Chip compact icon="ticket-percent">{item.promoCode}</Chip> : null}
              </View>
              {onRedeem ? (
                <Chip mode="flat" icon="gift" onPress={() => onRedeem(item.id)}>
                  Redeem
                </Chip>
              ) : null}
            </Card.Content>
          </Card>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  itemWrap: {
    marginRight: 12,
  },
  card: {
    borderRadius: 16,
  },
  cardContent: {
    minHeight: 130,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  copy: {
    gap: 10,
    flex: 1,
    paddingRight: 8,
  },
});



