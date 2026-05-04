// @refresh reset
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Image, ImageBackground, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Button, Searchbar, Text } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { getPopularCleaningServices, getPopularCookServices } from "../../api/popularServicesApi";
import { fetchCustomerServicesCatalog } from "../../api/serviceApi";
import { PopularServicesShimmer } from "../../components/home/PopularServicesShimmer";
import { SectionHeader } from "../../components/home/SectionHeader";
import { ServiceCard as PopularServiceCard } from "../../components/home/ServiceCard";
import { ServiceCard as LegacyServiceCard } from "../../components/cards/ServiceCard";
import { EmptyStateCard } from "../../components/common/EmptyStateCard";
import { QuickBookingSheet } from "../../components/common/QuickBookingSheet";
import { SkeletonList } from "../../components/common/SkeletonList";
import { StaggeredFadeIn } from "../../components/common/StaggeredFadeIn";
import { palette } from "../../constants/theme";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { addToCartThunk, fetchCustomerAddressesThunk, fetchCustomerCartThunk } from "../../redux/cartSlice";
import { fetchHomeData } from "../../redux/homeSlice";
import { DynamicHomeSections } from "../../modules/home/DynamicHomeSections";
import { useHomeSections } from "../../modules/home/useHomeSections";

const BANNER_PLACEHOLDER = require("../../assets/images/splash-lexho.jpeg");

const colors = {
  background: "#EEF6FF",
  card: palette.card,
  primaryText: palette.text,
  secondaryText: palette.muted,
  accentCook: palette.accentCook,
  accentCleaning: palette.accentCleaning,
};

const CATEGORY_GRADIENTS = [
  ["#2563EB", "#0EA5E9"],
  ["#059669", "#10B981"],
  ["#EA580C", "#FB923C"],
  ["#7C3AED", "#A855F7"],
  ["#0891B2", "#22D3EE"],
  ["#BE123C", "#FB7185"],
];
const RECENT_SEARCHES_KEY = "@lexho/customer/recent-service-searches";
const MAX_RECENT_SEARCHES = 8;

function renderHighlightedText(value: string, query: string, stylesRef: any) {
  const text = String(value ?? "");
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return <Text style={stylesRef.searchResultName}>{text}</Text>;
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = cleanQuery.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index < 0) {
    return <Text style={stylesRef.searchResultName}>{text}</Text>;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + cleanQuery.length);
  const after = text.slice(index + cleanQuery.length);

  return (
    <Text style={stylesRef.searchResultName}>
      {before}
      <Text style={stylesRef.searchResultNameHighlight}>{match}</Text>
      {after}
    </Text>
  );
}

