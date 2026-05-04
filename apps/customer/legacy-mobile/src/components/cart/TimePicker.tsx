import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Text } from "react-native-paper";
import { palette, spacing } from "../../constants/theme";

type TimePickerProps = {
  value: string | null;
  onChange: (isoTime: string | null) => void;
  loadSlots?: (date: string) => Promise<string[]>;
  showError?: boolean;
  openRequestKey?: number;
  hideTrigger?: boolean;
  infoText?: string;
  dateWindowDays?: number;
};

function toLocalDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateLabel(date: Date) {
  const day = date.getDate();
  const month = date.toLocaleString(undefined, { month: "short" });
  return `${day} ${month}`;
}

function getDayHint(offset: number) {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  return new Date(Date.now() + offset * 86400000).toLocaleDateString(undefined, { weekday: "long" });
}

function toStartTime(slotValue: string) {
  const clean = String(slotValue || "").trim();
  if (!clean) return "";
  if (clean.includes("-")) return clean.split("-")[0]?.trim() ?? "";
  return clean;
}

function format12Hour(time24: string) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time24);
  if (!match) return time24;
  const hh = Number(match[1]);
  const mm = match[2];
  const suffix = hh >= 12 ? "PM" : "AM";
  const h12 = hh % 12 || 12;
  return `${h12}:${mm} ${suffix}`;
}

