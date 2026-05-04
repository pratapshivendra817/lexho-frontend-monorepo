import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import { Button, Card, Snackbar, Text, TextInput } from "react-native-paper";
import { z } from "zod";
import { applyCoupon, getCoupons } from "../../api/couponApi";
import { EmptyStateCard } from "../../components/common/EmptyStateCard";
import { SkeletonList } from "../../components/common/SkeletonList";

const schema = z.object({ code: z.string().min(3, "Enter valid coupon code") });
type Form = z.infer<typeof schema>;

export function CouponScreen() {
  const { control, handleSubmit, formState: { errors } } = useForm<Form>({ defaultValues: { code: "" }, resolver: zodResolver(schema) });
  const coupons = useQuery<any>({ queryKey: ["coupons"], queryFn: getCoupons });
  const apply = useMutation({ mutationFn: ({ code }: Form) => applyCoupon({ code }) });
  const items = coupons.data?.data ?? coupons.data ?? [];

  return (
    <View style={styles.root}>
      <Card style={styles.card}>
        <Card.Title title="Apply Coupon" />
        <Card.Content style={styles.form}>
          <Controller control={control} name="code" render={({ field: { value, onChange } }) => <TextInput mode="outlined" label="Coupon code" value={value} onChangeText={onChange} autoCapitalize="characters" />} />
          {errors.code ? <Text style={styles.err}>{errors.code.message}</Text> : null}
          <Button mode="contained" onPress={handleSubmit((v) => apply.mutate(v))} loading={apply.isPending}>Apply Coupon</Button>
        </Card.Content>
      </Card>

      {coupons.isLoading ? <SkeletonList rows={3} /> : null}
      {!coupons.isLoading && (!Array.isArray(items) || items.length === 0) ? <EmptyStateCard title="No coupons" subtitle="New offers will appear here." /> : null}
      {Array.isArray(items) ? items.slice(0, 8).map((item: any, idx: number) => (
        <Card key={String(item?.id ?? idx)} style={styles.item}><Card.Content><Text style={styles.code}>{item?.code ?? "COUPON"}</Text><Text>{item?.description ?? "Discount available"}</Text></Card.Content></Card>
      )) : null}

      <Snackbar visible={apply.isError} onDismiss={() => apply.reset()}>{apply.error instanceof Error ? apply.error.message : "Failed to apply coupon"}</Snackbar>
      <Snackbar visible={apply.isSuccess} onDismiss={() => apply.reset()}>Coupon applied</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, padding: 16, gap: 10 }, card: { borderRadius: 16 }, form: { gap: 8 }, item: { borderRadius: 12 }, code: { fontWeight: "800" }, err: { color: "#DC2626" } });
