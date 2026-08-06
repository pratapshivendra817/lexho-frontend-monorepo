import React, { useEffect, useMemo, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { Modal, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useAppSelector } from "../../hooks/useRedux";

import { COLORS } from "../../constants/colors";
import { useShiftController } from "../../features/shift/useShiftController";

export default function ShiftScreen() {
  const isOnline = useAppSelector((s) => s.partner.online);
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);
  const [shiftDate, setShiftDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<Date>(() => {
    const now = new Date();
    now.setHours(9, 0, 0, 0);
    return now;
  });
  const [endTime, setEndTime] = useState<Date>(() => {
    const now = new Date();
    now.setHours(18, 0, 0, 0);
    return now;
  });
  const [pickerMode, setPickerMode] = useState<"date" | "time" | null>(null);
  const [pickerTarget, setPickerTarget] = useState<"shiftDate" | "startTime" | "endTime" | null>(null);
  const [showLocationAssistModal, setShowLocationAssistModal] = useState(false);
  const {
    state,
    history,
    historyLoading,
    historyError,
    loading,
    error,
    lastLocationSentAt,
    dispatchConfig,
    startShift,
    endShift,
    refetchHistory,
  } = useShiftController();

  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const shiftSeconds = useMemo(() => {
    if (!state.shiftStarted || !state.startedAt) return 0;
    const now = Date.now() + tick * 0;
    return Math.max(0, Math.floor((now - state.startedAt) / 1000));
  }, [state.shiftStarted, state.startedAt, tick]);

  const shiftLabel = state.shiftStarted ? "Shift Running" : "Shift Not Started";
  const timerText = formatDuration(shiftSeconds);
  const pickerValue = pickerTarget === "shiftDate" ? shiftDate : pickerTarget === "startTime" ? startTime : endTime;
  const isScheduleValid = useMemo(() => {
    const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
    const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
    return endMinutes > startMinutes;
  }, [startTime, endTime]);
  const scheduleChanged = useMemo(() => {
    const defaultStart = new Date();
    defaultStart.setHours(9, 0, 0, 0);
    const defaultEnd = new Date();
    defaultEnd.setHours(18, 0, 0, 0);
    return (
      formatDate(shiftDate) !== formatDate(new Date()) ||
      formatTime(startTime) !== formatTime(defaultStart) ||
      formatTime(endTime) !== formatTime(defaultEnd)
    );
  }, [endTime, shiftDate, startTime]);

  const onChangePicker = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    if (!selectedDate || !pickerTarget) {
      setPickerMode(null);
      setPickerTarget(null);
      return;
    }
    if (pickerTarget === "shiftDate") setShiftDate(selectedDate);
    if (pickerTarget === "startTime") setStartTime(selectedDate);
    if (pickerTarget === "endTime") setEndTime(selectedDate);
    setPickerMode(null);
    setPickerTarget(null);
  };

  const openGpsSettings = async () => {
    try {
      if (Platform.OS === "android") {
        await Linking.sendIntent("android.settings.LOCATION_SOURCE_SETTINGS");
        return;
      }
      await Linking.openURL("App-Prefs:Privacy&path=LOCATION");
    } catch {
      await Linking.openSettings();
    }
  };

  useEffect(() => {
    const lowered = error.toLowerCase();
    if (lowered.includes("permission denied") || lowered.includes("gps is turned off")) {
      setShowLocationAssistModal(true);
    }
  }, [error]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            try {
              await refetchHistory();
            } finally {
              setRefreshing(false);
            }
          }}
        />
      }
    >
      <Text style={styles.title}>Shift Management</Text>
      <Text style={styles.subtitle}>{shiftLabel}</Text>
      <View style={styles.stepperCard}>
        <Text style={styles.stepperTitle}>Quick Flow</Text>
        <View style={styles.stepperRow}>
          <StepChip label="1. Go Online" done={isOnline} />
          <Text style={styles.stepArrow}>→</Text>
          <StepChip label="2. Select Schedule" done={scheduleChanged && isScheduleValid} />
          <Text style={styles.stepArrow}>→</Text>
          <StepChip label="3. Start Shift" done={state.shiftStarted} />
        </View>
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Shift Schedule</Text>
        <View style={styles.scheduleRow}>
          <Text style={styles.scheduleLabel}>Date</Text>
          <TouchableOpacity
            testID="shift-date-button"
            style={styles.scheduleBtn}
            onPress={() => {
              setPickerTarget("shiftDate");
              setPickerMode("date");
            }}
          >
            <Text style={styles.scheduleBtnText}>{formatDate(shiftDate)}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.scheduleRow}>
          <Text style={styles.scheduleLabel}>Start Time</Text>
          <TouchableOpacity
            testID="shift-start-time-button"
            style={styles.scheduleBtn}
            onPress={() => {
              setPickerTarget("startTime");
              setPickerMode("time");
            }}
          >
            <Text style={styles.scheduleBtnText}>{formatTime(startTime)}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.scheduleRow}>
          <Text style={styles.scheduleLabel}>End Time</Text>
          <TouchableOpacity
            testID="shift-end-time-button"
            style={styles.scheduleBtn}
            onPress={() => {
              setPickerTarget("endTime");
              setPickerMode("time");
            }}
          >
            <Text style={styles.scheduleBtnText}>{formatTime(endTime)}</Text>
          </TouchableOpacity>
        </View>
        {state.shiftStarted ? <Text style={styles.timer}>{timerText}</Text> : null}
      </View>

      {pickerMode ? (
        <DateTimePicker
          mode={pickerMode}
          value={pickerValue}
          is24Hour
          display="default"
          onChange={onChangePicker}
        />
      ) : null}

      {!state.shiftStarted ? (
        <Text style={styles.hintText}>Live Location will enable after Shift is started and Online is ON from Home.</Text>
      ) : null}
      {lastLocationSentAt ? (
        <Text style={styles.hintText}>Last location updated: {new Date(lastLocationSentAt).toLocaleTimeString()}</Text>
      ) : null}
      {dispatchConfig ? (
        <Text style={styles.hintText}>
          Tracking interval: {dispatchConfig.foregroundTrackingIntervalSeconds}s foreground, {dispatchConfig.backgroundTrackingIntervalSeconds}s background
        </Text>
      ) : null}
      {!isScheduleValid ? (
        <Text style={styles.errorText}>Invalid schedule: End Time must be greater than Start Time.</Text>
      ) : null}

      {!state.shiftStarted ? (
        <TouchableOpacity
          testID="shift-primary-action"
          style={styles.startBtn}
          disabled={loading}
          onPress={() => {
            if (!isScheduleValid) {
              Alert.alert("Invalid shift timing", "End time should be greater than start time.");
              return;
            }
            startShift({
              shiftDate: formatDate(shiftDate),
              startTime: formatTime(startTime),
              endTime: formatTime(endTime),
            }).catch(() => null);
          }}
        >
          <Text style={styles.btnText}>Start Shift</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity testID="shift-primary-action" style={styles.endBtn} disabled={loading} onPress={() => endShift().catch(() => null)}>
          <Text style={styles.btnText}>End Shift</Text>
        </TouchableOpacity>
      )}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            testID="shift-error-action"
            style={styles.retryBtn}
            onPress={() => {
              if (error.toLowerCase().includes("gps") || error.toLowerCase().includes("location")) {
                openGpsSettings().catch(() => null);
                return;
              }
              refetchHistory();
            }}
          >
            <Text style={styles.retryText}>{error.toLowerCase().includes("gps") || error.toLowerCase().includes("location") ? "Open Settings" : "Retry"}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.historySection}>
        <Text style={styles.historyTitle}>Shift History</Text>
        {historyLoading ? (
          <View style={styles.skeleton} />
        ) : historyError ? (
          <Text style={styles.metaText}>{historyError}</Text>
        ) : history.length === 0 ? (
          <Text style={styles.metaText}>No shift history yet.</Text>
        ) : (
          history.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              {typeof item.online === "boolean" ? (
                <Text style={styles.historyText}>Online: {item.online ? "true" : "false"}</Text>
              ) : null}
              {item.shiftStart ? <Text style={styles.historyText}>Shift Start: {item.shiftStart}</Text> : null}
              {item.shiftEnd ? <Text style={styles.historyText}>Shift End: {item.shiftEnd}</Text> : null}
              {item.updatedAt ? <Text style={styles.historyText}>Updated At: {item.updatedAt}</Text> : null}
              {typeof item.maxActiveJobs === "number" && item.maxActiveJobs > 0 ? (
                <Text style={styles.historyText}>Max Active Jobs: {item.maxActiveJobs}</Text>
              ) : null}
              <Text style={styles.historyText}>Start: {new Date(item.startedAt).toLocaleString()}</Text>
              <Text style={styles.historyText}>End: {new Date(item.endedAt).toLocaleString()}</Text>
              <Text style={styles.historyText}>Duration: {formatDuration(item.durationSeconds)}</Text>
            </View>
          ))
        )}
      </View>

      <Modal visible={showLocationAssistModal} transparent animationType="fade" onRequestClose={() => setShowLocationAssistModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>For a better experience, your device will need to use Location Accuracy</Text>
            <Text style={styles.modalSubTitle}>The following settings should be on:</Text>
            <Text style={styles.modalBullet}>- Device location</Text>
            <Text style={styles.modalBullet}>
              - Location Accuracy, which provides more accurate location for apps and services.
            </Text>
            <Text style={styles.modalDescription}>You can change this at any time in Settings.</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity testID="shift-modal-dismiss-button" style={styles.modalGhostBtn} onPress={() => setShowLocationAssistModal(false)}>
                <Text style={styles.modalGhostText}>No, thanks</Text>
              </TouchableOpacity>
              <TouchableOpacity
                testID="shift-modal-open-settings-button"
                style={styles.modalPrimaryBtn}
                onPress={async () => {
                  setShowLocationAssistModal(false);
                  await openGpsSettings();
                }}
              >
                <Text style={styles.modalPrimaryText}>Turn on</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function StepChip({ label, done }: { label: string; done: boolean }) {
  return (
    <View style={[styles.stepChip, done ? styles.stepChipDone : styles.stepChipPending]}>
      <Text style={[styles.stepChipText, done ? styles.stepChipTextDone : styles.stepChipTextPending]}>{label}</Text>
    </View>
  );
}

function formatDate(value: Date) {
  const yyyy = value.getFullYear();
  const mm = String(value.getMonth() + 1).padStart(2, "0");
  const dd = String(value.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatTime(value: Date) {
  const hh = String(value.getHours()).padStart(2, "0");
  const mm = String(value.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatDuration(seconds: number) {
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 10 },
  title: { color: COLORS.textPrimary, fontSize: 24, fontWeight: "800" },
  subtitle: { color: COLORS.textSecondary, marginBottom: 4 },
  stepperCard: {
    marginHorizontal: -16,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  stepperTitle: { color: COLORS.textSecondary, fontSize: 12, textTransform: "uppercase", fontWeight: "700" },
  stepperRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  stepChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  stepChipDone: { backgroundColor: "rgba(46, 204, 113, 0.16)", borderColor: "#2ECC71" },
  stepChipPending: { backgroundColor: COLORS.surfaceSoft, borderColor: COLORS.border },
  stepChipText: { fontSize: 11, fontWeight: "700" },
  stepChipTextDone: { color: "#B5F5CF" },
  stepChipTextPending: { color: COLORS.textSecondary },
  stepArrow: { color: COLORS.textSecondary, fontWeight: "800" },
  statusCard: {
    marginHorizontal: -16,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  statusLabel: { color: COLORS.textSecondary, fontSize: 12, textTransform: "uppercase", fontWeight: "700" },
  scheduleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  scheduleLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: "700" },
  scheduleBtn: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceSoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scheduleBtnText: { color: COLORS.textPrimary, fontWeight: "700", fontSize: 12 },
  timer: { color: COLORS.textPrimary, fontSize: 26, fontWeight: "800", letterSpacing: 1 },
  startBtn: {
    marginTop: 8,
    marginHorizontal: -16,
    borderRadius: 12,
    backgroundColor: COLORS.success,
    paddingVertical: 13,
    alignItems: "center",
  },
  endBtn: {
    marginTop: 8,
    marginHorizontal: -16,
    borderRadius: 12,
    backgroundColor: COLORS.danger,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnText: { color: COLORS.white, fontWeight: "800" },
  errorCard: {
    marginTop: 4,
    marginHorizontal: -16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: "rgba(220,53,69,0.08)",
    padding: 12,
    gap: 8,
  },
  errorText: { color: COLORS.danger },
  retryBtn: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: COLORS.surfaceElevated },
  retryText: { color: COLORS.textPrimary, fontWeight: "700" },
  historySection: { marginTop: 8, marginHorizontal: -16, gap: 8 },
  historyTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: "800", marginHorizontal: 16 },
  historyCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  historyText: { color: COLORS.textSecondary, fontSize: 12 },
  metaText: { color: COLORS.textSecondary, marginHorizontal: 16 },
  skeleton: { height: 80, borderRadius: 12, backgroundColor: COLORS.surfaceSoft },
  hintText: { color: COLORS.textSecondary, fontSize: 12 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 10,
  },
  modalTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: "800", lineHeight: 24 },
  modalSubTitle: { color: COLORS.accent, fontSize: 15, fontWeight: "700", marginTop: 2 },
  modalBullet: { color: COLORS.textSecondary, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  modalDescription: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 2 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalGhostBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalGhostText: { color: COLORS.accent, fontWeight: "700", fontSize: 16 },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: COLORS.secondary,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  modalPrimaryText: { color: COLORS.background, fontWeight: "800", fontSize: 16 },
});
