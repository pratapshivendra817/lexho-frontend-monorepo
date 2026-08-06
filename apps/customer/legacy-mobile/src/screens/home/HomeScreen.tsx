import { COLORS } from '../../theme/colors';// @refresh reset
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Animated, FlatList, Image, ImageBackground, ScrollView, StyleSheet, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Button, Searchbar, Text } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { fetchCustomerServicesByCategory, fetchCustomerServicesCatalog } from "../../api/serviceApi";
import { searchServices } from "../../api/homeApi";
import { getUnreadNotificationCount } from "../../api/notificationApi";
import { PopularServicesShimmer } from "../../components/home/PopularServicesShimmer";
import { SectionHeader } from "../../components/home/SectionHeader";
import { ServiceCard as PopularServiceCard } from "../../components/home/ServiceCard";
import { ServiceCard as LegacyServiceCard } from "../../components/cards/ServiceCard";
import { EmptyStateCard } from "../../components/common/EmptyStateCard";
import { QuickBookingSheet } from "../../components/common/QuickBookingSheet";
import { SkeletonList } from "../../components/common/SkeletonList";
import { StaggeredFadeIn } from "../../components/common/StaggeredFadeIn";
import { palette, radii, shadows, spacing } from "../../constants/theme";
import { CART_CONFIG, isPartyCategoryName } from "../../constants/cartConfig";
import { DEV_INTERNAL_TOKEN, DEV_LOGIN_BYPASS } from "../../constants/env";
import { getToken } from "../../utils/storage";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { addToCartThunk, fetchCustomerAddressesThunk, fetchCustomerCartThunk } from "../../redux/cartSlice";
import { fetchHomeData } from "../../redux/homeSlice";
import { DynamicHomeSections } from "../../modules/home/DynamicHomeSections";
import { resolveImageSource } from "../../utils/assetMap";
import { fetchAllAddressesThunk } from "../../redux/locationSlice";
import { resolveUserIdFromAuth } from "../../utils/authUser";
import { trackServiceAddedToCart } from "../../services/customerAnalyticsEvents";

const BANNER_PLACEHOLDER = require("../../assets/images/splash-lexho.jpeg");

const colors = {
  background: COLORS.navy,
  card: COLORS.white,
  primaryText: COLORS.charcoal,
  secondaryText: COLORS.gray,
  accentPopular: COLORS.primary,
};

