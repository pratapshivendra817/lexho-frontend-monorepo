import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { COLORS } from '../../theme/colors';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { fetchBannersByCategory, fetchServicesByCategory } from "../../redux/serviceSlice";
import { ServiceCard } from "../../components/service/ServiceCard";
import { BannerCarousel } from "../../components/service/BannerCarousel";
import { palette } from "../../constants/theme";
import { DEV_INTERNAL_TOKEN, DEV_LOGIN_BYPASS } from "../../constants/env";
import { getToken } from "../../utils/storage";

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

function normalizeSearch(value: unknown) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
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
  const { width } = useWindowDimensions();
  const BANNER_HEIGHT = Math.max(width * 0.9, 340);
  const listRef = useRef<FlatList<any>>(null);
  const dispatch = useAppDispatch();
  const { services, loading, refreshing, loadingMore, hasMore, page, error, banners, bannersLoading, bannersError } = useAppSelector((state) => state.service);
  const authToken = useAppSelector((state) => state.auth.token);
  const [imageAuthToken, setImageAuthToken] = useState("");
  const categoryId = route?.params?.categoryId;
  const categoryName = String(route?.params?.categoryName ?? "").trim();
  const isCookCategory = useMemo(() => {
    const normalized = normalizeSearch(categoryName);
    return normalized.includes("cook") || normalized.includes("chef") || normalized.includes("breakfast") || normalized.includes("party") || normalized.includes("parties");
  }, [categoryName]);
  const isCleaningCategory = useMemo(() => {
    const normalized = normalizeSearch(categoryName);
    return normalized.includes("clean");
  }, [categoryName]);

  const [sortMode, setSortMode] = useState<SortMode>("popular");
  const [quickOnly, setQuickOnly] = useState(false);
  const bannerScrollY = useRef(new Animated.Value(0)).current;

  const bannerOpacity = bannerScrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const bannerScale = bannerScrollY.interpolate({
    inputRange: [0, 170],
    outputRange: [1, 1],
    extrapolate: "clamp",
  });
  const bannerTranslateY = bannerScrollY.interpolate({
    inputRange: [0, 170],
    outputRange: [0, -170],
    extrapolate: "clamp",
  });

  useEffect(() => {
    bannerScrollY.setValue(0);
    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    });
  }, [bannerScrollY, categoryId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const tokenFromRedux = String(authToken ?? "").trim();
      if (tokenFromRedux) {
        if (mounted) setImageAuthToken(tokenFromRedux);
        return;
      }
      try {
        const tokenFromStorage = String((await getToken()) ?? "").trim();
        if (mounted) setImageAuthToken(tokenFromStorage);
      } catch {
        if (mounted) setImageAuthToken("");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [authToken]);

  const imageRequestHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (imageAuthToken) headers.Authorization = `Bearer ${imageAuthToken}`;
    if (DEV_LOGIN_BYPASS && __DEV__) headers["X-Internal-Token"] = DEV_INTERNAL_TOKEN;
    return headers;
  }, [imageAuthToken]);

  const normalizeImageUrl = useCallback((value: unknown) => {
    const raw = String(value ?? "").trim();
    if (!raw) return undefined;
    return raw;
  }, []);

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
          imageUrl: normalizeImageUrl(item?.imageUrl ?? item?.thumbnailUrl ?? item?.serviceImageUrl),
          isNew,
          rating,
          ratingLabel: buildRatingLabel(item),
          discountedPrice,
          discountedPriceLabel: formatPrice(discountedPrice),
          originalPriceLabel: originalPrice > discountedPrice ? formatPrice(originalPrice) : undefined,
        };
      }).filter((row) => Number.isFinite(row.id) && Number(row.id) > 0),
    [normalizeImageUrl, services],
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

  const servicesById = useMemo(() => {
    const map = new Map<number, any>();
    sortedServices.forEach((row) => {
      map.set(Number(row.id), row);
    });
    return map;
  }, [sortedServices]);

  const loadServices = useCallback(() => {
    if (!categoryId && categoryId !== 0) return;
    dispatch(fetchServicesByCategory({ categoryId, page: 0, size: 20, append: false }));
  }, [categoryId, dispatch]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  useEffect(() => {
    dispatch(fetchBannersByCategory({ categoryId: categoryId ?? "" }));
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

  const handleCardPress = useCallback((serviceId: number | null) => {
    if (!serviceId || !Number.isFinite(serviceId) || serviceId <= 0) return;
    const selected = servicesById.get(Number(serviceId));
    navigation.navigate("ServiceDetail", {
      serviceId: String(serviceId),
      serviceName: selected?.name,
      servicePriceLabel: selected?.discountedPriceLabel,
      serviceImageUrl: selected?.imageUrl,
      categoryId: String(categoryId ?? ""),
      categoryName,
      showCookCoverage: isCookCategory,
      showCleaningCoverage: isCleaningCategory,
    });
  }, [categoryId, categoryName, isCleaningCategory, isCookCategory, navigation, servicesById]);

  const renderItem = useCallback(({ item }: any) => (
    <ServiceCard
      item={item}
      onAdd={handleCardPress}
      onPress={handleCardPress}
      isAdded={false}
      imageRequestHeaders={imageRequestHeaders}
    />
  ), [handleCardPress, imageRequestHeaders]);

  const keyExtractor = useCallback((item: any) => item.id.toString(), []);

  const mappedBanners = useMemo(
    () =>
      (banners || [])
        .map((item: any, index: number) => ({
          id: String(item?.bannerId ?? item?.id ?? index),
          title: item?.title,
          imageUrl: normalizeImageUrl(item?.bannerImageUrl ?? item?.imageUrl),
          redirectType: String(item?.redirectType ?? "").toUpperCase(),
          redirectValue: item?.redirectValue,
          redirectUrl: item?.redirectUrl,
        }))
        .filter((item) => item.id.length > 0),
    [banners, normalizeImageUrl],
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
      <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={10}>
        <MaterialCommunityIcon name="chevron-left" size={24} color={COLORS.white} />
      </Pressable>
      <Animated.FlatList
        ref={listRef}
        data={!loading && !error ? sortedServices : []}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={3}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.row}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: bannerScrollY } } }],
          {
            useNativeDriver: true,
          },
        )}
        scrollEventThrottle={16}
        ListHeaderComponent={(
          <>
            {bannersLoading ? (
              <Animated.View style={[styles.bannerAnimWrap, { height: BANNER_HEIGHT }]}>
                <Animated.View style={{ opacity: bannerOpacity, transform: [{ translateY: bannerTranslateY }, { scale: bannerScale }] }}>
                  <View style={styles.bannerSkeleton} />
                </Animated.View>
              </Animated.View>
            ) : null}
            {!bannersLoading && mappedBanners.length > 0 ? (
              <Animated.View style={[styles.bannerAnimWrap, { height: BANNER_HEIGHT }]}>
                <Animated.View style={{ opacity: bannerOpacity, transform: [{ translateY: bannerTranslateY }, { scale: bannerScale }] }}>
                  <View style={styles.bannerEdgeToEdge}>
                    <BannerCarousel
                      banners={mappedBanners}
                      onPressBanner={handleBannerPress}
                      autoScroll={false}
                      imageRequestHeaders={imageRequestHeaders}
                      bannerHeight={BANNER_HEIGHT}
                    />
                  </View>
                </Animated.View>
              </Animated.View>
            ) : null}
            {!bannersLoading && bannersError ? <Text style={styles.bannerErrorText}>Promotional banners unavailable right now.</Text> : null}

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stickyFiltersWrap}>
              <Pressable style={[styles.filterChip, sortMode === "popular" && styles.filterChipActive]} onPress={() => setSortMode("popular")}>
                <MaterialCommunityIcon name="trending-up" size={14} color={sortMode === "popular" ? COLORS.navy : COLORS.white} />
                <Text style={[styles.filterChipText, sortMode === "popular" && styles.filterChipTextActive]}>Popular</Text>
              </Pressable>
              <Pressable style={[styles.filterChip, sortMode === "rating" && styles.filterChipActive]} onPress={() => setSortMode("rating")}>
                <MaterialCommunityIcon name="star-circle-outline" size={14} color={sortMode === "rating" ? COLORS.navy : COLORS.white} />
                <Text style={[styles.filterChipText, sortMode === "rating" && styles.filterChipTextActive]}>Top Rated</Text>
              </Pressable>
              <Pressable style={[styles.filterChip, sortMode === "price_low" && styles.filterChipActive]} onPress={() => setSortMode("price_low")}>
                <MaterialCommunityIcon name="cash-minus" size={14} color={sortMode === "price_low" ? COLORS.navy : COLORS.white} />
                <Text style={[styles.filterChipText, sortMode === "price_low" && styles.filterChipTextActive]}>Price Low</Text>
              </Pressable>
              <Pressable style={[styles.filterChip, sortMode === "price_high" && styles.filterChipActive]} onPress={() => setSortMode("price_high")}>
                <MaterialCommunityIcon name="cash-plus" size={14} color={sortMode === "price_high" ? COLORS.navy : COLORS.white} />
                <Text style={[styles.filterChipText, sortMode === "price_high" && styles.filterChipTextActive]}>Price High</Text>
              </Pressable>
              <Pressable style={[styles.filterChip, quickOnly && styles.filterChipActive]} onPress={() => setQuickOnly((v) => !v)}>
                <MaterialCommunityIcon name="lightning-bolt-outline" size={14} color={quickOnly ? COLORS.navy : COLORS.white} />
                <Text style={[styles.filterChipText, quickOnly && styles.filterChipTextActive]}>Quick Picks</Text>
              </Pressable>
            </ScrollView>

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
  root: { flex: 1, backgroundColor: palette.bg },
  backButton: {
    position: "absolute",
    top: 16,
    left: 12,
    zIndex: 50,
    elevation: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: "rgba(2, 27, 74, 0.58)",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerEdgeToEdge: {
    marginHorizontal: 0,
    marginTop: 0,
  },
  bannerAnimWrap: {
    overflow: "hidden",
  },
  stickyFiltersWrap: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: "transparent",
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: "rgba(2, 27, 74, 0.46)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
    minHeight: 38,
  },
  filterChipActive: {
    backgroundColor: COLORS.goldSoft,
    borderColor: COLORS.gold,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.22,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  filterChipText: { color: COLORS.white, fontSize: 12, fontWeight: "800" },
  filterChipTextActive: { color: COLORS.navy },
  sectionHead: { paddingHorizontal: 16, marginTop: 10, marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: COLORS.white },
  sectionSub: { color: palette.muted, marginTop: 2, fontSize: 12 },
  listContent: { paddingHorizontal: 0, paddingBottom: 14, backgroundColor: palette.bg },
  row: { justifyContent: "space-between" },
  footerSpacer: { height: 12 },
  centerWrap: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 22 },
  emptyText: { color: COLORS.gray, fontSize: 15, fontWeight: "600", textAlign: "center" },
  errorText: { color: COLORS.red700, fontSize: 14, textAlign: "center", marginBottom: 12 },
  retryButton: { backgroundColor: palette.accentBlue, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 11 },
  retryButtonText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8, justifyContent: "space-between" },
  skeletonCard: { width: "31.5%", marginBottom: 10, borderRadius: 16, backgroundColor: COLORS.offWhite, padding: 10 },
  skeletonImage: { height: 132, borderRadius: 12, backgroundColor: COLORS.neutral200 },
  skeletonLineLg: { marginTop: 10, height: 14, borderRadius: 7, backgroundColor: COLORS.neutral200 },
  skeletonLineSm: { marginTop: 8, width: "62%", height: 12, borderRadius: 6, backgroundColor: COLORS.neutral200 },
  loaderBottom: { marginTop: 8 },
  bannerSkeleton: { flex: 1, borderRadius: 0, backgroundColor: COLORS.neutral200, marginHorizontal: 0, marginTop: 0, marginBottom: 4 },
  bannerErrorText: { marginHorizontal: 16, marginTop: 4, marginBottom: 6, color: COLORS.gray, fontSize: 12 },
});







