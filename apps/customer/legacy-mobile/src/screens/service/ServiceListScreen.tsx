import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchBannersByCategory, fetchServicesByCategory } from "../../redux/serviceSlice";
import { addToCartThunk, clearRecentlyAdded } from "../../redux/cartSlice";
import { ServiceCard } from "../../components/service/ServiceCard";
import { BannerCarousel } from "../../components/service/BannerCarousel";
import { palette } from "../../constants/theme";

function formatPrice(value?: number) {
  if (!Number.isFinite(value)) return "Rs --";
  return `Rs ${Number(value).toLocaleString("en-IN")}`;
}

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.]/g, ""));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toValidServiceId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.]/g, ""));
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

function buildRatingLabel(item: any) {
  const ratingValue = toNumber(item?.rating, 0);
  const rating = ratingValue > 0 ? ratingValue.toFixed(1) : "N/A";
  const reviews = item?.totalReviews ?? item?.reviewsCount ?? item?.ratingCount ?? "0";
  return `* ${rating} (${reviews})`;
}

function ServiceGridShimmer() {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 850, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const placeholders = Array.from({ length: 6 }, (_, i) => `skeleton-${i}`);
  return (
    <View style={styles.skeletonGrid}>
      {placeholders.map((id) => (
        <Animated.View key={id} style={[styles.skeletonCard, { opacity: pulse }]}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonLineLg} />
          <View style={styles.skeletonLineSm} />
        </Animated.View>
      ))}
    </View>
  );
}

type SortMode = "popular" | "price_low" | "price_high" | "rating" | "new";

