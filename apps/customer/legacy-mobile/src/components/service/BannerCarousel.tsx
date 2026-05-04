import { memo, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import LinearGradient from "react-native-linear-gradient";

type BannerItem = {
  id: string;
  title?: string;
  imageUrl?: string;
};

type BannerCarouselProps = {
  banners: BannerItem[];
  onPressBanner: (item: BannerItem) => void;
  autoScroll?: boolean;
};

function BannerCarouselComponent({ banners, onPressBanner, autoScroll = true }: BannerCarouselProps) {
  const listRef = useRef<FlatList<BannerItem>>(null);
  const indexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const { width } = useWindowDimensions();
  const itemWidth = useMemo(() => width - 44, [width]);

  useEffect(() => {
    if (!autoScroll || banners.length <= 1) return;
    const timer = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % banners.length;
      setActiveIndex(indexRef.current);
      listRef.current?.scrollToIndex({ index: indexRef.current, animated: true });
    }, 3500);
    return () => clearInterval(timer);
  }, [autoScroll, banners.length]);

  const renderItem = ({ item, index }: { item: BannerItem; index: number }) => (
    <Pressable
      onPress={() => onPressBanner(item)}
      style={[styles.bannerCard, { width: itemWidth }, index === banners.length - 1 && styles.lastBanner]}
    >
      {item.imageUrl ? (
        <ImageBackground source={{ uri: item.imageUrl }} style={styles.bannerImage} resizeMode="cover">
          <LinearGradient colors={["rgba(2,6,23,0.10)", "rgba(2,6,23,0.64)"]} style={styles.bannerOverlay}>
            <Text style={styles.bannerTag}>FEATURED</Text>
            <Text style={styles.bannerTitle} numberOfLines={2}>{item.title ?? "Special Offer"}</Text>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <View style={styles.bannerImageFallback}>
          <Text style={styles.fallbackText}>{item.title ?? "Offer"}</Text>
        </View>
      )}
    </Pressable>
  );

  return (
    <>
      <FlatList
        ref={listRef}
        data={banners}
        horizontal
        pagingEnabled
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        getItemLayout={(_, index) => ({ length: itemWidth + 12, offset: (itemWidth + 12) * index, index })}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / (itemWidth + 12));
          if (Number.isFinite(next)) {
            indexRef.current = next;
            setActiveIndex(next);
          }
        }}
      />
      <View style={styles.dotsRow}>
        {banners.slice(0, 6).map((banner, idx) => (
          <View key={banner.id} style={[styles.dot, idx === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </>
  );
}

export const BannerCarousel = memo(BannerCarouselComponent);

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  bannerCard: {
    height: 150,
    borderRadius: 16,
    marginRight: 12,
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  lastBanner: {
    marginRight: 0,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
    gap: 5,
  },
  bannerTag: {
    color: "#E0F2FE",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  bannerImageFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D1D5DB",
    paddingHorizontal: 12,
  },
  fallbackText: {
    color: "#111827",
    fontWeight: "700",
    textAlign: "center",
  },
  dotsRow: {
    marginTop: 2,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#CBD5E1",
  },
  dotActive: {
    width: 18,
    borderRadius: 99,
    backgroundColor: "#0EA5E9",
  },
});
