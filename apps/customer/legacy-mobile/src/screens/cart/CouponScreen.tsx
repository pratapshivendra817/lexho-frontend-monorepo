import { useQuery } from "@tanstack/react-query";
import { StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import { getCoupons } from "../../api/couponApi";
import { EmptyStateCard } from "../../components/common/EmptyStateCard";
import { SkeletonList } from "../../components/common/SkeletonList";
import { palette } from "../../constants/theme";
import { COLORS } from "../../theme/colors";
import type { CouponDto } from "../../types/contracts";

function couponStatus(coupon: CouponDto) {
  if (coupon.active === false) return "Inactive";
  if (coupon.validUntil && new Date(coupon.validUntil).getTime() < Date.now()) return "Expired";
  if (coupon.totalUsageLimit != null && Number(coupon.usedCount ?? 0) >= Number(coupon.totalUsageLimit)) return "Used";
  return "Available";
}

function couponDescription(coupon: CouponDto) {
  const value = Number(coupon.discountValue ?? coupon.discount ?? 0);
  const amount = coupon.discountType === "PERCENTAGE" ? `${value}% off` : `INR ${value.toFixed(2)} off`;
  return coupon.minimumPurchaseAmount && Number(coupon.minimumPurchaseAmount) > 0
    ? `${amount} on orders above INR ${Number(coupon.minimumPurchaseAmount).toFixed(2)}`
    : amount;
}

export function CouponScreen() {
  const coupons = useQuery<CouponDto[]>({ queryKey: ["coupons"], queryFn: () => getCoupons() });
  const items = coupons.data ?? [];

  return (
    <View style={styles.root}>
      <Card style={styles.card}>
        <Card.Title title="My Reward Coupons" subtitle="Apply a coupon from checkout. Final eligibility is verified by backend." />
      </Card>
      {coupons.isLoading ? <SkeletonList rows={3} /> : null}
      {!coupons.isLoading && items.length === 0 ? <EmptyStateCard title="No coupons" subtitle="New offers will appear here." /> : null}
      {items.slice(0, 20).map(coupon => (
        <Card key={String(coupon.id ?? coupon.code)} style={styles.item}>
          <Card.Content style={styles.itemContent}>
            <View style={styles.itemDetails}>
              <Text style={styles.code}>{coupon.code}</Text>
              <Text style={styles.itemText}>{couponDescription(coupon)}</Text>
              <Text style={styles.itemText}>{coupon.applicableBookingType ? `For ${coupon.applicableBookingType.toLowerCase()} bookings` : "Valid for eligible bookings"}</Text>
            </View>
            <Text style={styles.status}>{couponStatus(coupon)}</Text>
          </Card.Content>
        </Card>
      ))}
      {coupons.isError ? <Text style={styles.error}>{coupons.error instanceof Error ? coupons.error.message : "Unable to load coupons"}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, gap: 10, backgroundColor: palette.bg },
  card: { borderRadius: 16, backgroundColor: COLORS.navyDark, borderWidth: 1, borderColor: COLORS.goldSoft },
  item: { borderRadius: 12, backgroundColor: COLORS.navy, borderWidth: 1, borderColor: "rgba(224,169,75,0.28)" },
  itemContent: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  itemDetails: { flex: 1, gap: 4 },
  code: { fontWeight: "800", color: COLORS.white, fontSize: 16 },
  itemText: { color: COLORS.neutral100, lineHeight: 18 },
  status: { color: COLORS.goldSoft, fontWeight: "800", fontSize: 12 },
  error: { color: COLORS.danger },
});