export function TimePicker({
  value,
  onChange,
  loadSlots,
  showError = false,
  openRequestKey = 0,
  hideTrigger = false,
  infoText = "",
  dateWindowDays = 4,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(toLocalDateInput(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotLoadError, setSlotLoadError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  const dateTabs = useMemo(
    () =>
      Array.from({ length: Math.max(1, Number(dateWindowDays) || 1) }, (_, offset) => {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        return {
          key: toLocalDateInput(date),
          label: formatDateLabel(date),
          hint: getDayHint(offset),
        };
      }),
    [dateWindowDays],
  );

  useEffect(() => {
    if (!value) return;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return;
    setSelectedDate(toLocalDateInput(parsed));
    setSelectedSlot(`${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`);
  }, [value]);

  useEffect(() => {
    let active = true;
    if (!loadSlots || !selectedDate) {
      setSlots([]);
      setSlotLoadError(null);
      return;
    }
    setLoadingSlots(true);
    setSlotLoadError(null);
    loadSlots(selectedDate)
      .then((rows) => {
        if (!active) return;
        setSlots(Array.isArray(rows) ? rows.filter(Boolean) : []);
      })
      .catch(() => {
        if (!active) return;
        setSlots([]);
        setSlotLoadError("Unable to load slots. Please retry.");
      })
      .finally(() => {
        if (!active) return;
        setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [loadSlots, reloadNonce, selectedDate]);

  useEffect(() => {
    if (openRequestKey > 0) setOpen(true);
  }, [openRequestKey]);

  const visibleSlots = useMemo(() => {
    const now = new Date();
    const today = toLocalDateInput(now);
    return slots.filter((rawSlot) => {
      const startTime = toStartTime(rawSlot);
      if (!startTime) return false;
      if (selectedDate !== today) return true;
      const t = new Date(`${selectedDate}T${startTime}:00`);
      return Number.isFinite(t.getTime()) && t.getTime() > now.getTime();
    });
  }, [selectedDate, slots]);

  const canConfirm = Boolean(selectedDate && selectedSlot);

  const handleConfirm = () => {
    if (!canConfirm) return;
    const scheduled = new Date(`${selectedDate}T${selectedSlot}:00`);
    if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
      onChange(null);
      setOpen(false);
      return;
    }
    onChange(scheduled.toISOString());
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      {!hideTrigger ? (
        <Pressable style={styles.launchBtn} onPress={() => setOpen(true)}>
          <Text style={styles.launchText}>{value ? new Date(value).toLocaleString() : "Select time slot"}</Text>
        </Pressable>
      ) : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Pressable style={styles.backdropTapArea} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select start time of service</Text>
              <Pressable onPress={() => setOpen(false)} style={styles.closeBtn}>
                <MaterialCommunityIcon name="close" size={22} color={palette.iconSoft} />
              </Pressable>
            </View>

            <View style={styles.dateTabs}>
              {dateTabs.map((tab) => {
                const active = selectedDate === tab.key;
                return (
                  <Pressable key={tab.key} style={[styles.dateTab, active && styles.dateTabActive]} onPress={() => setSelectedDate(tab.key)}>
                    <Text style={[styles.dateTabLabel, active && styles.dateTabLabelActive]}>{tab.label}</Text>
                    <Text style={[styles.dateTabHint, active && styles.dateTabHintActive]}>{tab.hint}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.grid}>
              {loadingSlots ? <Text style={styles.stateText}>Loading slots...</Text> : null}
              {!loadingSlots && slotLoadError ? (
                <View style={styles.stateWrap}>
                  <Text style={styles.stateText}>{slotLoadError}</Text>
                  <Pressable
                    style={styles.retryBtn}
                    onPress={() => {
                      setReloadNonce((v) => v + 1);
                      setSlotLoadError(null);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading slots"
                  >
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              ) : null}
              {!loadingSlots && visibleSlots.length === 0 ? <Text style={styles.stateText}>No available slots for selected date.</Text> : null}
              {!loadingSlots && !slotLoadError
                ? visibleSlots.map((rawSlot) => {
                    const start = toStartTime(rawSlot);
                    const active = selectedSlot === start;
                    return (
                      <Pressable
                        key={`${selectedDate}-${rawSlot}`}
                        style={[styles.slotBtn, active && styles.slotBtnActive]}
                        onPress={() => setSelectedSlot(start)}
                        accessibilityRole="button"
                        accessibilityLabel={`Select slot ${format12Hour(start)}`}
                      >
                        <Text style={[styles.slotText, active && styles.slotTextActive]}>{format12Hour(start)}</Text>
                      </Pressable>
                    );
                  })
                : null}
            </View>

            {infoText ? (
              <View style={styles.infoBar}>
                <Text style={styles.infoText}>{infoText}</Text>
              </View>
            ) : null}

            <Pressable
              style={[styles.confirmBtn, !canConfirm && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!canConfirm}
              accessibilityRole="button"
              accessibilityLabel="Confirm selected time slot"
            >
              <Text style={styles.confirmText}>Confirm</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {showError && !value ? <Text style={styles.error}>Please choose a future date & slot.</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  launchBtn: {
    borderWidth: 1,
    borderColor: palette.borderSoft,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: palette.card,
  },
  launchText: { color: palette.text, fontWeight: "700" },
  backdrop: { flex: 1, backgroundColor: palette.overlayDark40, justifyContent: "flex-end" },
  backdropTapArea: { flex: 1 },
  sheet: {
    backgroundColor: palette.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    maxHeight: "82%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  sheetTitle: { fontSize: 18, color: palette.text, fontWeight: "900" },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surfaceAlt,
  },
  dateTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.bg,
  },
  dateTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  dateTabActive: { borderBottomColor: palette.successAlt },
  dateTabLabel: { fontSize: 15, color: palette.muted, fontWeight: "900" },
  dateTabLabelActive: { color: palette.text },
  dateTabHint: { fontSize: 11, color: palette.muted, marginTop: 2, fontWeight: "700" },
  dateTabHintActive: { color: palette.successAlt },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    minHeight: 150,
  },
  slotBtn: {
    width: "31%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.card,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  slotBtnActive: {
    borderColor: palette.success,
    backgroundColor: palette.successSoft,
    shadowOpacity: 0.1,
    elevation: 2,
  },
  slotText: { color: palette.muted, fontWeight: "800", fontSize: 16 },
  slotTextActive: { color: palette.successText },
  stateText: { width: "100%", textAlign: "center", color: palette.muted, fontWeight: "600", paddingVertical: 20 },
  stateWrap: { width: "100%", alignItems: "center", paddingVertical: 10 },
  retryBtn: {
    marginTop: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: palette.borderSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: palette.card,
  },
  retryText: { color: palette.primaryDark, fontWeight: "800", fontSize: 12 },
  infoBar: {
    backgroundColor: palette.successTint,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  infoText: { color: palette.text, fontSize: 12, fontWeight: "700", textAlign: "center" },
  confirmBtn: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: palette.success,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    shadowColor: palette.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 3,
  },
  confirmBtnDisabled: {
    backgroundColor: "#D1D5DB",
  },
  confirmText: { color: palette.white, fontSize: 18, fontWeight: "900" },
  error: { color: palette.danger, fontSize: 11, fontWeight: "600" },
});