const CATEGORY_GRADIENTS = [
  [COLORS.navy, COLORS.primary],
  [COLORS.navyDark, COLORS.primary],
  [COLORS.gold, COLORS.goldSoft],
  [COLORS.navy, COLORS.navyDark],
  [COLORS.primary, COLORS.navyDark],
  [COLORS.gold, COLORS.primary],
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

function toSafeUri(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toResolvedImage(value: unknown) {
  const source = resolveImageSource(value as any);
  if (!source) return { source: null as any, uri: null as string | null };
  if (typeof source === "number") return { source, uri: null as string | null };
  const uri = typeof (source as any)?.uri === "string" ? String((source as any).uri).trim() : null;
  return { source, uri: uri && uri.length > 0 ? uri : null };
}

function normalizeSearchText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isSearchMatch(text: unknown, query: unknown) {
  const normalizedText = normalizeSearchText(text);
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;
  if (!normalizedText) return false;
  return normalizedText.includes(normalizedQuery);
}

function isHiddenHomeService(item: any) {
  const name = normalizeSearchText(item?.name ?? item?.serviceName ?? "");
  return name === "simple veg food";
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toTitleCase(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatPrice(value: number) {
  if (!Number.isFinite(value)) return "0";
  return value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

export function HomeScreen({ navigation }: any) {
  const dispatch = useAppDispatch();
  const { loading, error, banners, categories, popular, recommended, quick } = useAppSelector((s) => s.home);
  const authToken = useAppSelector((s) => s.auth.token);
  const [imageAuthToken, setImageAuthToken] = useState<string>("");
  const cartItems = useAppSelector((s) => asArray<any>(s.cart.items));
  const locationServiceAvailable = useAppSelector((s) => (s.location as any)?.serviceAvailable as boolean | null);
  const currentAddress = useAppSelector((s) => (s.location as any)?.currentAddress ?? null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedServices, setSearchedServices] = useState<any[]>([]);
  const [catalogCache, setCatalogCache] = useState<any[]>([]);
  const [catalogCacheLoaded, setCatalogCacheLoaded] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [categoryMatchedServices, setCategoryMatchedServices] = useState<any[]>([]);
  const [brokenBannerIds, setBrokenBannerIds] = useState<Record<string, boolean>>({});
  const [bannerUseAltImageIds, setBannerUseAltImageIds] = useState<Record<string, boolean>>({});
  const [brokenCategoryIds, setBrokenCategoryIds] = useState<Record<string, boolean>>({});
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [showStickySearch, setShowStickySearch] = useState(false);
  const bannerListRef = useRef<FlatList<any>>(null);
  const bannerIndexRef = useRef(0);
  const heroScrollX = useRef(new Animated.Value(0)).current;
  const bannerProgress = useRef(new Animated.Value(0)).current;
  const stickySearchVisibleRef = useRef(false);
  const { width } = useWindowDimensions();
  const bannerWidth = width;
  const bannerHeight = Math.max(width * 0.9, 340);
  const categoryItemSize = width / 4.1;
  const serviceCardGap = spacing.md;
  const serviceEdgePadding = spacing.sm + 2;
  const serviceCardWidth = Math.floor((width - serviceEdgePadding * 2 - serviceCardGap * 2) / 3);
  const cartItemsCount = useMemo(() => cartItems.length, [cartItems]);
  const unreadCountQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadNotificationCount,
    enabled: Boolean(authToken),
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
  });
  const unreadCount = Math.max(0, Number(unreadCountQuery.data ?? 0));
  const isSearchMode = searchQuery.trim().length >= 1;
  const authUserId = useAppSelector((s) => s.auth.user?.id ?? 0);
  const locationUserId = useMemo(() => resolveUserIdFromAuth(authUserId, String(authToken ?? "").trim()), [authToken, authUserId]);
  const openLocationSearch = useCallback(() => {
    const parent = navigation?.getParent?.();
    if (parent?.navigate) {
      parent.navigate("LocationSearch");
      return;
    }
    navigation.navigate("LocationSearch");
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchHomeData());
  }, [
    currentAddress?.id,
    currentAddress?.latitude,
    currentAddress?.longitude,
    currentAddress?.pincode,
    dispatch,
    locationServiceAvailable,
  ]);

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
      } catch {
        // Ignore recent-search cache parse failures.
      }
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
      if (Number.isFinite(locationUserId) && locationUserId > 0) {
        void dispatch(fetchAllAddressesThunk({ userId: locationUserId }));
      }
    }, [authToken, dispatch, locationUserId]),
  );

  const quickActions = useMemo(() => [], []);
  const bookingOptionItems = useMemo(() => CART_CONFIG.homeBookingOptions.items, []);
  const primaryBookingOption = bookingOptionItems[0] ?? null;
  const secondaryBookingOptions = useMemo(() => bookingOptionItems.slice(1), [bookingOptionItems]);

  const handleBookingOptionPress = useCallback(
    (routeName: string) => {
      const parent = navigation?.getParent?.();
      if (parent?.navigate) {
        parent.navigate(routeName);
        return;
      }
      navigation.navigate(routeName);
    },
    [navigation],
  );

  const bannerItems = useMemo(() => {
    const rows = (Array.isArray(banners) ? banners : []).map((item: any, index: number) => {
      const rawBannerImage =
        item?.bannerImageUrl ??
        item?.imageUrl ??
        item?.thumbnailUrl ??
        item?.image ??
        item?.url ??
        item?.path;
      const resolvedImage = toResolvedImage(rawBannerImage);
      return {
        id: String(item?.bannerId ?? item?.id ?? index),
        title: item?.title ?? "Home services in under 30 mins",
        subtitle: item?.subtitle ?? "Verified partners, fixed pricing, fast support",
        imageUrl: resolvedImage.uri ?? toSafeUri(rawBannerImage),
        altImageUrl:
          (resolvedImage.uri ?? toSafeUri(rawBannerImage) ?? "").replace("/images/", "/api/images/"),
        imageSource: resolvedImage.source,
        redirectType: item?.redirectType,
        redirectValue: item?.redirectValue,
        ctaLabel: item?.ctaLabel ?? item?.ctaText ?? "Explore now",
      };
    });
    const deduped: typeof rows = [];
    const seen = new Set<string>();
    rows.forEach((item) => {
      const key = `${String(item.id)}|${String(item.imageUrl ?? "")}|${String(item.title ?? "")}`.toLowerCase().trim();
      if (seen.has(key)) return;
      seen.add(key);
      deduped.push(item);
    });
    return deduped.slice(0, 5);
  }, [banners]);

  useEffect(() => {
    // Reset stale per-id image failure state when banner payload changes.
    setBrokenBannerIds({});
    setBannerUseAltImageIds({});
  }, [bannerItems]);

  const categoryItems = useMemo(
    () => (Array.isArray(categories) ? categories : [])
      .map((item: any, index: number) => {
        const iconResolved = toResolvedImage(item?.categoryIcon ?? item?.iconUrl ?? item?.icon);
        const imageResolved = toResolvedImage(item?.categoryImage ?? item?.iconUrl ?? item?.imageUrl);
        return {
          id: String(item?.categoryId ?? item?.id ?? index),
          name: String(item?.categoryName ?? item?.name ?? "").trim(),
          iconUrl: iconResolved.uri ?? toSafeUri(item?.categoryIcon ?? item?.iconUrl ?? item?.icon),
          imageUrl: imageResolved.uri ?? toSafeUri(item?.categoryImage ?? item?.iconUrl ?? item?.imageUrl),
          iconSource: iconResolved.source,
          imageSource: imageResolved.source,
          gradient: CATEGORY_GRADIENTS[index % CATEGORY_GRADIENTS.length],
        };
      })
      .filter((item) => item.name.length > 0 && item.name.toLowerCase() !== "category"),
    [categories],
  );
  useEffect(() => {
    // Reset stale per-id image failure state when category payload changes.
    setBrokenCategoryIds({});
  }, [categoryItems]);

  const mapPopularServices = useCallback(
    (rows: any[]) =>
      rows
        .map((item: any, index: number) => {
          const serviceId = String(item?.serviceId ?? item?.service?.id ?? item?.id ?? "").trim();
          const rowId = String(item?.id ?? `popular-${index}`).trim();
          const id = serviceId || rowId;
          const price = Number(item?.discountedPrice ?? item?.price ?? item?.service?.price ?? 0);
          const safePrice = Number.isFinite(price) ? price : 0;
          const rating = Number(item?.rating ?? item?.service?.rating ?? 0);
          const safeRating = Number.isFinite(rating) ? rating : 0;
          return {
            id,
            name: toTitleCase(item?.serviceName ?? item?.name ?? item?.service?.name ?? "Service"),
            imageUrl:
              toSafeUri(
                item?.imageUrl ??
                  item?.thumbnailUrl ??
                  item?.serviceImageUrl ??
                  item?.service_image_url ??
                  item?.serviceImage ??
                  item?.image ??
                  item?.service?.imageUrl ??
                  item?.service?.thumbnailUrl ??
                  item?.service?.serviceImageUrl ??
                  item?.service?.service_image_url ??
                  item?.service?.serviceImage ??
                  item?.service?.image,
              ) ?? undefined,
            categoryId: String(item?.categoryId ?? item?.category?.id ?? item?.category?.categoryId ?? "").trim(),
            categoryName: toTitleCase(item?.categoryName ?? item?.category?.name ?? "Popular"),
            ratingValue: safeRating,
            ratingLabel: `Rating ${safeRating.toFixed(1)}`,
            priceLabel: `Rs. ${formatPrice(safePrice)}`,
          };
        })
        .filter((item) => item.id.length > 0),
    [],
  );
  const mappedPopularServices = useMemo(
    () => {
      const rows = mapPopularServices(Array.isArray(popular) ? popular : []);
      const query = searchQuery.trim();
      if (!query) return rows;
      return rows.filter((item) => isSearchMatch(item.name, query));
    },
    [mapPopularServices, popular, searchQuery],
  );
  const popularSections = useMemo(() => {
    const groups = new Map<string, { key: string; categoryId: string; title: string; items: any[] }>();
    mappedPopularServices.forEach((item: any) => {
      const categoryId = String(item?.categoryId ?? "").trim();
      const title = String(item?.categoryName ?? "Popular Services").trim() || "Popular Services";
      const key = categoryId || title.toLowerCase();
      if (!groups.has(key)) {
        groups.set(key, { key, categoryId, title, items: [] });
      }
      groups.get(key)?.items.push(item);
    });
    return Array.from(groups.values())
      .map((group) => ({ ...group, items: group.items.slice(0, 10) }))
      .filter((group) => group.items.length > 0)
      .slice(0, 4);
  }, [mappedPopularServices]);
  const popularCleaningSection = useMemo(() => {
    const isCleaningItem = (item: any) => {
      const name = String(item?.name ?? "").toLowerCase();
      const category = String(item?.categoryName ?? "").toLowerCase();
      return (
        name.includes("clean") ||
        name.includes("bathroom") ||
        name.includes("sofa") ||
        name.includes("kitchen cleaning") ||
        category.includes("clean")
      );
    };
    const cleaningItems = mappedPopularServices.filter(isCleaningItem).slice(0, 10);
    if (cleaningItems.length > 0) {
      const sourceSection = popularSections.find((section) => section.items.some(isCleaningItem)) ?? null;
      return {
        key: sourceSection?.key ?? "cleaning",
        categoryId: sourceSection?.categoryId ?? String(cleaningItems[0]?.categoryId ?? ""),
        title: sourceSection?.title ?? "Cleaning",
        items: cleaningItems,
      };
    }
    const bySectionTitle = popularSections.find((section) => section.title.toLowerCase().includes("clean")) ?? null;
    if (bySectionTitle) return bySectionTitle;
    return popularSections[0] ?? null;
  }, [mappedPopularServices, popularSections]);
  const popularCookSection = useMemo(() => {
    const isCookItem = (item: any) => {
      const name = String(item?.name ?? "").toLowerCase();
      const category = String(item?.categoryName ?? "").toLowerCase();
      return (
        name.includes("cook") ||
        name.includes("chef") ||
        name.includes("meal") ||
        name.includes("khana") ||
        name.includes("khaana") ||
        category.includes("cook") ||
        category.includes("chef")
      );
    };
    const cookItems = mappedPopularServices.filter(isCookItem).slice(0, 10);
    if (cookItems.length > 0) {
      const sourceSection = popularSections.find((section) => section.items.some(isCookItem)) ?? null;
      return {
        key: sourceSection?.key ?? "cook",
        categoryId: sourceSection?.categoryId ?? String(cookItems[0]?.categoryId ?? ""),
        title: sourceSection?.title ?? "Cook",
        items: cookItems,
      };
    }
    const bySectionTitle =
      popularSections.find((section) => {
        const title = section.title.toLowerCase();
        return title.includes("cook") || title.includes("chef") || title.includes("kitchen");
      }) ?? null;
    if (bySectionTitle && bySectionTitle.key !== popularCleaningSection?.key) return bySectionTitle;
    const fallback = popularSections.find((section) => section.key !== popularCleaningSection?.key) ?? null;
    return fallback;
  }, [mappedPopularServices, popularCleaningSection?.key, popularSections]);
  const popularOtherSections = useMemo(
    () =>
      popularSections.filter(
        (section) => {
          if (section.key === popularCleaningSection?.key || section.key === popularCookSection?.key) return false;
          const title = String(section.title ?? "").toLowerCase();
          if (title.includes("cook") || title.includes("khana") || title.includes("khaana")) return false;
          return true;
        },
      ),
    [popularCleaningSection?.key, popularCookSection?.key, popularSections],
  );

  const saveRecentSearch = useCallback(async (query: string) => {
    const clean = query.trim();
    if (clean.length < 1) return;
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
    } catch {
      // Ignore storage failures for clearing recent searches.
    }
  }, []);

  const fuzzyScore = useCallback((name: string, query: string) => {
    const n = normalizeSearchText(name);
    const q = normalizeSearchText(query);
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
    if (query.length < 1) return [];
    const source = [
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
  }, [fuzzyScore, popular, quick, recommended, searchQuery]);

  const containsCatalogResults = useMemo(() => {
    const query = searchQuery.trim();
    if (query.length < 1) return [];
    return catalogCache
      .filter((item: any) => {
        const name = String(item?.name ?? item?.serviceName ?? "");
        return isSearchMatch(name, query);
      })
      .slice(0, 20);
  }, [catalogCache, searchQuery]);

  const catalogSearchIndex = useMemo(
    () =>
      catalogCache.map((item: any, index: number) => {
        const id = String(item?.id ?? item?.serviceId ?? `row-${index}`);
        const name = String(item?.name ?? item?.serviceName ?? "");
        const normalized = normalizeSearchText(name);
        const tokens = normalized.split(/\s+/).filter(Boolean);
        return { id, item, normalized, tokens };
      }),
    [catalogCache],
  );

  const indexedCatalogResults = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    if (query.length < 1 || catalogSearchIndex.length === 0) return [];
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
    if (query.length < 1 || catalogCacheLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchCustomerServicesCatalog({ page: 0, size: 1000 });
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
    if (query.length < 1) {
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
        const [catalogRes, keywordRes] = await Promise.allSettled([
          fetchCustomerServicesCatalog({ page: 0, size: 100, search: query }),
          searchServices(query),
        ]);
        const catalogRows = catalogRes.status === "fulfilled" ? catalogRes.value : [];
        const keywordRows = keywordRes.status === "fulfilled" ? keywordRes.value : [];
        const mergedRows = [...asArray<any>(catalogRows), ...asArray<any>(keywordRows)];
        const dedup = new Map<string, any>();
        mergedRows.forEach((item: any, index: number) => {
          const id = String(item?.id ?? item?.serviceId ?? `row-${index}`);
          if (!dedup.has(id)) dedup.set(id, item);
        });
        const rows = Array.from(dedup.values());
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
    const query = searchQuery.trim();
    if (query.length >= 1) {
      const merged = [
        ...asArray<any>(searchedServices),
        ...asArray<any>(categoryMatchedServices),
        ...asArray<any>(indexedCatalogResults),
        ...asArray<any>(containsCatalogResults),
        ...asArray<any>(fuzzyLocalResults),
      ];
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
        isSearchMatch(String(row?.name ?? row?.serviceName ?? ""), query),
      );
    };
    if (fromPopular.length > 0) return filterRows(fromPopular).slice(0, 8);
    const fromRecommended = Array.isArray(recommended) ? recommended : [];
    if (fromRecommended.length > 0) return filterRows(fromRecommended).slice(0, 8);
    return filterRows(Array.isArray(quick) ? quick : []).slice(0, 8);
  }, [categoryMatchedServices, containsCatalogResults, fuzzyLocalResults, indexedCatalogResults, popular, quick, recommended, searchQuery, searchedServices]);
  const nonCookServicesToRender = useMemo(
    () =>
      allServicesToRender.filter((item: any) => {
        if (isHiddenHomeService(item)) return false;
        const name = String(item?.name ?? item?.serviceName ?? "").toLowerCase();
        if (name.includes("cook") || name.includes("khana") || name.includes("khaana")) return false;
        if (name.includes("bathroom cleaning")) return false;
        if (name.includes("fridge cleaning")) return false;
        if (name.includes("room cleaning")) return false;
        return true;
      }),
    [allServicesToRender],
  );
  const normalizedSearchQuery = searchQuery.trim();
  const matchedCategories = useMemo(
    () =>
      normalizedSearchQuery.length >= 1
        ? categoryItems.filter((item) => isSearchMatch(item.name, normalizedSearchQuery)).slice(0, 8)
        : [],
    [categoryItems, normalizedSearchQuery],
  );
  const matchedCategorySubset = useMemo(() => matchedCategories.slice(0, 3), [matchedCategories]);
  const matchedCategorySubsetKey = useMemo(
    () => matchedCategorySubset.map((item) => String(item.id)).join("|"),
    [matchedCategorySubset],
  );

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 1 || matchedCategorySubset.length === 0) {
      setCategoryMatchedServices([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const responses = await Promise.allSettled(
        matchedCategorySubset.map((category) => fetchCustomerServicesByCategory({ categoryId: category.id, page: 0, size: 50 })),
      );
      if (cancelled) return;

      const mergedRows = responses
        .filter((res): res is PromiseFulfilledResult<any[]> => res.status === "fulfilled")
        .flatMap((res) => res.value);
      const dedup = new Map<string, any>();
      mergedRows.forEach((item: any, index: number) => {
        const id = String(item?.id ?? item?.serviceId ?? `cat-row-${index}`);
        if (!dedup.has(id)) dedup.set(id, item);
      });
      setCategoryMatchedServices(Array.from(dedup.values()));
    })();

    return () => {
      cancelled = true;
    };
  }, [matchedCategorySubset, matchedCategorySubsetKey, searchQuery]);

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


  useEffect(() => {
    if (bannerItems.length <= 1) return;
    const timer = setInterval(() => {
      if (bannerItems.length === 0) return;
      bannerIndexRef.current = (bannerIndexRef.current + 1) % bannerItems.length;
      setActiveBannerIndex(bannerIndexRef.current);
      bannerListRef.current?.scrollToOffset({ offset: bannerWidth * bannerIndexRef.current, animated: true });
    }, 3500);
    return () => clearInterval(timer);
  }, [bannerItems.length, bannerWidth]);

  useEffect(() => {
    if (bannerItems.length === 0) {
      bannerIndexRef.current = 0;
      setActiveBannerIndex(0);
      return;
    }
    if (bannerIndexRef.current >= bannerItems.length) {
      bannerIndexRef.current = 0;
      setActiveBannerIndex(0);
    }
  }, [bannerItems.length]);

  useEffect(() => {
    bannerProgress.stopAnimation();
    bannerProgress.setValue(0);
    if (bannerItems.length <= 1) return;
    Animated.timing(bannerProgress, {
      toValue: 1,
      duration: 3500,
      useNativeDriver: false,
    }).start();
  }, [activeBannerIndex, bannerItems.length, bannerProgress]);

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
    if (redirectType === "tracking") {
      return navigation.navigate("LiveTracking");
    }

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

    // Do nothing when banner mapping is missing/unsupported.
    return;
  }, [navigation]);

  const handlePopularServicePress = useCallback(
    (serviceId: string, meta?: { serviceName?: string; servicePriceLabel?: string; serviceImageUrl?: string }) => {
      const parsedId = Number(serviceId);
      if (!Number.isFinite(parsedId) || parsedId <= 0) {
        Alert.alert("Invalid service", "Service id is invalid. Please try another service.");
        return;
      }
      navigation.navigate("ServiceDetail", {
        serviceId: String(parsedId),
        serviceName: meta?.serviceName,
        servicePriceLabel: meta?.servicePriceLabel,
        serviceImageUrl: meta?.serviceImageUrl,
      });
    },
    [navigation],
  );

  const handlePopularServiceAdd = useCallback(
    async (serviceId: string, meta?: { categoryName?: string }) => {
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
        void trackServiceAddedToCart({
          service_id: parsedId,
          category_name: meta?.categoryName,
          quantity: 1,
          source: "home_popular_service",
        });
        navigation.navigate(
          "CartCrud",
          isPartyCategoryName(meta?.categoryName)
            ? {
                bookingMode: "SCHEDULED",
                categoryName: meta?.categoryName,
              }
            : undefined,
        );
      } catch (error: any) {
        Alert.alert("Add to cart failed", String(error?.message ?? "Please try again."));
      }
    },
    [authToken, dispatch, navigation],
  );

  const handleHomeScroll = useCallback((event: any) => {
    const offsetY = Number(event?.nativeEvent?.contentOffset?.y ?? 0);
    const nextVisible = offsetY > 12;
    if (stickySearchVisibleRef.current !== nextVisible) {
      stickySearchVisibleRef.current = nextVisible;
      setShowStickySearch(nextVisible);
    }
  }, []);

  const imageRequestHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (imageAuthToken) headers.Authorization = `Bearer ${imageAuthToken}`;
    if (DEV_LOGIN_BYPASS && __DEV__) headers["X-Internal-Token"] = DEV_INTERNAL_TOKEN;
    return headers;
  }, [imageAuthToken]);

  useEffect(() => {
    // When auth headers become available/changed, allow image retry.
    setBrokenBannerIds({});
    setBrokenCategoryIds({});
  }, [imageRequestHeaders]);

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        onScroll={handleHomeScroll}
        scrollEventThrottle={16}
      >
        <StaggeredFadeIn delay={30}>
        <View style={[styles.heroSection, { height: bannerHeight }]}>
          {!loading && bannerItems.length > 0 ? (
            <Animated.FlatList
              ref={bannerListRef}
              horizontal
              data={bannerItems}
              keyExtractor={(item, index) => `hero-banner-${item.id}-${index}`}
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={bannerWidth}
              snapToAlignment="start"
              disableIntervalMomentum
              contentContainerStyle={styles.heroRow}
              scrollEventThrottle={16}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: heroScrollX } } }],
                { useNativeDriver: true },
              )}
              getItemLayout={(_, index) => ({
                length: bannerWidth,
                offset: bannerWidth * index,
                index,
              })}
              onScrollToIndexFailed={(info) => {
                const safeIndex = Math.max(0, Math.min(info.index, Math.max(0, bannerItems.length - 1)));
                bannerIndexRef.current = safeIndex;
                setActiveBannerIndex(safeIndex);
                requestAnimationFrame(() => {
                  bannerListRef.current?.scrollToOffset({ offset: bannerWidth * safeIndex, animated: true });
                });
              }}
              onMomentumScrollEnd={(event) => {
                const offsetX = Number(event?.nativeEvent?.contentOffset?.x ?? 0);
                const nextIndex = Math.max(0, Math.min(Math.round(offsetX / bannerWidth), Math.max(0, bannerItems.length - 1)));
                bannerIndexRef.current = nextIndex;
                setActiveBannerIndex(nextIndex);
              }}
              renderItem={({ item, index }) => {
                const imageBroken = !!brokenBannerIds[item.id];
                const inputRange = [
                  (index - 1) * bannerWidth,
                  index * bannerWidth,
                  (index + 1) * bannerWidth,
                ];
                const cardScale = heroScrollX.interpolate({
                  inputRange,
                  outputRange: [0.985, 1, 0.985],
                  extrapolate: "clamp",
                });
                return (
                  <Animated.View style={{ transform: [{ scale: cardScale }] }}>
                    <TouchableOpacity activeOpacity={0.9} onPress={() => handleBannerPress(item)} style={[styles.bannerItem, { width: bannerWidth, height: bannerHeight }]}>
                      <ImageBackground
                        source={
                          !imageBroken && item.imageUrl
                            ? (() => {
                                const useAlt = !!bannerUseAltImageIds[item.id];
                                const chosenUri = useAlt && item.altImageUrl ? item.altImageUrl : item.imageUrl;
                                return Object.keys(imageRequestHeaders).length > 0
                                  ? { uri: chosenUri, headers: imageRequestHeaders }
                                  : { uri: chosenUri };
                              })()
                            : BANNER_PLACEHOLDER
                        }
                        resizeMode="cover"
                        style={styles.hero}
                        imageStyle={styles.heroImage}
                        onError={() => {
                          if (!bannerUseAltImageIds[item.id] && item.altImageUrl && item.altImageUrl !== item.imageUrl) {
                            setBannerUseAltImageIds((prev) => ({ ...prev, [item.id]: true }));
                            return;
                          }
                          setBrokenBannerIds((prev) => ({ ...prev, [item.id]: true }));
                        }}
                      >
                        <LinearGradient
                          colors={["rgba(2,27,78,0.03)", "rgba(2,27,78,0.10)", "rgba(2,27,78,0.15)"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 0, y: 1 }}
                          style={styles.heroOverlay}
                        >
                            <View style={styles.heroDots}>
                              {bannerItems.slice(0, 5).map((bannerDot, dotIndex) => (
                                <View
                                  key={`hero-dot-${bannerDot.id}-${dotIndex}`}
                                  style={[styles.heroDot, dotIndex === activeBannerIndex && styles.heroDotActive]}
                                >
                                  {dotIndex === activeBannerIndex ? (
                                    <Animated.View
                                      style={[
                                        styles.heroDotProgress,
                                        {
                                          width: bannerProgress.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0, 16],
                                          }),
                                        },
                                      ]}
                                    />
                                  ) : null}
                                </View>
                              ))}
                            </View>
                        </LinearGradient>
                      </ImageBackground>
                    </TouchableOpacity>
                  </Animated.View>
                );
              }}
            />
          ) : (
            <ImageBackground source={BANNER_PLACEHOLDER} resizeMode="cover" style={[styles.bannerItem, { width: bannerWidth, height: bannerHeight }]}>
              <LinearGradient colors={["rgba(2,27,78,0.03)", "rgba(2,27,78,0.15)"]} style={styles.heroOverlay} />
            </ImageBackground>
          )}

          <View style={styles.topOverlay}>
            <View style={styles.topHeader}>
              <TouchableOpacity
                style={styles.locationInfoWrap}
                activeOpacity={0.8}
                onPress={openLocationSearch}
              >
                <View style={styles.locationValueWrap}>
                  <MaterialCommunityIcon name="map-marker-radius-outline" color={COLORS.navyDark} size={18} />
                </View>
              </TouchableOpacity>
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={[styles.headerIconBtn, styles.searchHeaderIconBtn]}
                  onPress={() => setShowStickySearch(true)}
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcon name="magnify" color={COLORS.navyDark} size={23} />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.headerIconBtn, styles.notificationHeaderIconBtn]} onPress={() => navigation.navigate("Notifications")} activeOpacity={0.85}>
                  <MaterialCommunityIcon name="bell-outline" color={COLORS.navyDark} size={23} />
                  {unreadCount > 0 ? (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{unreadCount > 99 ? "99+" : String(unreadCount)}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.headerIconBtn, styles.cartHeaderIconBtn]} onPress={() => navigation.navigate("CartCrud")} activeOpacity={0.85}>
                  <MaterialCommunityIcon name="cart-outline" color={COLORS.navyDark} size={23} />
                  {cartItemsCount > 0 ? (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{cartItemsCount > 99 ? "99+" : String(cartItemsCount)}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </StaggeredFadeIn>

      <StaggeredFadeIn delay={160}>
        <Text style={styles.sectionTitle}>Explore services by category</Text>
      </StaggeredFadeIn>
      <StaggeredFadeIn delay={180}>
        {loading ? <SkeletonList rows={2} /> : null}
        {!loading && categoryItems.length === 0 ? <EmptyStateCard title="No active categories" subtitle="Categories from admin panel will show here." /> : null}
        {!loading && categoryItems.length > 0 ? (
          <FlatList
            horizontal
            data={categoryItems}
            keyExtractor={(item, index) => `category-${item.id}-${index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
            decelerationRate="fast"
            snapToInterval={categoryItemSize + spacing.md}
            snapToAlignment="start"
            disableIntervalMomentum
            renderItem={({ item, index }) => {
              const imageBroken = !!brokenCategoryIds[item.id];
              const imageUri = item.imageUrl || item.iconUrl;
              return (
                <TouchableOpacity
                  style={[styles.categoryItem, index === categoryItems.length - 1 && styles.lastItem]}
                  onPress={() => handleCategoryPress({ id: item.id, name: item.name })}
                  activeOpacity={0.9}
                >
                  <LinearGradient colors={item.gradient} style={[styles.categoryIconWrap, { width: categoryItemSize, height: categoryItemSize, borderRadius: categoryItemSize / 2 }]}>
                    {imageUri && !imageBroken ? (
                      <Image
                        source={
                          { uri: imageUri }
                        }
                        style={[styles.categoryImage, { width: categoryItemSize - 6, height: categoryItemSize - 6, borderRadius: (categoryItemSize - 6) / 2 }]}
                        resizeMode="cover"
                        onError={() => {
                          setBrokenCategoryIds((prev) => ({ ...prev, [item.id]: true }));
                        }}
                      />
                    ) : (
                      <View style={[styles.categoryImageFallback, { width: categoryItemSize - 6, height: categoryItemSize - 6, borderRadius: (categoryItemSize - 6) / 2 }]} />
                    )}
                  </LinearGradient>
                  <Text style={styles.categoryLabel} numberOfLines={2}>{item.name}</Text>
                </TouchableOpacity>
              );
            }}
          />
        ) : null}
      </StaggeredFadeIn>

      <StaggeredFadeIn delay={190} style={styles.fullBleedSection}>
        <View style={styles.bookingOptionsWrap}>
          <Text style={styles.bookingOptionsTitle}>{CART_CONFIG.homeBookingOptions.title}</Text>
          <View style={styles.bookingHeroStrip}>
            {primaryBookingOption ? (
              <TouchableOpacity
                style={styles.bookingHeroCard}
                activeOpacity={0.9}
                onPress={() => handleBookingOptionPress(primaryBookingOption.route)}
              >
                <View style={styles.bookingHeroIconWrap}>
                  <MaterialCommunityIcon name={primaryBookingOption.icon} size={25} color={COLORS.navyDark} />
                </View>
                <View style={styles.bookingHeroTextWrap}>
                  <Text style={styles.bookingHeroLabel} numberOfLines={1}>{primaryBookingOption.label}</Text>
                  <Text style={styles.bookingHeroDescription} numberOfLines={3}>{primaryBookingOption.description}</Text>
                </View>
                <MaterialCommunityIcon name="arrow-right-circle" size={24} color={COLORS.goldSoft} />
              </TouchableOpacity>
            ) : null}
            <View style={styles.bookingSecondaryColumn}>
              {secondaryBookingOptions.map((item, index) => (
                <TouchableOpacity
                  key={`booking-option-${item.id}-${index}`}
                  style={styles.bookingSecondaryCard}
                  activeOpacity={0.88}
                  onPress={() => handleBookingOptionPress(item.route)}
                >
                  <View style={styles.bookingSecondaryIconWrap}>
                    <MaterialCommunityIcon name={item.icon} size={18} color={COLORS.navyDark} />
                  </View>
                  <View style={styles.bookingSecondaryTextWrap}>
                    <Text style={styles.bookingSecondaryLabel} numberOfLines={1}>{item.label}</Text>
                    <Text style={styles.bookingSecondaryDescription} numberOfLines={1}>{item.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </StaggeredFadeIn>

      <StaggeredFadeIn delay={80}>
        <View>
          <SectionHeader
            title={"Popular Cleaning Services"}
            titleColor={COLORS.white}
            rightSlot={(
              <Button
                compact
                mode="outlined"
                textColor={COLORS.goldSoft}
                style={styles.viewAllBtn}
                onPress={() =>
                  popularCleaningSection?.categoryId
                    ? navigation.navigate("ServiceList", {
                      categoryId: popularCleaningSection.categoryId,
                      categoryName: popularCleaningSection.title || "Cleaning",
                    })
                    : undefined
                }
                disabled={!popularCleaningSection?.categoryId}
              >
                View all
              </Button>
            )}
          />
          <View style={styles.sectionCarouselWrap}>
            {loading ? <PopularServicesShimmer cardWidth={serviceCardWidth} /> : null}
            {!loading && (!popularCleaningSection || popularCleaningSection.items.length === 0) ? (
              <EmptyStateCard title="No popular cleaning services" subtitle="Please check back in a while." />
            ) : null}
            {!loading && popularCleaningSection && popularCleaningSection.items.length > 0 ? (
              <FlatList
                horizontal
                data={popularCleaningSection.items}
                keyExtractor={(item, idx) => `cleaning-${item.id}-${idx}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listRow}
                snapToInterval={serviceCardWidth + spacing.md}
                decelerationRate="fast"
                snapToAlignment="start"
                disableIntervalMomentum
                renderItem={({ item, index }) => (
                  <View style={index === popularCleaningSection.items.length - 1 ? styles.lastItem : undefined}>
                    <PopularServiceCard
                      item={item}
                      width={serviceCardWidth}
                      onPress={(serviceId: string) =>
                        handlePopularServicePress(serviceId, {
                          serviceName: item?.name,
                          servicePriceLabel: item?.priceLabel,
                          serviceImageUrl: item?.imageUrl,
                        })
                      }
                      onAdd={(serviceId: string) => handlePopularServiceAdd(serviceId, { categoryName: item?.categoryName })}
                      accentColor={colors.accentPopular}
                      badgeLabel="Popular"
                    />
                  </View>
                )}
              />
            ) : null}
          </View>
        </View>
        <View>
          <SectionHeader
            title={"Popular Cook Services"}
            titleColor={COLORS.white}
            rightSlot={(
              <Button
                compact
                mode="outlined"
                textColor={COLORS.goldSoft}
                style={styles.viewAllBtn}
                onPress={() =>
                  popularCookSection?.categoryId
                    ? navigation.navigate("ServiceList", {
                      categoryId: popularCookSection.categoryId,
                      categoryName: popularCookSection.title || "Cook",
                    })
                    : undefined
                }
                disabled={!popularCookSection?.categoryId}
              >
                View all
              </Button>
            )}
          />
          <View style={styles.sectionCarouselWrap}>
            {loading ? <PopularServicesShimmer cardWidth={serviceCardWidth} /> : null}
            {!loading && (!popularCookSection || popularCookSection.items.length === 0) ? (
              <EmptyStateCard title="No popular cook services" subtitle="Please check back in a while." />
            ) : null}
            {!loading && popularCookSection && popularCookSection.items.length > 0 ? (
              <FlatList
                horizontal
                data={popularCookSection.items}
                keyExtractor={(item, idx) => `cook-${item.id}-${idx}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listRow}
                snapToInterval={serviceCardWidth + spacing.md}
                decelerationRate="fast"
                snapToAlignment="start"
                disableIntervalMomentum
                renderItem={({ item, index }) => (
                  <View style={index === popularCookSection.items.length - 1 ? styles.lastItem : undefined}>
                    <PopularServiceCard
                      item={item}
                      width={serviceCardWidth}
                      onPress={(serviceId: string) =>
                        handlePopularServicePress(serviceId, {
                          serviceName: item?.name,
                          servicePriceLabel: item?.priceLabel,
                          serviceImageUrl: item?.imageUrl,
                        })
                      }
                      onAdd={(serviceId: string) => handlePopularServiceAdd(serviceId, { categoryName: item?.categoryName })}
                      accentColor={colors.accentPopular}
                      badgeLabel="Popular"
                    />
                  </View>
                )}
              />
            ) : null}
          </View>
        </View>
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
                  <MaterialCommunityIcon name="history" size={13} color={COLORS.gold} />
                  <Text style={styles.searchChipText}>{term}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
        {isSearchMode ? (
          <View style={styles.searchOverlayPanel}>
            <ScrollView style={styles.searchOverlayBody} showsVerticalScrollIndicator={false}>
              {searchLoading ? <SkeletonList rows={2} /> : null}
              {!searchLoading && searchError ? <EmptyStateCard title="Search failed" subtitle={searchError} /> : null}
              {!searchLoading && !searchError && matchedCategories.length > 0 ? (
                <View style={styles.overlaySection}>
                  <View style={styles.overlayCategoriesWrap}>
                    {matchedCategories.map((item, index) => (
                      <TouchableOpacity
                        key={`cat-${item.id}-${index}`}
                        style={styles.overlayCategoryChip}
                        activeOpacity={0.9}
                        onPress={() => handleCategoryPress({ id: item.id, name: item.name })}
                      >
                        <Text style={styles.overlayCategoryChipText}>{item.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
              {!searchLoading && !searchError && allServicesToRender.length > 0 ? (
                <View style={styles.overlaySection}>
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
                          key={`overlay-${serviceId}-${i}`}
                          style={styles.searchResultCard}
                          activeOpacity={0.9}
                          onPress={() => {
                            if (serviceId) {
                              const servicePrice = Number(item?.price ?? item?.discountedPrice ?? 0);
                              const servicePriceLabel = servicePrice > 0 ? `Rs. ${formatPrice(servicePrice)}` : undefined;
                              handlePopularServicePress(serviceId, {
                                serviceName,
                                servicePriceLabel,
                                serviceImageUrl: imageUrl ? String(imageUrl) : undefined,
                              });
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
                            {servicePrice > 0 ? <Text style={styles.searchResultPrice}>{`Rs. ${formatPrice(servicePrice)}`}</Text> : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : null}
              {!searchLoading && !searchError && matchedCategories.length === 0 && allServicesToRender.length === 0 ? (
                <EmptyStateCard title="No matching services" subtitle="Try another keyword." />
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </StaggeredFadeIn>

      <StaggeredFadeIn delay={120}>
        {locationServiceAvailable === false ? (
          <View style={styles.comingSoonCard}>
            <Text style={styles.comingSoonTitle}>WE ARE COMING SOON</Text>
            <Text style={styles.comingSoonSub}>
              We are currently live in select areas and expanding quickly.
            </Text>
            <View style={styles.comingSoonActions}>
              <Button
                mode="contained"
                buttonColor={COLORS.primary}
                textColor={COLORS.white}
                style={styles.notifyBtn}
                onPress={() => Alert.alert("Thanks!", "We will notify you when services are available in your area.")}
              >
                Notify me
              </Button>
              <Button mode="outlined" textColor={COLORS.goldSoft} style={styles.changeLocationBtn} onPress={openLocationSearch}>
                Change location
              </Button>
            </View>
          </View>
        ) : null}
      </StaggeredFadeIn>

      {popularOtherSections.length > 0 ? (
        <StaggeredFadeIn delay={220}>
          <SectionHeader title={"Popular services near your location"} subtitleColor={COLORS.white} titleColor={COLORS.white} />
        </StaggeredFadeIn>
      ) : null}
      {loading ? <View style={styles.sectionCarouselWrap}><PopularServicesShimmer cardWidth={serviceCardWidth} /></View> : null}
      {!loading && !popularCleaningSection && popularOtherSections.length === 0 ? (
        <View style={styles.sectionCarouselWrap}>
          <EmptyStateCard title="No popular services available" subtitle="Please check back in a while." />
        </View>
      ) : null}
      {!loading && popularOtherSections.length > 0 ? (
        <>
          {popularOtherSections.map((section, sectionIndex) => (
            <View key={section.key}>
              <StaggeredFadeIn delay={230 + sectionIndex * 20}>
                <SectionHeader
                  title={`${section.title} Popular`}
                  titleColor={COLORS.white}
                  rightSlot={(
                    <Button
                      compact
                      mode="outlined"
                      textColor={COLORS.goldSoft}
                      style={styles.viewAllBtn}
                      onPress={() =>
                        section.categoryId
                          ? navigation.navigate("ServiceList", {
                            categoryId: section.categoryId,
                            categoryName: section.title,
                          })
                          : undefined
                      }
                      disabled={!section.categoryId}
                    >
                      View all
                    </Button>
                  )}
                />
              </StaggeredFadeIn>
              <View style={styles.sectionCarouselWrap}>
                <FlatList
                  horizontal
                  data={section.items}
                  keyExtractor={(item, idx) => `${section.key}-${item.id}-${idx}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.listRow}
                  snapToInterval={serviceCardWidth + spacing.md}
                  decelerationRate="fast"
                  snapToAlignment="start"
                  disableIntervalMomentum
                  renderItem={({ item, index }) => (
                    <View style={index === section.items.length - 1 ? styles.lastItem : undefined}>
                      <PopularServiceCard
                        item={item}
                        width={serviceCardWidth}
                        onPress={(serviceId: string) =>
                          handlePopularServicePress(serviceId, {
                            serviceName: item?.name,
                            servicePriceLabel: item?.priceLabel,
                            serviceImageUrl: item?.imageUrl,
                          })
                        }
                        onAdd={(serviceId: string) => handlePopularServiceAdd(serviceId, { categoryName: item?.categoryName })}
                        accentColor={colors.accentPopular}
                        badgeLabel="Popular"
                      />
                    </View>
                  )}
                />
              </View>
            </View>
          ))}
        </>
      ) : null}

      <StaggeredFadeIn delay={260} style={styles.fullBleedSection}>
        <DynamicHomeSections />
      </StaggeredFadeIn>
      {(loading || (!isSearchMode && nonCookServicesToRender.length > 0)) ? (
        <View style={styles.sectionCarouselWrap}>
          {loading ? <SkeletonList rows={2} /> : null}
          {!loading && !isSearchMode && nonCookServicesToRender.length > 0 ? (
            <FlatList
              horizontal
              data={nonCookServicesToRender}
              keyExtractor={(item, i) => String(item?.id ?? i)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.listRow}
              renderItem={({ item, index }) => (
                <View style={index === nonCookServicesToRender.length - 1 ? styles.lastItem : undefined}>
                  <LegacyServiceCard
                    title={item?.name ?? item?.serviceName ?? "Service"}
                    subtitle={item?.description ?? "Trusted professionals near your location"}
                    price={item?.price ? `Rs. ${formatPrice(Number(item.price))}` : undefined}
                    badge="All Services"
                  />
                </View>
              )}
            />
          ) : null}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error && asArray<any>(categories).length === 0 && asArray<any>(popular).length === 0 ? <EmptyStateCard title="No services yet" subtitle="Try again in a moment or change location." /> : null}
      <QuickBookingSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} actions={quickActions} />
      </ScrollView>

      {showStickySearch ? (
        <View style={styles.stickySearchWrap}>
          <Searchbar
            placeholder="Search services..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearIcon="close"
            onClearIconPress={() => setSearchQuery("")}
            style={styles.searchSticky}
            inputStyle={styles.searchInput}
            placeholderTextColor={COLORS.white}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 0, paddingTop: 0, gap: 0, paddingBottom: spacing.xl + 4 },
  heroSection: {
    width: "100%",
    position: "relative",
    marginBottom: 0,
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.lg + 2,
    paddingHorizontal: spacing.sm + 2,
    zIndex: 5,
  },
  topHeader: {
    marginTop: -12,
    borderRadius: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: 0,
    backgroundColor: "transparent",
    borderWidth: 0,
    borderColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  locationInfoWrap: { paddingRight: 10 },
  locationValueWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: COLORS.navyDark,
  },
  headerActions: { flexDirection: "row", gap: 8, marginTop: -1 },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(217,164,65,0.55)",
  },
  cartHeaderIconBtn: {
    borderColor: COLORS.navyDark,
  },
  searchHeaderIconBtn: {
    borderColor: COLORS.navyDark,
  },
  notificationHeaderIconBtn: {
    borderColor: COLORS.navyDark,
  },
  cartBadge: {
    position: "absolute",
    top: -5,
    right: -6,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 3,
    backgroundColor: COLORS.danger,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  cartBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
  },
  search: {
    marginTop: 4,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(217,164,65,0.65)",
    ...shadows.sm,
  },
  searchInput: { color: COLORS.white, fontSize: 14, textAlign: "left", marginTop: 0 },
  stickySearchWrap: {
    position: "absolute",
    top: 2,
    left: spacing.sm + 2,
    right: spacing.sm + 2,
    zIndex: 20,
  },
  searchSticky: {
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(6,42,113,0.96)",
    borderWidth: 1,
    borderColor: "rgba(217,164,65,0.55)",
    ...shadows.md,
  },
  searchHistoryWrap: { paddingTop: 4, paddingHorizontal: spacing.sm + 2 },
  searchHistoryHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 2, marginBottom: 6 },
  searchHistoryTitle: { color: colors.secondaryText, fontSize: 12, fontWeight: "700" },
  searchHistoryClear: { color: COLORS.goldSoft, fontSize: 12, fontWeight: "800" },
  searchChipsWrap: { paddingTop: 6, paddingHorizontal: 2, gap: 8 },
  searchOverlayPanel: {
    marginTop: spacing.xs + 2,
    borderRadius: radii.md,
    backgroundColor: COLORS.offWhite,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    ...shadows.md,
    maxHeight: 420,
  },
  searchOverlayHead: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.goldSoft,
  },
  searchOverlayTitle: { color: colors.primaryText, fontSize: 14, fontWeight: "800" },
  searchOverlaySubtitle: { color: colors.secondaryText, fontSize: 12, marginTop: 2 },
  searchOverlayBody: { paddingVertical: 10 },
  overlaySection: { gap: 8, paddingBottom: 8 },
  overlaySectionTitle: {
    color: colors.primaryText,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 16,
  },
  overlayCategoriesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
  },
  overlayCategoryChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.offWhite,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  overlayCategoryChipText: { color: COLORS.charcoal, fontSize: 12, fontWeight: "700" },
  searchChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.offWhite,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  searchChipText: { color: COLORS.charcoal, fontSize: 12, fontWeight: "700" },
  comingSoonCard: {
    marginHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.offWhite,
    paddingHorizontal: 18,
    paddingVertical: 20,
    alignItems: "center",
    gap: 8,
  },
  comingSoonTitle: {
    color: COLORS.navy,
    fontWeight: "900",
    fontSize: 28,
    textAlign: "center",
    lineHeight: 34,
  },
  comingSoonSub: {
    color: COLORS.charcoal,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  comingSoonActions: {
    marginTop: 8,
    width: "100%",
    alignItems: "center",
    gap: 6,
  },
  viewAllBtn: {
    borderColor: COLORS.goldSoft,
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 30,
  },
  notifyBtn: {
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
  },
  changeLocationBtn: {
    borderColor: COLORS.goldSoft,
    borderWidth: 1,
    backgroundColor: COLORS.navyDark,
  },
  bannerItem: {
    marginRight: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: "hidden",
    backgroundColor: COLORS.offWhite,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    shadowColor: "#041C4A",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  heroRow: { paddingLeft: 0, paddingRight: 0 },
  hero: { overflow: "hidden", width: "100%", height: "100%" },
  heroImage: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  heroOverlay: { padding: spacing.lg, gap: spacing.sm, backgroundColor: "rgba(2, 27, 74, 0.06)", height: "100%", justifyContent: "flex-end" },
  heroTag: { color: COLORS.goldSoft, fontWeight: "700", fontSize: 12, letterSpacing: 1 },
  heroTitle: { color: COLORS.white, fontWeight: "800", fontSize: 20, lineHeight: 26 },
  heroSub: { color: COLORS.neutral100, fontSize: 13 },
  heroCtaWrap: { marginTop: 10, alignSelf: "flex-start" },
  heroCta: { borderRadius: radii.pill, paddingHorizontal: spacing.md + 2, paddingVertical: spacing.sm + 1 },
  heroCtaText: {
    color: COLORS.navy,
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
    overflow: "hidden",
  },
  heroDotActive: {
    width: 16,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  heroDotProgress: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: COLORS.goldSoft,
  },
  locLabel: { color: COLORS.gray, fontSize: 12, marginTop: 0, fontWeight: "700" },
  locValue: { color: COLORS.white, fontSize: 18, fontWeight: "800", flexShrink: 1 },
  locationSourceChip: {
    marginTop: 6,
    alignSelf: "center",
    color: COLORS.navyDark,
    backgroundColor: COLORS.goldSoft,
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginTop: 10, marginHorizontal: spacing.sm + 2, color: COLORS.white },
  sectionSubtitle: { fontSize: 12, color: colors.secondaryText, marginHorizontal: 16, marginTop: 4 },
  fullBleedSection: { width: "100%", alignSelf: "stretch" },
  categoriesRow: { paddingHorizontal: spacing.sm + 2, marginTop: 8 },
  categoryItem: { alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  categoryIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    overflow: "hidden",
    borderWidth: 0,
    borderColor: "transparent",
    ...shadows.sm,
  },
  categoryImage: {
    borderWidth: 0,
    borderColor: "transparent",
  },
  categoryImageFallback: { backgroundColor: "rgba(255,255,255,0.22)" },
  categoryLabel: { color: COLORS.white, fontSize: 12, textAlign: "center", fontWeight: "700", marginTop: 7, maxWidth: 108 },
  bookingOptionsWrap: {
    marginTop: spacing.md,
    marginHorizontal: 0,
    width: "100%",
    alignSelf: "stretch",
    gap: 10,
  },
  bookingOptionsTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "900",
    paddingHorizontal: spacing.sm + 2,
  },
  bookingHeroStrip: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    alignSelf: "stretch",
  },
  bookingHeroCard: {
    flex: 1.15,
    minHeight: 142,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
    paddingHorizontal: 13,
    paddingVertical: 14,
    justifyContent: "space-between",
    gap: 9,
    ...shadows.md,
  },
  bookingHeroIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  bookingHeroTextWrap: {
    gap: 5,
  },
  bookingHeroLabel: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: "900",
  },
  bookingHeroDescription: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
  },
  bookingSecondaryColumn: {
    flex: 1,
    gap: 8,
  },
  bookingSecondaryCard: {
    flex: 1,
    minHeight: 67,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.navyDark,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...shadows.sm,
  },
  bookingSecondaryIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  bookingSecondaryTextWrap: {
    flex: 1,
    gap: 2,
  },
  bookingSecondaryLabel: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "900",
  },
  bookingSecondaryDescription: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 10,
    fontWeight: "700",
  },
  sectionCarouselWrap: {
    marginTop: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  listRow: { paddingLeft: spacing.sm, paddingRight: spacing.sm + 2 },
  searchResultsWrap: { paddingHorizontal: 16, gap: 10 },
  searchResultCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    backgroundColor: COLORS.white,
    padding: spacing.sm + 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchResultImage: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: COLORS.neutral200,
  },
  searchResultImageFallback: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: COLORS.offWhite,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultBody: { flex: 1, gap: 2 },
  searchResultName: { color: colors.primaryText, fontSize: 14, fontWeight: "800" },
  searchResultNameHighlight: { color: COLORS.primary, fontWeight: "900" },
  searchResultDesc: { color: colors.secondaryText, fontSize: 12, fontWeight: "500" },
  searchResultPrice: { color: COLORS.primary, fontSize: 13, fontWeight: "800" },
  searchResultBookBtn: {
    borderRadius: radii.pill,
    backgroundColor: COLORS.gold,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  searchResultBookText: { color: COLORS.white, fontSize: 12, fontWeight: "800" },
  lastItem: { marginRight: 0 },
  retryWrap: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
  error: { color: palette.danger },
});
