import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { ActivityIndicator, Text } from "react-native-paper";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";

import { fetchCustomerServicesByCategory, type CustomerServiceDto } from "../../api/serviceApi";
import { radii, shadows, spacing } from "../../constants/theme";
import { fetchHomeData } from "../../redux/homeSlice";
import { useAppDispatch, useAppSelector } from "../../redux/hooks";
import { COLORS } from "../../theme/colors";

type WizardCategory = {
  id: string;
  name: string;
  imageUrl?: string;
};

type WizardService = {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  priceLabel: string;
  hourlyRateLabel: string;
  bookingModes: string[];
  ratingLabel: string;
};

type UnknownRecord = Record<string, unknown>;
type NavigationLike = {
  goBack: () => void;
  navigate: (screen: string, params?: UnknownRecord) => void;
};
type ServiceSource = CustomerServiceDto & {
  service?: Partial<CustomerServiceDto> | null;
};

function asText(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatPrice(value: unknown) {
  const amount = asNumber(value, 0);
  if (amount <= 0) return "";
  return `Rs. ${amount.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1")}`;
}

function normalizeSearch(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function toBookingModes(source: ServiceSource): string[] {
  const raw = source.bookingModes ?? ["FIXED"];
  const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const modes = rows
    .map((item) => String(item ?? "").toUpperCase())
    .filter((item) => item === "FIXED");
  return modes.length > 0 ? modes : ["FIXED"];
}

function toCategory(row: unknown, index: number): WizardCategory | null {
  const source = asRecord(row);
  const id = asText(source.categoryId ?? source.id ?? index);
  const name = asText(source.categoryName ?? source.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    imageUrl: asText(source.categoryImage ?? source.imageUrl ?? source.categoryIcon ?? source.iconUrl ?? source.icon, "") || undefined,
  };
}

function toService(row: CustomerServiceDto): WizardService | null {
  const source = row as ServiceSource;
  const id = asNumber(source.serviceId ?? source.id ?? source.service?.id, 0);
  if (!id) return null;
  const rating = asNumber(source.rating ?? source.service?.rating, 0);
  return {
    id,
    name: asText(source.serviceName ?? source.name ?? source.title ?? source.service?.name, "Service"),
    description: asText(source.description ?? source.shortDescription, ""),
    imageUrl: asText(source.imageUrl ?? source.thumbnailUrl ?? source.serviceImageUrl, "") || undefined,
    priceLabel: formatPrice(source.discountedPrice ?? source.price ?? source.service?.price),
    hourlyRateLabel: formatPrice(source.hourlyRate),
    bookingModes: toBookingModes(source),
    ratingLabel: rating > 0 ? rating.toFixed(1) : "",
  };
}

export function ScheduleBookingWizardScreen({ navigation }: { navigation: NavigationLike }) {
  const dispatch = useAppDispatch();
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const homeCategories = useAppSelector((state) => (Array.isArray(state.home.categories) ? state.home.categories : []));
  const homeLoading = useAppSelector((state) => Boolean(state.home.loading));

  const categories = useMemo(
    () =>
      homeCategories
        .map((category, categoryIndex) =>
          toCategory(category, categoryIndex),
        )
        .filter((item): item is WizardCategory => Boolean(item)),
    [homeCategories],
  );

  useEffect(() => {
    if (homeCategories.length > 0 || homeLoading) return;
    void dispatch(fetchHomeData());
  }, [dispatch, homeCategories.length, homeLoading]);

  const effectiveSelectedCategoryId = selectedCategoryId || categories[0]?.id || "";

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === effectiveSelectedCategoryId) ?? null,
    [categories, effectiveSelectedCategoryId],
  );
  const isCookCategory = useMemo(() => {
    const name = normalizeSearch(selectedCategory?.name ?? "");
    return name.includes("cook") || name.includes("chef") || name.includes("breakfast") || name.includes("party") || name.includes("parties");
  }, [selectedCategory?.name]);

  const servicesQuery = useQuery({
    queryKey: ["schedule-wizard-category-services", effectiveSelectedCategoryId],
    queryFn: () => fetchCustomerServicesByCategory({ categoryId: effectiveSelectedCategoryId, page: 0, size: 80 }),
    enabled: effectiveSelectedCategoryId.length > 0,
    retry: false,
  });

  const services = useMemo(() => {
    const normalizedQuery = normalizeSearch(searchQuery);
    const bookingMode = "FIXED";
    return (Array.isArray(servicesQuery.data) ? servicesQuery.data : [])
      .map(toService)
      .filter((item): item is WizardService => Boolean(item))
      .filter((item) => item.bookingModes.includes(bookingMode))
      .filter((item) => {
        if (!normalizedQuery) return true;
        return normalizeSearch(`${item.name} ${item.description}`).includes(normalizedQuery);
      });
  }, [searchQuery, servicesQuery.data]);

  const openServiceDetail = (service: WizardService) => {
    navigation.navigate("ServiceDetail", {
      serviceId: String(service.id),
      serviceName: service.name,
      servicePriceLabel: service.priceLabel,
      serviceImageUrl: service.imageUrl,
      source: "schedule_booking_wizard",
      bookingMode: "SCHEDULED",
      scheduleMode: "FIXED",
      categoryId: effectiveSelectedCategoryId,
      categoryName: selectedCategory?.name,
      showCookCoverage: isCookCategory,
    });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcon name="arrow-left" size={19} color={COLORS.goldSoft} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.title}>Schedule Booking</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {homeLoading && categories.length === 0 ? <ActivityIndicator color={COLORS.goldSoft} /> : null}
        {!homeLoading && categories.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcon name="shape-outline" size={24} color={COLORS.goldSoft} />
            <Text style={styles.emptyTitle}>No categories available</Text>
            <Text style={styles.emptyText}>Categories from admin panel will show here.</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroller}
            contentContainerStyle={styles.categoryRow}
          >
            {categories.map((category) => {
              const active = category.id === effectiveSelectedCategoryId;
              return (
                <Pressable
                  key={category.id}
                  style={[styles.categoryCard, active && styles.categoryCardActive]}
                  onPress={() => {
                    setSelectedCategoryId(category.id);
                    setSearchQuery("");
                  }}
                >
                  <View style={[styles.categoryImageFrame, active && styles.categoryImageFrameActive]}>
                    {category.imageUrl ? (
                      <Image source={{ uri: category.imageUrl }} style={styles.categoryImage} resizeMode="cover" />
                    ) : (
                      <View style={styles.categoryImageFallback}>
                        <MaterialCommunityIcon name="shape-outline" size={18} color={COLORS.goldSoft} />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]} numberOfLines={2}>
                    {category.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.searchWrap}>
          <MaterialCommunityIcon name="magnify" size={18} color={COLORS.goldSoft} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={selectedCategory ? `Search ${selectedCategory.name}` : "Search services"}
            placeholderTextColor="rgba(255,255,255,0.58)"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.serviceHeaderRow}>
          <Text style={styles.sectionTitle}>{selectedCategory?.name || "Services"}</Text>
          {servicesQuery.isFetching ? <ActivityIndicator color={COLORS.goldSoft} /> : null}
        </View>

        {!servicesQuery.isFetching && effectiveSelectedCategoryId && services.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcon name="briefcase-search-outline" size={24} color={COLORS.goldSoft} />
            <Text style={styles.emptyTitle}>No services found</Text>
            <Text style={styles.emptyText}>Try another category or search keyword.</Text>
          </View>
        ) : null}

        {services.map((service) => {
          return (
            <View key={service.id} style={styles.serviceCard}>
              <Pressable style={styles.serviceTapArea} onPress={() => openServiceDetail(service)}>
                {service.imageUrl ? (
                  <Image source={{ uri: service.imageUrl }} style={styles.serviceImage} resizeMode="cover" />
                ) : (
                  <View style={styles.serviceImageFallback}>
                    <MaterialCommunityIcon name="briefcase-outline" size={22} color={COLORS.goldSoft} />
                  </View>
                )}
              </Pressable>
              <View style={styles.serviceBody}>
                <Pressable onPress={() => openServiceDetail(service)} style={styles.serviceTextTap}>
                  <Text style={styles.serviceName} numberOfLines={2}>{service.name}</Text>
                  {service.description ? (
                    <Text style={styles.serviceDescription} numberOfLines={1}>{service.description}</Text>
                  ) : null}
                </Pressable>
                <View style={styles.metaRow}>
                  <Text style={styles.priceText}>
                    {service.priceLabel || "Check details"}
                  </Text>
                  {service.ratingLabel ? (
                    <View style={styles.ratingPill}>
                      <MaterialCommunityIcon name="star" size={11} color={COLORS.warning} />
                      <Text style={styles.ratingText}>{service.ratingLabel}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Pressable
                style={styles.addServiceButton}
                onPress={() => openServiceDetail(service)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${service.name} details`}
              >
                <MaterialCommunityIcon name="cart-plus" size={22} color={COLORS.navyDark} />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.navy },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  headerTextWrap: { flex: 1 },
  title: { color: COLORS.white, fontSize: 20, fontWeight: "900" },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  sectionTitle: { color: COLORS.white, fontSize: 18, fontWeight: "900" },
  categoryScroller: { marginLeft: -spacing.md, marginRight: -spacing.md },
  categoryRow: { gap: 8, paddingLeft: 0, paddingRight: spacing.md, paddingVertical: 2 },
  categoryCard: {
    width: 96,
    minHeight: 112,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.navyDark,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  categoryCardActive: {
    borderColor: COLORS.goldSoft,
    borderWidth: 2,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  categoryImageFrame: {
    width: 62,
    height: 62,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: COLORS.navyDark,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryImageFrameActive: {
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  categoryImage: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: COLORS.borderSoft,
  },
  categoryImageFallback: {
    width: 58,
    height: 58,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.navyDark,
  },
  categoryLabel: { color: COLORS.white, fontSize: 11, fontWeight: "800", textAlign: "center", lineHeight: 15 },
  categoryLabelActive: { color: COLORS.goldSoft },
  searchWrap: {
    minHeight: 46,
    marginLeft: -spacing.md,
    marginRight: -spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.navyDark,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.sm,
  },
  searchInput: { flex: 1, color: COLORS.white, fontSize: 14, fontWeight: "700" },
  serviceHeaderRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  serviceCard: {
    marginLeft: -spacing.md,
    marginRight: -spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.navyDark,
    padding: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...shadows.sm,
  },
  disabledCard: { opacity: 0.72 },
  serviceTapArea: {
    borderRadius: 14,
  },
  serviceImage: { width: 62, height: 62, borderRadius: 14, backgroundColor: COLORS.borderSoft },
  serviceImageFallback: {
    width: 62,
    height: 62,
    borderRadius: 14,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceBody: { flex: 1, gap: 5 },
  serviceTextTap: { gap: 3 },
  serviceName: { color: COLORS.white, fontSize: 15, fontWeight: "900" },
  serviceDescription: { color: "rgba(255,255,255,0.72)", fontSize: 12, fontWeight: "700" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  priceText: { color: COLORS.goldSoft, fontSize: 13, fontWeight: "900" },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.navy,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  ratingText: { color: COLORS.warning, fontSize: 11, fontWeight: "900" },
  addServiceButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  emptyCard: {
    marginLeft: -spacing.md,
    marginRight: -spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: "rgba(255,255,255,0.08)",
    padding: spacing.lg,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { color: COLORS.white, fontSize: 15, fontWeight: "900", textAlign: "center" },
  emptyText: { color: "rgba(255,255,255,0.76)", fontSize: 12, fontWeight: "700", textAlign: "center", lineHeight: 18 },
});
