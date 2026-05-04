import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  ImageBackground,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import { getCustomerHomeBanners, type CustomerHomeBanner } from "../../api/customerHomeBannerApi";

type CustomerHomeBannerCarouselProps = {
  navigation: any;
};

function CustomerHomeBannerCarouselComponent({ navigation }: CustomerHomeBannerCarouselProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CustomerHomeBanner[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<CustomerHomeBanner>>(null);
  const indexRef = useRef(0);
  const { width } = useWindowDimensions();
  const cardWidth = Math.max(width - 48, 220);
  const cardGap = 12;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getCustomerHomeBanners("BOTTOM");
      setItems(rows);
      indexRef.current = 0;
      setActiveIndex(0);
    } catch (e: any) {
      setItems([]);
      setError(String(e?.message ?? "Unable to load banners"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % items.length;
      indexRef.current = next;
      setActiveIndex(next);
      listRef.current?.scrollToOffset({ offset: (cardWidth + cardGap) * next, animated: true });
    }, 3500);
    return () => clearInterval(timer);
  }, [cardGap, cardWidth, items.length]);

  const onPressBanner = useCallback(async (banner: CustomerHomeBanner) => {
    const type = String(banner.redirectType ?? "").toUpperCase();
    if (type === "CATEGORY" && banner.redirectValue != null) {
      navigation.navigate("ServiceList", { categoryId: banner.redirectValue, categoryName: banner.title ?? "Services" });
      return;
    }
    if (type === "SERVICE") {
      const serviceId = Number(banner.redirectValue);
      if (Number.isFinite(serviceId) && serviceId > 0) {
        navigation.navigate("ServiceDetail", { serviceId: String(serviceId) });
        return;
      }
    }
    if (type === "EXTERNAL") {
      const url = String(banner.redirectUrl ?? banner.redirectValue ?? "").trim();
      if (!url) return;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) await Linking.openURL(url);
    }
  }, [navigation]);

  const showSection = loading || !!error || items.length > 0;
  const dots = useMemo(() => items.slice(0, 6), [items]);

  if (!showSection) return null;

  return (
    <View style={styles.sectionWrap}>
      {loading ? <View style={styles.skeleton} /> : null}
      {!loading && error ? (
        <View style={styles.errorWrap}>
          <Text style={styles.errorText}>Unable to load home banners.</Text>
          <Pressable style={styles.retryButton} onPress={() => void load()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {!loading && !error && items.length > 0 ? (
        <>
          <FlatList
            ref={listRef}
            horizontal
            data={items}
            pagingEnabled
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            getItemLayout={(_, index) => ({
              length: cardWidth + cardGap,
              offset: (cardWidth + cardGap) * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              const safeIndex = Math.max(0, Math.min(info.index, Math.max(items.length - 1, 0)));
              indexRef.current = safeIndex;
              requestAnimationFrame(() => {
                listRef.current?.scrollToOffset({ offset: (cardWidth + cardGap) * safeIndex, animated: true });
              });
            }}
            onMomentumScrollEnd={(event) => {
              const next = Math.round(event.nativeEvent.contentOffset.x / (cardWidth + cardGap));
              if (Number.isFinite(next)) {
                indexRef.current = next;
                setActiveIndex(next);
              }
            }}
            renderItem={({ item, index }) => (
              <Pressable
                style={[styles.card, { width: cardWidth }, index === items.length - 1 && styles.lastCard]}
                onPress={() => void onPressBanner(item)}
              >
                <ImageBackground source={{ uri: item.imageUrl }} resizeMode="cover" style={styles.bannerImage} imageStyle={styles.imageRounded}>
                  {(item.title || item.subtitle) ? (
                    <LinearGradient colors={["rgba(15,23,42,0.18)", "rgba(15,23,42,0.64)"]} style={styles.overlay}>
                      {item.title ? <Text style={styles.title} numberOfLines={2}>{item.title}</Text> : null}
                      {item.subtitle ? <Text style={styles.subtitle} numberOfLines={2}>{item.subtitle}</Text> : null}
                    </LinearGradient>
                  ) : null}
                </ImageBackground>
              </Pressable>
            )}
          />
          <View style={styles.dotsRow}>
            {dots.map((item, index) => (
              <View key={item.id} style={[styles.dot, index === activeIndex && styles.dotActive]} />
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

export const CustomerHomeBannerCarousel = memo(CustomerHomeBannerCarouselComponent);

const styles = StyleSheet.create({
  sectionWrap: {
    marginTop: 6,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  card: {
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#E2E8F0",
  },
  lastCard: {
    marginRight: 0,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  imageRounded: {
    borderRadius: 12,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
    gap: 4,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  subtitle: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    marginBottom: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#CBD5E1",
  },
  dotActive: {
    width: 18,
    borderRadius: 999,
    backgroundColor: "#0EA5E9",
  },
  skeleton: {
    marginHorizontal: 16,
    marginTop: 8,
    height: 150,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  errorWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  errorText: {
    color: "#64748B",
    fontSize: 12,
    flex: 1,
  },
  retryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#E0F2FE",
  },
  retryButtonText: {
    color: "#0369A1",
    fontSize: 12,
    fontWeight: "700",
  },
});