export function HomeScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const { loading, error, banners, categories, popular, recommended, quick } = useAppSelector((s) => s.home);
  const authToken = useAppSelector((s) => s.auth.token);
  const cartItems = useAppSelector((s) => s.cart.items);
  const addresses = useAppSelector((s) => s.cart.addresses);
  const selectedAddressId = useAppSelector((s) => s.cart.selectedAddressId);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedServices, setSearchedServices] = useState<any[]>([]);
  const [catalogCache, setCatalogCache] = useState<any[]>([]);
  const [catalogCacheLoaded, setCatalogCacheLoaded] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [popularCleaningLoading, setPopularCleaningLoading] = useState(false);
  const [popularCookLoading, setPopularCookLoading] = useState(false);
  const [popularCleaningError, setPopularCleaningError] = useState<string | null>(null);
  const [popularCookError, setPopularCookError] = useState<string | null>(null);
  const [popularCleaningServices, setPopularCleaningServices] = useState<any[]>([]);
  const [popularCookServices, setPopularCookServices] = useState<any[]>([]);
  const [brokenBannerIds, setBrokenBannerIds] = useState<Record<string, boolean>>({});
  const [brokenCategoryIds, setBrokenCategoryIds] = useState<Record<string, boolean>>({});
  const bannerListRef = useRef<FlatList<any>>(null);
  const bannerIndexRef = useRef(0);
  const { width } = useWindowDimensions();
  const bannerWidth = width - 32;
  const bannerHeight = width * 0.45;
  const categoryItemSize = width / 4.5;
  const serviceCardWidth = Math.min(Math.max(width * 0.4, 140), 160);
  const cartItemsCount = useMemo(() => cartItems.length, [cartItems]);
  const isSearchMode = searchQuery.trim().length >= 2;
  const toSafeUri = useCallback((value: unknown) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }, []);

  useEffect(() => {
    dispatch(fetchHomeData());
  }, [dispatch]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.filter((row) => typeof row === "string" && row.trim().length > 0).slice(0, MAX_RECENT_SEARCHES));
        }
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!authToken) return;
      void dispatch(fetchCustomerCartThunk());
      void dispatch(fetchCustomerAddressesThunk());
    }, [authToken, dispatch]),
  );

  const { sections } = useHomeSections();

  const quickActions = useMemo(() => {
    const source = sections.find((section) => section.title.trim().toUpperCase() === "QUICK_ACTIONS");
    if (!source) return [];
    return source.items.map((item) => {
      const routeName = String(item.value ?? "").trim();
      return {
        label: item.title,
        onPress: () => {
          setSheetVisible(false);
          if (routeName) {
            navigation.navigate(routeName);
            return;
          }
          navigation.navigate("CartCrud");
        },
      };
    });
  }, [navigation, sections]);

  const bannerItems = useMemo(
    () => (Array.isArray(banners) ? banners : []).map((item: any, index: number) => ({
      id: String(item?.bannerId ?? item?.id ?? index),
      title: item?.title ?? "Home services in under 30 mins",
      subtitle: item?.subtitle ?? "Verified partners, fixed pricing, fast support",
      imageUrl: toSafeUri(item?.bannerImageUrl ?? item?.imageUrl),
      redirectType: item?.redirectType,
      redirectValue: item?.redirectValue,
      ctaLabel: item?.ctaLabel ?? item?.ctaText ?? "Explore now",
    })),
    [banners, toSafeUri],
  );

  const categoryItems = useMemo(
    () => (Array.isArray(categories) ? categories : [])
      .map((item: any, index: number) => ({
        id: String(item?.categoryId ?? item?.id ?? index),
        name: String(item?.categoryName ?? item?.name ?? "").trim(),
        iconUrl: toSafeUri(item?.categoryIcon ?? item?.iconUrl ?? item?.icon),
        imageUrl: toSafeUri(item?.categoryImage ?? item?.iconUrl ?? item?.imageUrl),
        gradient: CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length],
      }))
      .filter((item) => item.name.length > 0 && item.name.toLowerCase() !== "category"),
    [categories, toSafeUri],
  );
  const cleaningCategory = useMemo(
    () =>
      categoryItems.find((item) => item.name.toLowerCase().includes("clean")) ?? categoryItems[0] ?? null,
    [categoryItems],
  );
  const cookAtHomeCategory = useMemo(
    () =>
      categoryItems.find((item) => {
        const name = item.name.toLowerCase();
        return name.includes("cook at home") || name.includes("cook");
      }) ?? null,
    [categoryItems],
  );

  const mapPopularServices = useCallback(
    (rows: any[]) =>
      rows
        .map((item: any) => {
        const rawId = item?.id ?? item?.serviceId;
        const parsedId = Number(rawId);
        const id = Number.isFinite(parsedId) && parsedId > 0 ? String(parsedId) : "";
        const price = Number(item?.discountedPrice ?? item?.price ?? 0);
        const safePrice = Number.isFinite(price) ? price : 0;
        const rating = Number(item?.rating ?? 0);
        const safeRating = Number.isFinite(rating) ? rating : 0;
        return {
          id,
          name: String(item?.serviceName ?? item?.name ?? "Service"),
          imageUrl: toSafeUri(item?.imageUrl ?? item?.thumbnailUrl) ?? undefined,
          ratingLabel: `Rating ${safeRating.toFixed(1)}`,
          priceLabel: `INR ${safePrice.toFixed(2)}`,
        };
      })
        .filter((item) => item.id.length > 0),
    [toSafeUri],
  );
  const mappedPopularCleaningServices = useMemo(
    () => {
      const rows = mapPopularServices(popularCleaningServices);
      const query = searchQuery.trim().toLowerCase();
      if (!query) return rows;
      return rows.filter((item) => item.name.toLowerCase().includes(query));
    },
    [mapPopularServices, popularCleaningServices, searchQuery],
  );
  const mappedPopularCookServices = useMemo(
    () => {
      const rows = mapPopularServices(popularCookServices);
      const query = searchQuery.trim().toLowerCase();
      if (!query) return rows;
      return rows.filter((item) => item.name.toLowerCase().includes(query));
    },
    [mapPopularServices, popularCookServices, searchQuery],
  );

  const saveRecentSearch = useCallback(async (query: string) => {
    const clean = query.trim();
    if (clean.length < 2) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((row) => row.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT_SEARCHES);
      void AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearRecentSearches = useCallback(async () => {
    setRecentSearches([]);
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {}
  }, []);

  const fuzzyScore = useCallback((name: string, query: string) => {
    const n = name.toLowerCase().trim();
    const q = query.toLowerCase().trim();
    if (!q) return 0;
    if (n.includes(q)) return 100 - (n.indexOf(q) || 0);

    let qi = 0;
    for (let ni = 0; ni < n.length && qi < q.length; ni += 1) {
      if (n[ni] === q[qi]) qi += 1;
    }
    const subsequenceMatch = qi / q.length;
    if (subsequenceMatch >= 0.8) return 60 * subsequenceMatch;

    const qWords = q.split(/\s+/).filter(Boolean);
    const nWords = n.split(/\s+/).filter(Boolean);
    const overlap = qWords.filter((w) => nWords.some((nw) => nw.startsWith(w) || nw.includes(w))).length;
    if (overlap > 0) return 40 + overlap * 8;

    return 0;
  }, []);

  const fuzzyLocalResults = useMemo(() => {
    const query = searchQuery.trim();
    if (query.length < 2) return [];
    const source = [
      ...(Array.isArray(popularCleaningServices) ? popularCleaningServices : []),
      ...(Array.isArray(popularCookServices) ? popularCookServices : []),
      ...(Array.isArray(popular) ? popular : []),
      ...(Array.isArray(recommended) ? recommended : []),
      ...(Array.isArray(quick) ? quick : []),
    ];
    const dedup = new Map<string, any>();
    source.forEach((item: any, index: number) => {
      const id = String(item?.id ?? item?.serviceId ?? `row-${index}`);
      const name = String(item?.name ?? item?.serviceName ?? "").trim();
      if (!name) return;
      if (!dedup.has(id)) dedup.set(id, item);
    });
    return Array.from(dedup.values())
      .map((item: any) => ({
        item,
        score: fuzzyScore(String(item?.name ?? item?.serviceName ?? ""), query),
      }))
      .filter((row) => row.score >= 28)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((row) => row.item);
  }, [fuzzyScore, popular, popularCleaningServices, popularCookServices, quick, recommended, searchQuery]);

  const containsCatalogResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2) return [];
    return catalogCache
      .filter((item: any) => {
        const name = String(item?.name ?? item?.serviceName ?? "").toLowerCase();
        return name.includes(query);
      })
      .slice(0, 20);
  }, [catalogCache, searchQuery]);

  const catalogSearchIndex = useMemo(
    () =>
      catalogCache.map((item: any, index: number) => {
        const id = String(item?.id ?? item?.serviceId ?? `row-${index}`);
        const name = String(item?.name ?? item?.serviceName ?? "");
        const normalized = name.toLowerCase().trim();
        const tokens = normalized.split(/\s+/).filter(Boolean);
        return { id, item, normalized, tokens };
      }),
    [catalogCache],
  );

  const indexedCatalogResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length < 2 || catalogSearchIndex.length === 0) return [];
    const queryTokens = query.split(/\s+/).filter(Boolean);
    const rows = catalogSearchIndex
      .map((row) => {
        let score = 0;
        if (row.normalized.includes(query)) score += 100 - row.normalized.indexOf(query);
        queryTokens.forEach((token) => {
          if (row.tokens.some((t) => t.startsWith(token))) score += 20;
          else if (row.tokens.some((t) => t.includes(token))) score += 10;
        });
        return { row, score };
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map((entry) => entry.row.item);
    return rows;
  }, [catalogSearchIndex, searchQuery]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2 || catalogCacheLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchCustomerServicesCatalog({ page: 0, size: 300 });
        if (!cancelled) {
          setCatalogCache(rows);
          setCatalogCacheLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setCatalogCacheLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogCacheLoaded, searchQuery]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchLoading(false);
      setSearchError(null);
      setSearchedServices([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const rows = await fetchCustomerServicesCatalog({ page: 0, size: 20, search: query });
        if (!cancelled) {
          setSearchedServices(rows);
          if (rows.length > 0) {
            void saveRecentSearch(query);
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          setSearchError(String(error?.message ?? "Unable to search services"));
          setSearchedServices([]);
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [saveRecentSearch, searchQuery]);

  const allServicesToRender = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (query.length >= 2) {
      const merged = [...searchedServices, ...indexedCatalogResults, ...containsCatalogResults, ...fuzzyLocalResults];
      const dedup = new Map<string, any>();
      merged.forEach((item: any, index: number) => {
        const id = String(item?.id ?? item?.serviceId ?? `row-${index}`);
        if (!dedup.has(id)) dedup.set(id, item);
      });
      return Array.from(dedup.values()).slice(0, 12);
    }

    const fromPopular = Array.isArray(popular) ? popular : [];
    const filterRows = (rows: any[]) => {
      if (!query) return rows;
      return rows.filter((row) =>
        String(row?.name ?? row?.serviceName ?? "").toLowerCase().includes(query),
      );
    };
    if (fromPopular.length > 0) return filterRows(fromPopular).slice(0, 8);
    const fromRecommended = Array.isArray(recommended) ? recommended : [];
    if (fromRecommended.length > 0) return filterRows(fromRecommended).slice(0, 8);
    return filterRows(Array.isArray(quick) ? quick : []).slice(0, 8);
  }, [containsCatalogResults, fuzzyLocalResults, indexedCatalogResults, popular, quick, recommended, searchQuery, searchedServices]);

  const locationLabel = useMemo(() => {
    if (addresses.length === 0) return "Select your address";
    const selected =
      addresses.find((row) => row.id === selectedAddressId) ??
      addresses.find((row) => row.default) ??
      addresses[0];
    const parts = [selected?.city, selected?.pincode].filter((v) => typeof v === "string" && v.trim().length > 0);
    if (parts.length > 0) return parts.join(", ");
    if (selected?.fullAddress && selected.fullAddress.trim().length > 0) return selected.fullAddress;
    return "Address selected";
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log("[home:bannerImage:beforeRender]", bannerItems.map((item) => ({ id: item.id, imageUrl: item.imageUrl })));
      // eslint-disable-next-line no-console
      console.log("[home:categoryImage:beforeRender]", categoryItems.map((item) => ({ id: item.id, imageUrl: item.imageUrl || item.iconUrl })));
    }
  }, [bannerItems, categoryItems]);

  useEffect(() => {
    bannerItems.forEach((item) => {
      if (item.imageUrl) {
        Image.prefetch(item.imageUrl).catch(() => {});
      }
    });
    categoryItems.forEach((item) => {
      const url = item.iconUrl || item.imageUrl;
      if (url) {
        Image.prefetch(url).catch(() => {});
      }
    });
  }, [bannerItems, categoryItems]);

  const fetchPopularCleaning = useCallback(async () => {
    setPopularCleaningLoading(true);
    setPopularCleaningError(null);
    try {
      const rows = await getPopularCleaningServices();
      setPopularCleaningServices(rows);
    } catch (error: any) {
      setPopularCleaningServices([]);
      setPopularCleaningError(String(error?.message ?? "Unable to fetch popular cleaning services"));
    } finally {
      setPopularCleaningLoading(false);
    }
  }, []);

  const fetchPopularCook = useCallback(async () => {
    setPopularCookLoading(true);
    setPopularCookError(null);
    try {
      const rows = await getPopularCookServices();
      setPopularCookServices(rows);
    } catch (error: any) {
      setPopularCookServices([]);
      setPopularCookError(String(error?.message ?? "Unable to fetch popular cook services"));
    } finally {
      setPopularCookLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (!mounted) return;
      void Promise.all([fetchPopularCleaning(), fetchPopularCook()]);
    }, 250);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [fetchPopularCleaning, fetchPopularCook]);

  useEffect(() => {
    if (bannerItems.length <= 1) return;
    const timer = setInterval(() => {
      if (bannerItems.length === 0) return;
      bannerIndexRef.current = (bannerIndexRef.current + 1) % bannerItems.length;
      bannerListRef.current?.scrollToOffset({ offset: bannerWidth * bannerIndexRef.current, animated: true });
    }, 3500);
    return () => clearInterval(timer);
  }, [bannerItems.length, bannerWidth]);

  useEffect(() => {
    if (bannerItems.length === 0) {
      bannerIndexRef.current = 0;
      return;
    }
    if (bannerIndexRef.current >= bannerItems.length) {
      bannerIndexRef.current = 0;
    }
  }, [bannerItems.length]);

  const handleCategoryPress = useCallback((category: { id: string; name: string }) => {
    navigation.navigate("ServiceList", {
      categoryId: category.id,
      categoryName: category.name,
    });
  }, [navigation]);

  const handleBannerPress = useCallback((item: any) => {
    const redirectType = String(item?.redirectType ?? "").trim().toLowerCase();
    const redirectValueRaw = String(item?.redirectValue ?? "").trim();
    const redirectValueUpper = redirectValueRaw.toUpperCase();

    if (redirectType === "coupon" || redirectType === "offer") return navigation.navigate("Coupon");
    if (redirectType === "cart") return navigation.navigate("CartCrud");
    if (redirectType === "payment") return navigation.navigate("PaymentStatus");
    if (redirectType === "tracking") return navigation.navigate("LiveTracking");

    const routeMap: Record<string, string> = {
      CARTCRUD: "CartCrud",
      CART: "CartCrud",
      COUPON: "Coupon",
      ADDRESS: "Address",
      PAYMENTSTATUS: "PaymentStatus",
      PAYMENT: "PaymentStatus",
      LIVETRACKING: "LiveTracking",
      TRACKING: "LiveTracking",
      REFERRAL: "Referral",
      REVIEWS: "Reviews",
      FAVORITES: "Favorites",
    };

    const targetRoute = routeMap[redirectValueUpper];
    if (targetRoute) {
      return navigation.navigate(targetRoute as any);
    }

    // Keep hero CTA always useful even when backend banner mapping is incomplete.
    return navigation.navigate("CartCrud");
  }, [navigation]);

  const handlePopularServicePress = useCallback(
    (serviceId: string) => {
      const parsedId = Number(serviceId);
      if (!Number.isFinite(parsedId) || parsedId <= 0) {
        Alert.alert("Invalid service", "Service id is invalid. Please try another service.");
        return;
      }
      navigation.navigate("ServiceDetail", { serviceId: String(parsedId) });
    },
    [navigation],
  );

  const handlePopularServiceAdd = useCallback(
    async (serviceId: string) => {
      const parsedId = Number(serviceId);
      if (!Number.isFinite(parsedId) || parsedId <= 0) {
        Alert.alert("Invalid service", "Service id is invalid. Please try another service.");
        return;
      }
      if (!authToken) {
        Alert.alert("Login Required", "Please login again. Authorization token is missing.");
        return;
      }
      try {
        await dispatch(addToCartThunk({ serviceId: parsedId, quantity: 1 })).unwrap();
        navigation.navigate("CartCrud");
      } catch (error: any) {
        Alert.alert("Add to cart failed", String(error?.message ?? "Please try again."));
      }
    },
    [authToken, dispatch, navigation],
  );

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <StaggeredFadeIn delay={30}>
        <View style={styles.topHeader}>
          <View>
            <Text style={styles.locLabel}>Current Location</Text>
            <Text style={styles.locValue} numberOfLines={1}>{locationLabel}</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate("Notifications")} activeOpacity={0.85}>
              <MaterialCommunityIcon name="bell-outline" color={colors.primaryText} size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate("CartCrud")} activeOpacity={0.85}>
              <MaterialCommunityIcon name="cart-outline" color={colors.primaryText} size={20} />
              {cartItemsCount > 0 ? (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartItemsCount > 99 ? "99+" : String(cartItemsCount)}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>
        </View>
      </StaggeredFadeIn>

      <StaggeredFadeIn delay={80}>
        <Searchbar
          placeholder="Search services..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearIcon="close"
          onClearIconPress={() => setSearchQuery("")}
          style={styles.search}
          inputStyle={styles.searchInput}
          placeholderTextColor={colors.secondaryText}
        />
        {recentSearches.length > 0 ? (
          <View style={styles.searchHistoryWrap}>
            <View style={styles.searchHistoryHead}>
              <Text style={styles.searchHistoryTitle}>Recent searches</Text>
              <TouchableOpacity onPress={() => void clearRecentSearches()} activeOpacity={0.85}>
                <Text style={styles.searchHistoryClear}>Clear all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.searchChipsWrap}>
              {recentSearches.map((term) => (
                <TouchableOpacity
                  key={term}
                  style={styles.searchChip}
                  activeOpacity={0.9}
                  onPress={() => {
                    setSearchQuery(term);
                  }}
                >
                  <MaterialCommunityIcon name="history" size={13} color="#0369A1" />
                  <Text style={styles.searchChipText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
      </StaggeredFadeIn>

      <StaggeredFadeIn delay={120}>
        {loading ? <SkeletonList rows={1} /> : null}
        {!loading && bannerItems.length === 0 ? <EmptyStateCard title="No active banners" subtitle="Offers from admin panel will show here." /> : null}
        {!loading && bannerItems.length > 0 ? (
          <FlatList
            ref={bannerListRef}
            horizontal
            pagingEnabled
            data={bannerItems}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: bannerWidth,
              offset: bannerWidth * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              const safeIndex = Math.max(0, Math.min(info.index, Math.max(0, bannerItems.length - 1)));
              bannerIndexRef.current = safeIndex;
              requestAnimationFrame(() => {
                bannerListRef.current?.scrollToOffset({ offset: bannerWidth * safeIndex, animated: true });
              });
            }}
            renderItem={({ item }) => {
              const imageBroken = !!brokenBannerIds[item.id];
              return (
                <TouchableOpacity activeOpacity={0.9} onPress={() => handleBannerPress(item)} style={[styles.bannerItem, { width: bannerWidth, height: bannerHeight }]}>
                  <ImageBackground
                    source={item.imageUrl && !imageBroken ? { uri: item.imageUrl } : BANNER_PLACEHOLDER}
                    resizeMode="cover"
                    style={styles.hero}
                    imageStyle={styles.heroImage}
                    onError={() => {
                      if (__DEV__) {
                        // eslint-disable-next-line no-console
                        console.log("[home:bannerImage:onError]", { id: item.id, imageUrl: item.imageUrl });
                      }
                      setBrokenBannerIds((prev) => ({ ...prev, [item.id]: true }));
                    }}
                  >
                    <View style={styles.heroOverlay}>
                      <Text style={styles.heroTag}>LEXHO PREMIUM CARE</Text>
                      <Text style={styles.heroTitle}>{item.title}</Text>
                      <Text style={styles.heroSub}>{item.subtitle}</Text>
                      <TouchableOpacity activeOpacity={0.9} onPress={() => handleBannerPress(item)} style={styles.heroCtaWrap}>
                        <LinearGradient colors={["#22D3EE", "#0EA5E9", "#0284C7"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCta}>
                          <Text style={styles.heroCtaText}>{item.ctaLabel}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      <View style={styles.heroDots}>
                        {bannerItems.slice(0, 5).map((bannerDot, dotIndex) => (
                          <View
                            key={bannerDot.id}
                            style={[styles.heroDot, dotIndex === bannerIndexRef.current && styles.heroDotActive]}
                          />
                        ))}
                      </View>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              );
            }}
          />
        ) : null}
      </StaggeredFadeIn>

      <StaggeredFadeIn delay={160}>
        <Text style={styles.sectionTitle}>Service Categories</Text>
        <Text style={styles.sectionSubtitle}>Explore services by category</Text>
      </StaggeredFadeIn>
      <StaggeredFadeIn delay={180}>
        {loading ? <SkeletonList rows={2} /> : null}
        {!loading && categoryItems.length === 0 ? <EmptyStateCard title="No active categories" subtitle="Categories from admin panel will show here." /> : null}
        {!loading && categoryItems.length > 0 ? (
          <FlatList
            horizontal
            data={categoryItems}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
            renderItem={({ item, index }) => {
              const imageBroken = !!brokenCategoryIds[item.id];
              const imageSource = item.imageUrl || item.iconUrl;
              return (
                <TouchableOpacity
                  style={[styles.categoryItem, index === categoryItems.length - 1 && styles.lastItem]}
                  onPress={() => handleCategoryPress({ id: item.id, name: item.name })}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={item.gradient} style={[styles.categoryIconWrap, { width: categoryItemSize, height: categoryItemSize, borderRadius: categoryItemSize / 2 }]}>
                    {imageSource && !imageBroken ? (
                      <Image
                        source={{ uri: imageSource }}
                        style={[styles.categoryImage, { width: categoryItemSize, height: categoryItemSize, borderRadius: categoryItemSize / 2 }]}
                        resizeMode="cover"
                        onError={() => {
                          if (__DEV__) {
                            // eslint-disable-next-line no-console
                            console.log("[home:categoryImage:onError]", { id: item.id, imageSource });
                          }
                          setBrokenCategoryIds((prev) => ({ ...prev, [item.id]: true }));
                        }}
                      />
                    ) : (
                      <View style={[styles.categoryImageFallback, { width: categoryItemSize, height: categoryItemSize, borderRadius: categoryItemSize / 2 }]} />
                    )}
                  </LinearGradient>
                  <Text style={styles.categoryLabel} numberOfLines={2}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        ) : null}
      </StaggeredFadeIn>

      <StaggeredFadeIn delay={220}>
        <SectionHeader
          title={
            sections.find((section) => section.title.trim().toUpperCase() === "POPULAR_CLEANING")?.subtitle ||
            "Popular Cleaning Services"
          }
          subtitle={
            sections.find((section) => section.title.trim().toUpperCase() === "POPULAR_CLEANING")?.title ||
            "Most booked services near your location"
          }
          rightSlot={(
            <Button
              compact
              mode="text"
              onPress={() =>
                navigation.navigate("ServiceList", {
                  categoryId: cleaningCategory?.id,
                  categoryName: cleaningCategory?.name ?? "Cleaning",
                })
              }
              disabled={!cleaningCategory?.id}
            >
              View all
            </Button>
          )}
        />
      </StaggeredFadeIn>
      <View style={styles.sectionCard}>
        {popularCleaningLoading ? <PopularServicesShimmer cardWidth={serviceCardWidth} /> : null}
        {!popularCleaningLoading && popularCleaningError ? (
          <View>
            <EmptyStateCard title="Unable to load popular cleaning services" subtitle={popularCleaningError} />
            <View style={styles.retryWrap}>
              <Button mode="contained-tonal" onPress={() => void fetchPopularCleaning()}>
                Retry
              </Button>
            </View>
          </View>
        ) : null}
        {!popularCleaningLoading && !popularCleaningError && mappedPopularCleaningServices.length === 0 ? (
          <EmptyStateCard title="No popular services available" subtitle="Please check back in a while." />
        ) : null}
        {!popularCleaningLoading && !popularCleaningError && mappedPopularCleaningServices.length > 0 ? (
          <FlatList
            horizontal
            data={mappedPopularCleaningServices}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.listRow}
            renderItem={({ item, index }) => (
              <View style={index === mappedPopularCleaningServices.length - 1 ? styles.lastItem : undefined}>
                <PopularServiceCard
                  item={item}
                  width={serviceCardWidth}
                  onPress={handlePopularServicePress}
                  onAdd={handlePopularServiceAdd}
                  accentColor={colors.accentCleaning}
                  badgeLabel="Cleaning Pro"
                />
              </View>
            )}
          />
        ) : null}
      </View>

      {
        <>
          <StaggeredFadeIn delay={240}>
            <SectionHeader
              title={
                sections.find((section) => section.title.trim().toUpperCase() === "POPULAR_COOK")?.subtitle ||
                "Popular Cook Services"
              }
              subtitle={
                sections.find((section) => section.title.trim().toUpperCase() === "POPULAR_COOK")?.title ||
                "Trending cook services near your location"
              }
              rightSlot={(
                <Button
                  compact
                  mode="text"
                  onPress={() =>
                    cookAtHomeCategory?.id
                      ? navigation.navigate("ServiceList", {
                        categoryId: cookAtHomeCategory.id,
                        categoryName: cookAtHomeCategory.name,
                      })
                      : undefined
                  }
                  disabled={!cookAtHomeCategory?.id}
                >
                  View all
                </Button>
              )}
            />
          </StaggeredFadeIn>
          <View style={styles.sectionCard}>
            {popularCookLoading ? <PopularServicesShimmer cardWidth={serviceCardWidth} /> : null}
            {!popularCookLoading && popularCookError ? (
              <View>
                <EmptyStateCard title="Unable to load popular cook services" subtitle={popularCookError} />
                <View style={styles.retryWrap}>
                  <Button mode="contained-tonal" onPress={() => void fetchPopularCook()}>
                    Retry
                  </Button>
                </View>
              </View>
            ) : null}
            {!popularCookLoading && !popularCookError && mappedPopularCookServices.length === 0 ? (
              <EmptyStateCard title="No popular cook services" subtitle="Please check back in a while." />
            ) : null}
            {!popularCookLoading && !popularCookError && mappedPopularCookServices.length > 0 ? (
              <FlatList
                horizontal
                data={mappedPopularCookServices}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listRow}
                renderItem={({ item, index }) => (
                  <View style={index === mappedPopularCookServices.length - 1 ? styles.lastItem : undefined}>
                    <PopularServiceCard
                      item={item}
                      width={serviceCardWidth}
                      onPress={handlePopularServicePress}
                      onAdd={handlePopularServiceAdd}
                      accentColor={colors.accentCook}
                      badgeLabel="Cook Choice"
                    />
                  </View>
                )}
              />
            ) : null}
          </View>
        </>
      }

      <StaggeredFadeIn delay={260}>
        <DynamicHomeSections navigation={navigation} />
      </StaggeredFadeIn>
      {(loading || searchLoading || isSearchMode || allServicesToRender.length > 0) ? (
        <View style={styles.sectionCard}>
          {loading || searchLoading ? <SkeletonList rows={2} /> : null}
          {!loading && !searchLoading && searchError && allServicesToRender.length === 0 ? <EmptyStateCard title="Search failed" subtitle={searchError} /> : null}
          {!loading && !searchLoading && !searchError && isSearchMode && allServicesToRender.length === 0 ? (
            <EmptyStateCard title="No matching services" subtitle="Try another keyword." />
          ) : null}
          {!loading && isSearchMode && allServicesToRender.length > 0 ? (
            <View style={styles.searchResultsWrap}>
              {allServicesToRender.map((item: any, i: number) => {
                const parsedServiceId = Number(item?.id ?? item?.serviceId);
                const serviceId = Number.isFinite(parsedServiceId) && parsedServiceId > 0 ? String(parsedServiceId) : "";
                const serviceName = String(item?.name ?? item?.serviceName ?? "Service");
                const serviceDesc = String(item?.description ?? "Trusted professionals near your location");
                const servicePrice = Number(item?.price ?? item?.discountedPrice ?? 0);
                const imageUrl = item?.imageUrl ?? item?.thumbnailUrl;

                return (
                  <TouchableOpacity
                    key={`${serviceId}-${i}`}
                    style={styles.searchResultCard}
                    activeOpacity={0.9}
                    onPress={() => {
                      if (serviceId) {
                        handlePopularServicePress(serviceId);
                      }
                    }}
                  >
                    {imageUrl ? (
                      <Image source={{ uri: String(imageUrl) }} style={styles.searchResultImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.searchResultImageFallback}>
                        <MaterialCommunityIcon name="briefcase-outline" size={18} color={palette.muted} />
                      </View>
                    )}
                    <View style={styles.searchResultBody}>
                      {renderHighlightedText(serviceName, searchQuery, styles)}
                      <Text style={styles.searchResultDesc} numberOfLines={1}>{serviceDesc}</Text>
                      {servicePrice > 0 ? <Text style={styles.searchResultPrice}>{`INR ${servicePrice.toFixed(2)}`}</Text> : null}
                    </View>
                    <TouchableOpacity
                      style={styles.searchResultBookBtn}
                      onPress={() => {
                        if (serviceId) {
                          void handlePopularServiceAdd(serviceId);
                        }
                      }}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.searchResultBookText}>Book</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          {!loading && !isSearchMode && allServicesToRender.length > 0 ? (
            <FlatList
              horizontal
              data={allServicesToRender}
              keyExtractor={(item, i) => String(item?.id ?? i)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listRow}
              renderItem={({ item, index }) => (
                <View style={index === allServicesToRender.length - 1 ? styles.lastItem : undefined}>
                  <LegacyServiceCard
                    title={item?.name ?? item?.serviceName ?? "Service"}
                    subtitle={item?.description ?? "Trusted professionals near your location"}
                    price={item?.price ? `INR ${item.price}` : undefined}
                    badge="All Services"
                  />
                </View>
              )}
            />
          ) : null}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && categories.length === 0 && popular.length === 0 ? <EmptyStateCard title="No services yet" subtitle="Try again in a moment or change location." /> : null}
      <QuickBookingSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} actions={quickActions} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 14, gap: 12, paddingBottom: 26 },
  topHeader: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  headerActions: { flexDirection: "row", gap: 8 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: -6,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 3,
    backgroundColor: "#DC2626",
    borderWidth: 1,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
  },
  search: {
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: palette.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  searchInput: { color: colors.primaryText, fontSize: 15 },
  searchHistoryWrap: { paddingTop: 8 },
  searchHistoryHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, marginBottom: 6 },
  searchHistoryTitle: { color: colors.secondaryText, fontSize: 12, fontWeight: "700" },
  searchHistoryClear: { color: "#0284C7", fontSize: 12, fontWeight: "800" },
  searchChipsWrap: { paddingTop: 8, paddingHorizontal: 2, gap: 8 },
  searchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#BAE6FD",
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchChipText: { color: "#075985", fontSize: 12, fontWeight: "700" },
  bannerItem: {
    marginHorizontal: 4,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  hero: { borderRadius: 18, overflow: "hidden", width: "100%", height: "100%" },
  heroImage: { borderRadius: 18 },
  heroOverlay: { padding: 16, gap: 8, backgroundColor: "rgba(17, 24, 39, 0.30)", height: "100%", justifyContent: "flex-end" },
  heroTag: { color: "#E0F2FE", fontWeight: "700", fontSize: 12, letterSpacing: 1 },
  heroTitle: { color: "#FFFFFF", fontWeight: "800", fontSize: 20, lineHeight: 26 },
  heroSub: { color: "#F3F4F6", fontSize: 13 },
  heroCtaWrap: { marginTop: 10, alignSelf: "flex-start" },
  heroCta: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  heroCtaText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  heroDots: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  heroDotActive: {
    width: 16,
    backgroundColor: "#FFFFFF",
  },
  locLabel: { color: colors.secondaryText, fontSize: 12, marginTop: 0 },
  locValue: { color: colors.primaryText, fontSize: 18, fontWeight: "800", marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginTop: 20, marginHorizontal: 16, color: colors.primaryText },
  sectionSubtitle: { fontSize: 12, color: colors.secondaryText, marginHorizontal: 16, marginTop: 4 },
  categoriesRow: { paddingHorizontal: 16, marginTop: 12 },
  categoryItem: { alignItems: "center", justifyContent: "center", marginRight: 16 },
  categoryIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  categoryImage: {},
  categoryImageFallback: { backgroundColor: "rgba(255,255,255,0.22)" },
  categoryLabel: { color: colors.primaryText, fontSize: 12, textAlign: "center", fontWeight: "600", marginTop: 6, maxWidth: 94 },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  listRow: { paddingLeft: 16, paddingRight: 16 },
  searchResultsWrap: { paddingHorizontal: 16, gap: 10 },
  searchResultCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    backgroundColor: "#FFFFFF",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchResultImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  searchResultImageFallback: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultBody: { flex: 1, gap: 2 },
  searchResultName: { color: colors.primaryText, fontSize: 14, fontWeight: "800" },
  searchResultNameHighlight: { color: "#0284C7", fontWeight: "900" },
  searchResultDesc: { color: colors.secondaryText, fontSize: 12, fontWeight: "500" },
  searchResultPrice: { color: "#0F766E", fontSize: 13, fontWeight: "800" },
  searchResultBookBtn: {
    borderRadius: 999,
    backgroundColor: "#16A34A",
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultBookText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  lastItem: { marginRight: 0 },
  retryWrap: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  error: { color: palette.danger },
});
