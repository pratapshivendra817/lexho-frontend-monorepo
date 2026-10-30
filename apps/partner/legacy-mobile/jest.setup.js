const { jest: jestGlobals } = require("@jest/globals");

jestGlobals.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
jestGlobals.mock("react-native-vector-icons/MaterialCommunityIcons", () => "MaterialCommunityIcon");
jestGlobals.mock("react-native-sound", () => {
  const MockSound = function () {
    return { setNumberOfLoops: jestGlobals.fn(), setVolume: jestGlobals.fn(), play: jestGlobals.fn(), stop: jestGlobals.fn(), release: jestGlobals.fn() };
  };
  MockSound.MAIN_BUNDLE = "MAIN_BUNDLE";
  MockSound.setCategory = jestGlobals.fn();
  return { __esModule: true, default: MockSound };
});
jestGlobals.mock("react-native-geolocation-service", () => ({
  requestAuthorization: jestGlobals.fn(async () => "granted"),
  getCurrentPosition: jestGlobals.fn(),
  watchPosition: jestGlobals.fn(() => 1),
  clearWatch: jestGlobals.fn(),
}));
jestGlobals.mock("react-native-image-picker", () => ({
  launchCamera: jestGlobals.fn(async () => ({ assets: [] })),
  launchImageLibrary: jestGlobals.fn(async () => ({ assets: [] })),
}));
jestGlobals.mock("@react-native-community/datetimepicker", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");

  return function MockDateTimePicker(props) {
    const nextValue =
      props.mode === "date"
        ? new Date(2026, 6, 10, 0, 0, 0, 0)
        : new Date(2026, 6, 10, 23, 30, 0, 0);

    return React.createElement(
      View,
      { testID: `picker-${props.mode}` },
      React.createElement(Text, null, props.mode),
      React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel: "Apply picker value",
          onPress: () => props.onChange({}, nextValue),
        },
        React.createElement(Text, null, "Apply picker"),
      ),
      React.createElement(
        TouchableOpacity,
        {
          accessibilityLabel: "Dismiss picker value",
          onPress: () => props.onChange({}, undefined),
        },
        React.createElement(Text, null, "Dismiss picker"),
      ),
    );
  };
});
jestGlobals.mock("@react-native-community/netinfo", () => ({
  addEventListener: jestGlobals.fn(() => jestGlobals.fn()),
  fetch: jestGlobals.fn(async () => ({ isConnected: true })),
}));
jestGlobals.mock("./src/context/AppLanguageContext", () => ({
  useAppLanguage: () => ({
    language: null,
    refreshLanguage: jestGlobals.fn(async () => undefined),
    t: jestGlobals.fn((key) => ({
      "common.back": "Go back",
      "common.action_required": "Action Required",
      "common.retry": "Retry",
      "common.loading": "Loading...",
      "common.done": "Done",
      "common.time": "Time",
      "common.title": "Title",
      "common.something_went_wrong": "Something went wrong",
      "common.remove": "Remove",
      "common.select_date": "Select date",
      "common.date": "DATE",
      "common.open_settings": "Open Settings",
      "common.no_thanks": "No, thanks",
      "common.turn_on": "Turn on",
      "common.currency_inr": "INR",
      "common.view_details": "View Details",
      "common.cancel": "Cancel",
      "common.no": "false",
      "common.yes": "true",
      "common.updated_at": "Updated At",
      "common.start": "Start",
      "common.end": "End",
      "common.success": "Success",
      "common.submitting": "Submitting...",
      "documents.required_core": "Aadhaar front, Aadhaar back and selfie are required",
      "documents.uploaded": "Documents uploaded successfully",
      "documents.upload_error": "Unable to upload documents",
      "documents.unsupported_image": "Unsupported image. Upload JPG, PNG, or WEBP.",
      "documents.file_too_large_5mb": "File too large. Maximum allowed size is 5 MB.",
      "documents.upload_cta": "Upload Documents",
      "documents.uploading": "Uploading...",
      "documents.upload_progress": "Upload Progress",
      "documents.no_file_selected": "No file selected",
      "documents.optional_suffix": "optional",
      "docs.aadhaar": "Aadhaar",
      "docs.pan": "PAN",
      "docs.selfie": "Selfie",
      "docs.certificate": "Certificate",
      "chat.camera": "Camera",
      "chat.gallery": "Gallery",
      "orders.customer": "Customer",
      "orders.address": "Address",
      "orders.category": "Category",
      "orders.sub_service": "Sub-service",
      "orders.estimated_time": "ETA",
      "orders.distance": "Distance",
      "orders.priority": "Priority",
      "orders.expires_in": "Expires in",
      "orders.expiry_warning": "This request is expiring soon. Accept only if you can reach on time.",
      "orders.sla": "SLA",
      "orders.payout": "Payout",
      "orders.booking_type": "Booking Type",
      "orders.promised_start": "Promised Start",
      "orders.accept": "Accept",
      "orders.reject": "Reject",
      "orders.title": "Order",
      "orders.booking_id": "Order ID",
      "orders.service": "Service",
      "orders.amount": "Amount",
      "orders.status": "Status",
      "orders.no_orders": "No new orders",
      "orders.empty_hint": "Make sure you are ONLINE and Shift is started.",
      "orders.share_accessibility_label": "Share order",
      "orders.share_title": "New Dispatch Request",
      "orders.reject_confirm_title": "Reject request",
      "orders.reject_reason_prompt": "Confirm rejection reason",
      "orders.reject_reason_unavailable": "Not available",
      "orders.history": "Order History",
      "orders.search_placeholder": "Search by customer/order id",
      "orders.address_unavailable": "Address unavailable",
      "orders.active_job": "Active Job",
      "orders.start_service": "Start Service",
      "orders.complete_service": "Complete Service",
      "orders.open_customer_location": "Open Customer Location",
      "orders.open_in_app_navigation": "Open In-App Navigation",
      "orders.service_started": "Service started.",
      "orders.service_completed": "Service completed.",
      "orders.start_error_title": "Unable to start service",
      "orders.complete_error_title": "Unable to complete service",
      "orders.details": "Order Details",
      "orders.call_customer": "Call Customer",
      "orders.created_at": "Created At",
      "profile.phone": "Phone",
      "bank.screen_title": "Bank Account",
      "bank.details": "Bank Details",
      "bank.no_account_linked": "No bank account linked",
      "bank.linked_account": "Linked Account",
      "bank.verification_label": "Verification",
      "bank.masking_hint": "Your account number is masked for security.",
      "bank.verification_pending_hint": "Verification is pending with our team.",
      "bank.account_number_placeholder": "Account Number",
      "bank.ifsc_placeholder": "IFSC Code",
      "bank.account_number_accessibility": "Account Number",
      "bank.ifsc_accessibility": "IFSC Code",
      "bank.add_title": "Add Bank Account",
      "bank.update_title": "Update Bank Account",
      "bank.save_title": "Save Bank Account",
      "bank.load_error": "Unable to load bank account",
      "bank.update_error": "Unable to update bank account",
      "bank.ifsc": "IFSC",
      "common.saving": "Saving...",
      "shift.not_started": "Shift Not Started",
      "shift.running": "Shift Running",
      "shift.management": "Shift Management",
      "shift.title": "Shift Management",
      "shift.quick_flow": "Quick Flow",
      "shift.step_go_online": "1. Go Online",
      "shift.step_select_schedule": "2. Select Schedule",
      "shift.step_start_shift": "3. Start Shift",
      "shift.started_at": "Started At",
      "shift.ended_at": "Ended At",
      "shift.live_location_hint": "Live Location will enable after Shift is started and Online is ON from Home.",
      "shift.start": "Start Shift",
      "shift.end": "End Shift",
      "shift.start_label": "Shift Start",
      "shift.end_label": "Shift End",
      "shift.history": "Shift History",
      "shift.no_history_yet": "No shift history yet.",
      "shift.last_location_updated": "Last Location Updated",
      "shift.tracking_interval": "Tracking Interval",
      "shift.foreground": "Foreground",
      "shift.background": "Background",
      "shift.invalid_schedule": "Invalid schedule: End Time must be greater than Start Time.",
      "shift.invalid_timing_title": "Invalid shift timing",
      "shift.invalid_timing_message": "End time should be greater than start time.",
      "shift.location_accuracy_title": "Location Accuracy",
      "shift.location_accuracy_subtitle": "Enable precise location",
      "shift.location_accuracy_description": "For a better experience, your device will need to use Location Accuracy",
      "shift.location_accuracy_bullet": "Use high accuracy mode",
      "shift.device_location": "Device Location",
      "shift.online": "Online",
      "shift.duration": "Duration",
      "shift.max_active_jobs": "Max Active Jobs",
      "notifications.empty": "No notifications",
      "notifications.fetch_error": "Unable to sync notifications",
      "notifications.unread": "Unread",
      "notifications.share_title": "Notification",
      "notifications.title_fallback": "Notification",
      "notifications.open_accessibility": "Open notification",
      "notifications.open_warning_accessibility": "Open warning notification",
      "notifications.share_accessibility": "Share notification",
      "earnings.title": "Earnings",
      "earnings.today": "Today",
      "earnings.this_week": "This Week",
      "earnings.this_month": "This Month",
      "earnings.subtitle_settled_income": "Settled income after commission and refund reversals",
      "earnings.available": "Available",
      "earnings.lifetime": "Lifetime",
      "earnings.recent_transactions": "Recent Transactions",
      "earnings.no_transactions_yet": "No earnings transactions yet.",
      "earnings.settlement": "Settlement",
      "earnings.load_error": "Unable to load earnings",
      "payouts.title": "Payout",
      "payouts.pending": "Pending",
      "payouts.request": "Request Withdrawal",
      "payouts.enter_amount": "Enter withdrawal amount",
      "payouts.history": "Withdrawal History",
      "payouts.status": "Status",
      "withdrawals.request_short": "Withdraw",
      "withdrawals.screen_title": "Withdrawals",
      "withdrawals.balance_hint": "Available balance already accounts for refund reversals and reserved withdrawals.",
      "withdrawals.available": "Available",
      "withdrawals.reserved": "Reserved",
      "withdrawals.settled_balance": "Settled balance",
      "withdrawals.amount_accessibility": "Withdrawal amount",
      "withdrawals.empty_history": "No withdrawal requests yet.",
      "withdrawals.row_title": "Withdrawal",
      "withdrawals.load_error": "Unable to load withdrawals",
      "withdrawals.request_error": "Unable to request withdrawal",
      "validation.invalid_otp": "Invalid OTP",
      "auth.send_otp": "OTP sent",
      "warnings.approved": "Approved",
      "warnings.rejected": "Rejected",
      "warnings.pending": "Pending",
      "warnings.under_review": "Under Review",
      "warnings.title": "Warnings",
      "support.title": "Support",
      "support.contact_us": "Contact Us",
      "support.call_support": "Call Support",
      "support.email_support": "Email Support",
      "support.subject": "Subject",
      "support.description": "Description",
      "support.create_ticket": "Create Ticket",
      "support.message": "Message",
      "support.ticket_created": "Support ticket created",
      "home.title": "Latest Offers From Admin",
      "home.performance": "Performance",
      "shift.offline": "OFFLINE",
      "shift.online": "ONLINE",
      "kyc.reupload_documents": "Re-upload Documents",
    }[key] ?? key)),
  }),
}));
jestGlobals.mock("@react-native-firebase/app", () => ({
  getApp: jestGlobals.fn(() => ({})),
}));
jestGlobals.mock("@react-native-firebase/crashlytics", () => ({
  getCrashlytics: jestGlobals.fn(() => ({
    setUserId: jestGlobals.fn(),
    setAttribute: jestGlobals.fn(),
    log: jestGlobals.fn(),
    recordError: jestGlobals.fn(),
  })),
}), { virtual: true });
jestGlobals.mock("@react-native-firebase/messaging", () => ({
  getMessaging: jestGlobals.fn(() => ({})),
  getToken: jestGlobals.fn(async () => "test-fcm-token"),
  getInitialNotification: jestGlobals.fn(async () => null),
  onMessage: jestGlobals.fn(() => jestGlobals.fn()),
  onNotificationOpenedApp: jestGlobals.fn(() => jestGlobals.fn()),
  onTokenRefresh: jestGlobals.fn(() => jestGlobals.fn()),
  registerDeviceForRemoteMessages: jestGlobals.fn(async () => undefined),
  requestPermission: jestGlobals.fn(async () => 1),
}));
jestGlobals.mock("react-native-device-info", () => ({
  getModel: jestGlobals.fn(() => "Pixel Test"),
  getSystemVersion: jestGlobals.fn(() => "14"),
  getVersion: jestGlobals.fn(() => "1.0.0"),
  getBuildNumber: jestGlobals.fn(() => "100"),
}), { virtual: true });
jestGlobals.mock("jail-monkey", () => ({
  isJailBroken: jestGlobals.fn(() => false),
  isOnExternalStorage: jestGlobals.fn(() => false),
  isDebuggedMode: jestGlobals.fn(() => false),
  canMockLocation: jestGlobals.fn(() => false),
}), { virtual: true });
jestGlobals.mock("react-native-incall-manager", () => ({
  __esModule: true,
  default: {
    start: jestGlobals.fn(),
    stop: jestGlobals.fn(),
    startRingtone: jestGlobals.fn(),
    stopRingtone: jestGlobals.fn(),
    setKeepScreenOn: jestGlobals.fn(),
    setMicrophoneMute: jestGlobals.fn(),
    setForceSpeakerphoneOn: jestGlobals.fn(),
  },
}));
jestGlobals.mock("react-native-webrtc", () => ({
  mediaDevices: { getUserMedia: jestGlobals.fn() },
  RTCPeerConnection: jestGlobals.fn(),
  RTCIceCandidate: jestGlobals.fn((value) => value),
  RTCSessionDescription: jestGlobals.fn((value) => value),
}));
jestGlobals.mock("react-native-config", () => ({
  API_BASE_URL: "",
  MAPBOX_PUBLIC_TOKEN: "pk.test-token",
  TURN_URL: "turn:test.example.com:3478",
  TURN_USERNAME: "tester",
  TURN_PASSWORD: "secret",
}));
jestGlobals.mock("@rnmapbox/maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Mock = ({ children, testID }) => React.createElement(View, testID ? { testID } : null, children);
  return {
    __esModule: true,
    default: {
      setAccessToken: jestGlobals.fn(),
      StyleURL: { Dark: "mock-dark-style" },
      MapView: (props) => React.createElement(Mock, { ...props, testID: "mapbox-map-view" }),
      Camera: (props) => React.createElement(Mock, { ...props, testID: "mapbox-camera" }),
      ShapeSource: Mock,
      LineLayer: Mock,
      PointAnnotation: (props) => React.createElement(Mock, { ...props, testID: "mapbox-point-annotation" }),
      UserLocation: Mock,
    },
  };
});
