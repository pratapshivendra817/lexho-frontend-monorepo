import { memo, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import LinearGradient from "react-native-linear-gradient";


import { COLORS } from '../../theme/colors';

type BannerItem = {
  id: string;
  title?: string;
  imageUrl?: string;
};

type BannerCarouselProps = {
  banners: BannerItem[];
  onPressBanner: (item: BannerItem) => void;
  autoScroll?: boolean;
  imageRequestHeaders?: Record<string, string>;
  bannerHeight?: number;
};

function BannerCarouselComponent({ banners, onPressBanner, autoScroll = true, imageRequestHeaders, bannerHeight = 252 }: BannerCarouselProps) {
  const listRef = useRef<FlatList<BannerItem>>(null);
  const indexRef = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const { width } = useWindowDimensions();
  const itemWidth = useMemo(() => width, [width]);

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
      style={[styles.bannerCard, { width: itemWidth, height: bannerHeight }, index === banners.length - 1 && styles.lastBanner]}
    >
      {item.imageUrl ? (
        <ImageBackground
          source={
            imageRequestHeaders && Object.keys(imageRequestHeaders).length > 0
              ? { uri: item.imageUrl, headers: imageRequestHeaders }
              : { uri: item.imageUrl }
          }
          style={styles.bannerImage}
          resizeMode="cover"
        >
          <LinearGradient colors={["rgba(2,6,23,0.10)", "rgba(2,6,23,0.64)"]} style={styles.bannerOverlay}>
            <Text style={styles.bannerTag}>FEATURED</Text>
            <Text style={styles.bannerTitle} numberOfLines={2}>{item.title ?? "Special Offer"}</Text>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <View style={styles.bannerImageFallback}>
          <LinearGradient colors={["rgba(2,6,23,0.10)", "rgba(2,6,23,0.64)"]} style={styles.bannerOverlay}>
            <Text style={styles.bannerTag}>FEATURED</Text>
            <Text style={styles.bannerTitle} numberOfLines={2}>{item.title ?? "Special Offer"}</Text>
          </LinearGradient>
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
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        getItemLayout={(_, index) => ({ length: itemWidth, offset: itemWidth * index, index })}
        onMomentumScrollEnd={(event) => {
          const next = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
          if (Number.isFinite(next)) {
            indexRef.current = next;
            setActiveIndex(next);
          }
        }}
      />
      <View style={styles.dotsRow}>
        {banners.slice(0, 6).map((banner, idx) => (
          <View key={`${banner.id}-${idx}`} style={[styles.dot, idx === activeIndex && styles.dotActive]} />
        ))}
      </View>
    </>
  );
}

export const BannerCarousel = memo(BannerCarouselComponent);

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 8,
  },
  bannerCard: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginRight: 0,
    overflow: "hidden",
    backgroundColor: COLORS.neutral200,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    shadowColor: "#041C4A",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
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
    padding: 16,
    gap: 6,
    backgroundColor: "rgba(2, 27, 74, 0.40)",
  },
  bannerTag: {
    color: COLORS.goldSoft,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  bannerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
  },
  bannerImageFallback: {
    flex: 1,
    backgroundColor: COLORS.navyDark,
  },
  dotsRow: {
    marginTop: 8,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: {
    width: 16,
    borderRadius: 99,
    backgroundColor: COLORS.goldSoft,
  },
});






