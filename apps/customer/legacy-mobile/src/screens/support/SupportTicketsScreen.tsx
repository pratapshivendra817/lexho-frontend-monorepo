import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Card, Snackbar, Text, TextInput } from "react-native-paper";
import { z } from "zod";
import { createSupportTicket, getSupportHistory } from "../../api/supportApi";
import { EmptyStateCard } from "../../components/common/EmptyStateCard";
import { SkeletonList } from "../../components/common/SkeletonList";

const schema = z.object({
  subject: z.string().min(3, "Subject required"),
  message: z.string().min(8, "Message must be detailed"),
});

type Form = z.infer<typeof schema>;

export function SupportTicketsScreen() {
  const { control, handleSubmit, reset, formState: { errors } } = useForm<Form>({
    defaultValues: { subject: "Support", message: "" },
    resolver: zodResolver(schema),
  });

  const history = useQuery<any>({ queryKey: ["support-history"], queryFn: getSupportHistory });
  const create = useMutation({
    mutationFn: (values: Form) => createSupportTicket(values),
    onSuccess: () => {
      reset({ subject: "Support", message: "" });
      void history.refetch();
    },
  });

  const tickets = history.data?.data ?? history.data ?? [];

  return (
    <View style={styles.root}>
      <Card style={styles.card}>
        <Card.Title title="Create Support Ticket" />
        <Card.Content style={styles.form}>
          <Controller control={control} name="subject" render={({ field: { value, onChange } }) => <TextInput mode="outlined" label="Subject" value={value} onChangeText={onChange} />} />
          {errors.subject ? <Text style={styles.err}>{errors.subject.message}</Text> : null}
          <Controller control={control} name="message" render={({ field: { value, onChange } }) => <TextInput mode="outlined" label="Message" multiline value={value} onChangeText={onChange} />} />
          {errors.message ? <Text style={styles.err}>{errors.message.message}</Text> : null}
          <Button mode="contained" onPress={handleSubmit((v) => create.mutate(v))} loading={create.isPending}>Submit</Button>
        </Card.Content>
      </Card>

      {history.isLoading ? <SkeletonList rows={3} /> : null}
      {!history.isLoading && (!Array.isArray(tickets) || tickets.length === 0) ? <EmptyStateCard title="No tickets yet" subtitle="Create a support request and track status here." /> : null}
      {Array.isArray(tickets) ? (
        <FlatList
          data={tickets}
          keyExtractor={(item, idx) => String(item?.id ?? idx)}
          renderItem={({ item }) => (
            <Card style={styles.ticket}><Card.Content><Text style={styles.title}>{item?.subject ?? "Support"}</Text><Text>{item?.message ?? ""}</Text><Text style={styles.status}>Status: {item?.status ?? "OPEN"}</Text></Card.Content></Card>
          )}
        />
      ) : null}

      <Snackbar visible={create.isError} onDismiss={() => create.reset()}>{create.error instanceof Error ? create.error.message : "Failed to create ticket"}</Snackbar>
      <Snackbar visible={create.isSuccess} onDismiss={() => create.reset()}>Ticket created</Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, padding: 16, gap: 10 }, card: { borderRadius: 16 }, form: { gap: 8 }, ticket: { marginBottom: 10, borderRadius: 12 }, title: { fontWeight: "700" }, status: { marginTop: 4, color: "#475569" }, err: { color: "#DC2626" } });