export function ServiceListScreen({ route, navigation }: any) {
  const dispatch = useAppDispatch();
  const { services, loading, refreshing, loadingMore, hasMore, page, error, banners, bannersLoading, bannersError } = useAppSelector((state) => state.service);
  const authToken = useAppSelector((state) => state.auth.token);
  const recentlyAddedServiceId = useAppSelector((state) => state.cart.recentlyAddedServiceId);
  const categoryId = route?.params?.categoryId;

  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const [quickOnly, setQuickOnly] = useState(false);

  const mappedServices = useMemo(
    () =>
      (services || []).map((item: any) => {
        const id = toValidServiceId(item?.id ?? item?.serviceId);
        const discountedPrice = toNumber(item?.discountedPrice ?? item?.price ?? item?.finalPrice, 0);
        const originalPrice = toNumber(item?.originalPrice ?? item?.mrp, 0);
        const rating = toNumber(item?.rating, 0);
        const isNew = Boolean(item?.new ?? item?.isNew);
        return {
          id,
          name: String(item?.serviceName ?? item?.name ?? item?.title ?? "Service"),
          imageUrl: item?.imageUrl ?? item?.thumbnailUrl ?? item?.serviceImageUrl,
          isNew,
          rating,
          ratingLabel: buildRatingLabel(item),
          discountedPrice,
          discountedPriceLabel: formatPrice(discountedPrice),
          originalPriceLabel: originalPrice > discountedPrice ? formatPrice(originalPrice) : undefined,
        };
      }).filter((row) => Number.isFinite(row.id) && Number(row.id) > 0),
    [services],
  );

  const sortedServices = useMemo(() => {
    const rows = [...mappedServices];
    if (quickOnly) {
      rows.sort((a, b) => a.discountedPrice - b.discountedPrice);
      return rows.slice(0, 8);
    }
    if (sortMode === "price_low") rows.sort((a, b) => a.discountedPrice - b.discountedPrice);
    if (sortMode === "price_high") rows.sort((a, b) => b.discountedPrice - a.discountedPrice);
    if (sortMode === "rating") rows.sort((a, b) => b.rating - a.rating);
    if (sortMode === "new") rows.sort((a, b) => Number(b.isNew) - Number(a.isNew));
    return rows;
  }, [mappedServices, quickOnly, sortMode]);

  const loadServices = useCallback(() => {
    if (!categoryId && categoryId !== 0) return;
    dispatch(fetchServicesByCategory({ categoryId, page: 0, size: 20, append: false }));
  }, [categoryId, dispatch]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    if (!categoryId && categoryId !== 0) return;
    dispatch(fetchBannersByCategory({ categoryId }));
  }, [categoryId, dispatch]);

  const handleRefresh = useCallback(() => {
    if (!categoryId && categoryId !== 0) return;
    dispatch(fetchServicesByCategory({ categoryId, page: 0, size: 20, append: false }));
  }, [categoryId, dispatch]);

  const handleLoadMore = useCallback(() => {
    if (!categoryId && categoryId !== 0) return;
    if (loading || refreshing || loadingMore || !hasMore) return;
    dispatch(fetchServicesByCategory({ categoryId, page: page + 1, size: 20, append: true }));
  }, [categoryId, dispatch, hasMore, loading, loadingMore, page, refreshing]);

  const handleAdd = useCallback(async (serviceId: number) => {
    if (!authToken) {
      Alert.alert("Login Required", "Please login again. Authorization token is missing.");
      return;
    }
    try {
      await dispatch(addToCartThunk({ serviceId, quantity: 1 })).unwrap();
      navigation.navigate("CartCrud");
    } catch (e: any) {
      Alert.alert("Add to cart failed", String(e?.message ?? "Please try again."));
    }
  }, [authToken, dispatch, navigation]);

  useEffect(() => {
    if (!recentlyAddedServiceId) return;
    const timer = setTimeout(() => {
      dispatch(clearRecentlyAdded());
    }, 1400);
    return () => clearTimeout(timer);
  }, [dispatch, recentlyAddedServiceId]);

  const handleCardPress = useCallback((serviceId: number | null) => {
    if (!serviceId || !Number.isFinite(serviceId) || serviceId <= 0) return;
    navigation.navigate("ServiceDetail", { serviceId: String(serviceId) });
  }, [navigation]);

  const renderItem = useCallback(({ item }: any) => (
    <ServiceCard item={item} onAdd={handleAdd} onPress={handleCardPress} isAdded={Number(recentlyAddedServiceId) === Number(item.id)} />
  ), [handleAdd, handleCardPress, recentlyAddedServiceId]);

  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  const mappedBanners = useMemo(
    () =>
      (banners || [])
        .map((item: any, index: number) => ({
          id: String(item?.bannerId ?? item?.id ?? index),
          title: item?.title,
          imageUrl: item?.bannerImageUrl ?? item?.imageUrl,
          redirectType: String(item?.redirectType ?? "").toUpperCase(),
          redirectValue: item?.redirectValue,
          redirectUrl: item?.redirectUrl,
        }))
        .filter((item) => item.id.length > 0),
    [banners],
  );

  const handleBannerPress = useCallback(async (item: any) => {
    if (item.redirectType === "CATEGORY" && item.redirectValue != null) {
      navigation.push("ServiceList", { categoryId: item.redirectValue, categoryName: item.title ?? "Services" });
      return;
    }
    if (item.redirectType === "SERVICE") {
      const serviceId = Number(item.redirectValue);
      if (Number.isFinite(serviceId) && serviceId > 0) {
        navigation.navigate("ServiceDetail", { serviceId: String(serviceId) });
        return;
      }
    }
    if (item.redirectType === "EXTERNAL") {
      const url = String(item.redirectUrl ?? item.redirectValue ?? "").trim();
      if (url.length > 0) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) await Linking.openURL(url);
      }
    }
  }, [navigation]);

  return (
    <View style={styles.root}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stickyFiltersWrap}>
        <Pressable style={[styles.filterChip, sortMode === "popular" && styles.filterChipActive]} onPress={() => setSortMode("popular")}>
          <MaterialCommunityIcon name="trending-up" size={14} color={sortMode === "popular" ? "#075985" : "#475569"} />
          <Text style={[styles.filterChipText, sortMode === "popular" && styles.filterChipTextActive]}>Popular</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, sortMode === "rating" && styles.filterChipActive]} onPress={() => setSortMode("rating")}>
          <MaterialCommunityIcon name="star-circle-outline" size={14} color={sortMode === "rating" ? "#075985" : "#475569"} />
          <Text style={[styles.filterChipText, sortMode === "rating" && styles.filterChipTextActive]}>Top Rated</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, sortMode === "price_low" && styles.filterChipActive]} onPress={() => setSortMode("price_low")}>
          <MaterialCommunityIcon name="cash-minus" size={14} color={sortMode === "price_low" ? "#075985" : "#475569"} />
          <Text style={[styles.filterChipText, sortMode === "price_low" && styles.filterChipTextActive]}>Price Low</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, sortMode === "price_high" && styles.filterChipActive]} onPress={() => setSortMode("price_high")}>
          <MaterialCommunityIcon name="cash-plus" size={14} color={sortMode === "price_high" ? "#075985" : "#475569"} />
          <Text style={[styles.filterChipText, sortMode === "price_high" && styles.filterChipTextActive]}>Price High</Text>
        </Pressable>
        <Pressable style={[styles.filterChip, quickOnly && styles.filterChipActive]} onPress={() => setQuickOnly((v) => !v)}>
          <MaterialCommunityIcon name="lightning-bolt-outline" size={14} color={quickOnly ? "#075985" : "#475569"} />
          <Text style={[styles.filterChipText, quickOnly && styles.filterChipTextActive]}>Quick Picks</Text>
        </Pressable>
      </ScrollView>

      <FlatList
        data={!loading && !error ? sortedServices : []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={(
          <>
            {bannersLoading ? <View style={styles.bannerSkeleton} /> : null}
            {!bannersLoading && mappedBanners.length > 0 ? <BannerCarousel banners={mappedBanners} onPressBanner={handleBannerPress} autoScroll /> : null}
            {!bannersLoading && bannersError ? <Text style={styles.bannerErrorText}>Promotional banners unavailable right now.</Text> : null}

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>Available Services</Text>
              <Text style={styles.sectionSub}>Tap any card for quick view</Text>
            </View>

            {loading ? <ServiceGridShimmer /> : null}
            {!loading && error ? (
              <View style={styles.centerWrap}>
                <Text style={styles.errorText}>{error}</Text>
                <Pressable style={styles.retryButton} onPress={loadServices}><Text style={styles.retryButtonText}>Retry</Text></Pressable>
              </View>
            ) : null}
            {!loading && !error && sortedServices.length === 0 ? (
              <View style={styles.centerWrap}><Text style={styles.emptyText}>No services available in this category right now.</Text></View>
            ) : null}
          </>
        )}
        ListFooterComponent={(
          <>
            <View style={styles.footerSpacer} />
            {loadingMore ? <ActivityIndicator size="small" color={palette.accentBlue} style={styles.loaderBottom} /> : null}
            <View style={styles.footerSpacer} />
          </>
        )}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EEF6FF" },
  stickyFiltersWrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
    backgroundColor: "#EEF6FF",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipActive: { backgroundColor: "#DBEAFE", borderColor: "#93C5FD" },
  filterChipText: { color: "#334155", fontSize: 12, fontWeight: "700" },
  filterChipTextActive: { color: "#075985" },
  sectionHead: { paddingHorizontal: 16, marginTop: 10, marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: palette.text },
  sectionSub: { color: palette.muted, marginTop: 2, fontSize: 12 },
  listContent: { paddingHorizontal: 8, paddingBottom: 14, backgroundColor: "#EEF6FF" },
  row: { justifyContent: "space-between" },
  footerSpacer: { height: 12 },
  centerWrap: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 22 },
  emptyText: { color: "#6B7280", fontSize: 15, fontWeight: "600", textAlign: "center" },
  errorText: { color: "#B91C1C", fontSize: 14, textAlign: "center", marginBottom: 12 },
  retryButton: { backgroundColor: palette.accentBlue, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  retryButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8, justifyContent: "space-between" },
  skeletonCard: { width: "48%", margin: 8, borderRadius: 16, backgroundColor: "#FFFFFF", padding: 10 },
  skeletonImage: { height: 132, borderRadius: 12, backgroundColor: "#E5E7EB" },
  skeletonLineLg: { marginTop: 10, height: 14, borderRadius: 7, backgroundColor: "#E5E7EB" },
  skeletonLineSm: { marginTop: 8, width: "62%", height: 12, borderRadius: 6, backgroundColor: "#E5E7EB" },
  loaderBottom: { marginTop: 8 },
  bannerSkeleton: { height: 160, borderRadius: 18, backgroundColor: "#E5E7EB", marginHorizontal: 16, marginVertical: 12 },
  bannerErrorText: { marginHorizontal: 16, marginTop: 4, marginBottom: 6, color: "#6B7280", fontSize: 12 },
});
