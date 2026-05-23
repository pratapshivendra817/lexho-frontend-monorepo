import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import MaterialCommunityIcon from "react-native-vector-icons/MaterialCommunityIcons";
import { Text } from "react-native-paper";
import { palette, spacing } from "../../constants/theme";
import type { SlotOption } from "../../types/contracts";

type TimePickerProps = {
  value: string | null;
  onChange: (isoTime: string | null) => void;
  loadSlots?: (date: string) => Promise<SlotOption[]>;
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
  const isoMatch = clean.match(/T(\d{1,2}:\d{2})/);
  if (isoMatch?.[1]) return isoMatch[1];
  const timeMatch = clean.match(/\b(\d{1,2}:\d{2})\b/);
  if (timeMatch?.[1]) return timeMatch[1];
  if (clean.includes("-")) return clean.split("-")[0]?.trim() ?? "";
  return clean;
}

function normalizeTo24Hour(timeLike: string) {
  const value = String(timeLike || "").trim().toUpperCase();
  if (!value) return "";
  const meridiemMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/.exec(value);
  if (meridiemMatch) {
    let hh = Number(meridiemMatch[1]);
    const mm = meridiemMatch[2];
    const meridiem = meridiemMatch[3];
    if (meridiem === "AM" && hh === 12) hh = 0;
    if (meridiem === "PM" && hh < 12) hh += 12;
    return `${String(hh).padStart(2, "0")}:${mm}`;
  }
  const twentyFourMatch = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (twentyFourMatch) {
    const hh = Number(twentyFourMatch[1]);
    const mm = Number(twentyFourMatch[2]);
    if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return "";
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  return "";
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

function toPreviewDateLabel(dateKey: string) {
  const dt = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(dt.getTime())) return dateKey;
  return dt.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function parseScheduledValue(input?: string | null) {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  const localMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (localMatch) {
    const y = Number(localMatch[1]);
    const m = Number(localMatch[2]) - 1;
    const d = Number(localMatch[3]);
    const hh = Number(localMatch[4]);
    const mm = Number(localMatch[5]);
    const ss = Number(localMatch[6] ?? 0);
    const dt = new Date(y, m, d, hh, mm, ss, 0);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toLocalDateTimeString(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
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
  const [slots, setSlots] = useState<SlotOption[]>([]);
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
    const parsed = parseScheduledValue(value);
    if (!parsed) return;
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
    return slots.filter((raw) => {
      const rawSlot = String(raw?.slot ?? "").trim();
      const startTime = normalizeTo24Hour(toStartTime(rawSlot));
      if (!startTime) return false;
      if (raw?.available === false) return false;
      if (selectedDate !== today) return true;
      const t = new Date(`${selectedDate}T${startTime}:00`);
      return Number.isFinite(t.getTime()) && t.getTime() > now.getTime();
    });
  }, [selectedDate, slots]);

  useEffect(() => {
    const normalizedVisible = visibleSlots
      .map((row) => normalizeTo24Hour(toStartTime(String(row?.slot ?? ""))))
      .filter(Boolean);
    if (normalizedVisible.length === 0) {
      if (selectedSlot) setSelectedSlot("");
      return;
    }
    if (!selectedSlot || !normalizedVisible.includes(selectedSlot)) {
      setSelectedSlot(normalizedVisible[0]);
    }
  }, [selectedSlot, visibleSlots]);

  const canConfirm = useMemo(() => {
    if (!selectedDate || !selectedSlot) return false;
    return visibleSlots.some((row) => normalizeTo24Hour(toStartTime(String(row?.slot ?? ""))) === selectedSlot);
  }, [selectedDate, selectedSlot, visibleSlots]);

  const handleConfirm = () => {
    if (!canConfirm) return;
    const scheduled = new Date(`${selectedDate}T${selectedSlot}:00`);
    if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
      onChange(null);
      setOpen(false);
      return;
    }
    onChange(toLocalDateTimeString(scheduled));
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      {!hideTrigger ? (
        <Pressable style={styles.launchBtn} onPress={() => setOpen(true)}>
          <Text style={styles.launchText}>{value ? (parseScheduledValue(value)?.toLocaleString() ?? "Select time slot") : "Select time slot"}</Text>
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
                  <Pressable
                    key={tab.key}
                    style={[styles.dateTab, active && styles.dateTabActive]}
                    onPress={() => {
                      setSelectedDate(tab.key);
                      setSelectedSlot("");
                    }}
                  >
                    <Text style={[styles.dateTabLabel, active && styles.dateTabLabelActive]}>{tab.label}</Text>
                    <Text style={[styles.dateTabHint, active && styles.dateTabHintActive]}>{tab.hint}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.livePreviewBar}>
              <Text style={styles.livePreviewText}>
                {selectedSlot
                  ? `Selected (pending): ${toPreviewDateLabel(selectedDate)}, ${format12Hour(selectedSlot)}`
                  : `Selected (pending): ${toPreviewDateLabel(selectedDate)} (choose a slot)`}
              </Text>
            </View>

            <ScrollView style={styles.gridScroll} contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
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
                ? visibleSlots.map((slotRow) => {
                    const rawSlot = String(slotRow?.slot ?? "").trim();
                    const start = normalizeTo24Hour(toStartTime(rawSlot));
                    if (!start) return null;
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
                        {slotRow?.etaMinutes != null ? <Text style={styles.slotMeta}>{`ETA ${slotRow.etaMinutes}m`}</Text> : null}
                        {slotRow?.instantEligible ? <Text style={styles.instantBadge}>Instant</Text> : null}
                      </Pressable>
                    );
                  })
                : null}
            </ScrollView>

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
  livePreviewBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  livePreviewText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    minHeight: 150,
  },
  gridScroll: {
    maxHeight: 360,
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
  slotMeta: { color: palette.muted, fontSize: 10, fontWeight: "700", marginTop: 4 },
  instantBadge: {
    marginTop: 5,
    color: palette.successText,
    fontSize: 10,
    fontWeight: "800",
    backgroundColor: palette.successSoft,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: "hidden",
  },
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
