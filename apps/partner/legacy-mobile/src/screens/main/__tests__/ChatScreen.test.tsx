import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { cleanup } from "@testing-library/react-native";

let mockPlatformOS: "ios" | "android" = "ios";
const mockScrollToOffset = jest.fn();

jest.mock("react-native/Libraries/Lists/FlatList", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockFlatList = React.forwardRef(({ data = [], renderItem, ListEmptyComponent, ListFooterComponent, testID = "chat-list", ...props }: any, ref) => {
    React.useImperativeHandle(ref, () => ({
      scrollToOffset: mockScrollToOffset,
    }));

    const empty = typeof ListEmptyComponent === "function" ? React.createElement(ListEmptyComponent) : ListEmptyComponent;
    const footer = typeof ListFooterComponent === "function" ? React.createElement(ListFooterComponent) : ListFooterComponent;

    return React.createElement(
      View,
      { testID, ...props },
      data.length === 0
        ? empty
        : data.map((item: any, index: number) =>
            React.createElement(View, { key: props.keyExtractor ? props.keyExtractor(item, index) : `${index}` }, renderItem({ item, index })),
          ),
      footer,
    );
  });

  return { __esModule: true, default: MockFlatList };
});

jest.mock("react-native/Libraries/Components/ActivityIndicator/ActivityIndicator", () => {
  const React = require("react");
  const { Text } = require("react-native");

  const MockActivityIndicator = (props: any) => React.createElement(Text, { testID: "activity-indicator", ...props }, "loading");

  return { __esModule: true, default: MockActivityIndicator };
});

jest.mock("../../../hooks/useRedux", () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock("../../../redux/slices/chatSlice", () => ({
  clearThreadUnread: jest.fn((orderId) => ({ type: "chat/clearThreadUnread", payload: orderId })),
  fetchMessages: jest.fn((payload) => ({ type: "chat/fetchMessages", payload })),
  readOrderMessages: jest.fn((payload) => ({ type: "chat/readOrderMessages", payload })),
  sendChatMessage: jest.fn((payload) => ({ type: "chat/sendChatMessage", payload })),
}));

jest.mock("../../../services/chatSocket", () => ({
  chatSocket: {
    subscribe: jest.fn(),
    sendTyping: jest.fn(),
    sendReadReceipt: jest.fn(),
  },
}));

import ChatScreen from "../ChatScreen";
import { useAppDispatch, useAppSelector } from "../../../hooks/useRedux";
import { clearThreadUnread, fetchMessages, readOrderMessages, sendChatMessage } from "../../../redux/slices/chatSlice";
import { chatSocket } from "../../../services/chatSocket";
const { Platform } = require("react-native");

const mockDispatch = jest.fn();
const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockGetParent = jest.fn();
const mockGoBack = jest.fn();
const mockUnsubscribe = jest.fn();

const mockUseAppDispatch = useAppDispatch as jest.MockedFunction<typeof useAppDispatch>;
const mockUseAppSelector = useAppSelector as jest.MockedFunction<typeof useAppSelector>;
const mockFetchMessages = fetchMessages as jest.MockedFunction<typeof fetchMessages>;
const mockClearThreadUnread = clearThreadUnread as jest.MockedFunction<typeof clearThreadUnread>;
const mockReadOrderMessages = readOrderMessages as jest.MockedFunction<typeof readOrderMessages>;
const mockSendChatMessage = sendChatMessage as jest.MockedFunction<typeof sendChatMessage>;
const mockChatSocket = chatSocket as jest.Mocked<typeof chatSocket>;

const baseState = {
  chat: {
    messagesByOrder: {
      "42": {
        items: [],
        page: 0,
        hasMore: true,
        loading: false,
        loadingMore: false,
        error: null,
      },
    },
    typingByOrder: {},
    connected: true,
  },
};

const buildNavigation = () => ({
  setOptions: mockSetOptions,
  navigate: mockNavigate,
  getParent: mockGetParent,
  goBack: mockGoBack,
});

const renderScreen = async (stateOverrides?: any, routeOverrides?: any) => {
  const state = {
    ...baseState,
    ...stateOverrides,
    chat: {
      ...baseState.chat,
      ...(stateOverrides?.chat ?? {}),
      messagesByOrder: {
        ...baseState.chat.messagesByOrder,
        ...(stateOverrides?.chat?.messagesByOrder ?? {}),
      },
      typingByOrder: {
        ...baseState.chat.typingByOrder,
        ...(stateOverrides?.chat?.typingByOrder ?? {}),
      },
    },
  };

  mockUseAppSelector.mockImplementation((selector: any) => selector(state));

  return render(
    <ChatScreen
      navigation={buildNavigation()}
      route={{
        params: {
          orderId: 42,
          customerName: "Aarav",
          ...(routeOverrides?.params ?? {}),
        },
        ...routeOverrides,
      }}
    />,
  );
};

describe("ChatScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockPlatformOS = "ios";
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      get: () => mockPlatformOS,
    });
    mockUseAppDispatch.mockReturnValue(mockDispatch as any);
    mockDispatch.mockImplementation((action) => action);
    mockChatSocket.subscribe.mockReturnValue(mockUnsubscribe);
    global.requestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("renders the initial loading state and wires mount side effects", async () => {
    const view = await renderScreen({
      chat: {
        messagesByOrder: {
          "42": {
            items: [],
            page: 0,
            hasMore: true,
            loading: true,
            loadingMore: false,
            error: null,
          },
        },
      },
    });

    expect(view.getByText("Live")).toBeTruthy();
    expect(view.getAllByTestId("activity-indicator")).toHaveLength(1);
    expect(view.getByLabelText("Message customer").props.value).toBe("");
    expect(view.getByLabelText("Send message").props.accessibilityState.disabled).toBe(true);
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Aarav",
        headerShown: true,
      }),
    );
    expect(mockFetchMessages).toHaveBeenCalledWith({ orderId: 42, page: 0 });
    expect(mockClearThreadUnread).toHaveBeenCalledWith(42);
    expect(mockDispatch).toHaveBeenCalledWith({ type: "chat/fetchMessages", payload: { orderId: 42, page: 0 } });
    expect(mockDispatch).toHaveBeenCalledWith({ type: "chat/clearThreadUnread", payload: 42 });
    expect(mockChatSocket.subscribe).toHaveBeenCalledWith(42);
  });

  it("renders empty state and uses fallback customer title when the name is missing", async () => {
    const view = await renderScreen(undefined, { params: { orderId: 77, customerName: undefined } });

    expect(view.getByText("Start the conversation for this order.")).toBeTruthy();
    expect(mockSetOptions).toHaveBeenCalledWith(expect.objectContaining({ title: "Order #77" }));
  });

  it("renders messages, marks unread customer messages as read, and shows delivery metadata", async () => {
    const items = [
      {
        id: "c1",
        orderId: 42,
        senderType: "CUSTOMER" as const,
        text: "Need help",
        createdAt: "2026-07-07T05:00:00.000Z",
        status: "delivered" as const,
      },
      {
        id: "p1",
        orderId: 42,
        senderType: "PARTNER" as const,
        text: "On my way",
        createdAt: "2026-07-07T05:05:00.000Z",
        status: "sent" as const,
      },
      {
        id: "p2",
        clientId: "client-2",
        orderId: 42,
        senderType: "PARTNER" as const,
        text: "Retry me",
        createdAt: "2026-07-07T05:10:00.000Z",
        status: "failed" as const,
      },
    ];

    const view = await renderScreen({
      chat: {
        messagesByOrder: {
          "42": {
            items,
            page: 0,
            hasMore: true,
            loading: false,
            loadingMore: false,
            error: null,
          },
        },
      },
    });

    expect(view.getByText("Need help")).toBeTruthy();
    expect(view.getByText("On my way")).toBeTruthy();
    expect(view.getByText("sent")).toBeTruthy();
    expect(view.getByText("Failed • tap to retry")).toBeTruthy();

    await waitFor(() => {
      expect(mockReadOrderMessages).toHaveBeenCalledWith({ orderId: 42, messageIds: ["c1"] });
    });
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "chat/readOrderMessages",
      payload: { orderId: 42, messageIds: ["c1"] },
    });
    expect(mockChatSocket.sendReadReceipt).toHaveBeenCalledWith(42, ["c1"]);

    fireEvent.press(view.getByText("Retry me"));

    expect(mockSendChatMessage).toHaveBeenCalledWith({
      orderId: 42,
      text: "Retry me",
      clientId: "client-2",
    });
  });

  it("does not dispatch read receipts when there are no unread customer messages", async () => {
    await renderScreen({
      chat: {
        messagesByOrder: {
          "42": {
            items: [
              {
                id: "partner-msg",
                orderId: 42,
                senderType: "PARTNER" as const,
                text: "Already handled",
                createdAt: "2026-07-07T07:00:00.000Z",
                status: "read" as const,
              },
              {
                id: "customer-msg",
                orderId: 42,
                senderType: "CUSTOMER" as const,
                text: "Seen already",
                createdAt: "2026-07-07T07:10:00.000Z",
                status: "read" as const,
              },
            ],
            page: 0,
            hasMore: true,
            loading: false,
            loadingMore: false,
            error: null,
          },
        },
      },
    });

    await waitFor(() => {
      expect(mockReadOrderMessages).not.toHaveBeenCalled();
    });
    expect(mockChatSocket.sendReadReceipt).not.toHaveBeenCalled();
  });

  it("handles typing state, debounce cleanup, and successful send", async () => {
    const view = await renderScreen({
      chat: {
        typingByOrder: { "42": true },
      },
    });

    expect(view.getByText("Aarav is typing...")).toBeTruthy();

    fireEvent.changeText(view.getByPlaceholderText("Message customer"), "   Hello there   ");

    expect(mockChatSocket.sendTyping).toHaveBeenNthCalledWith(1, 42, true);
    await waitFor(() => {
      expect(view.getByDisplayValue("   Hello there   ")).toBeTruthy();
    });

    await waitFor(async () => {
      jest.advanceTimersByTime(1200);
    });

    expect(mockChatSocket.sendTyping).toHaveBeenNthCalledWith(2, 42, false);

    fireEvent.press(view.getByLabelText("Send message"));

    expect(mockChatSocket.sendTyping).toHaveBeenLastCalledWith(42, false);
    expect(mockSendChatMessage).toHaveBeenCalledWith({ orderId: 42, text: "Hello there" });
    expect(global.requestAnimationFrame).toHaveBeenCalled();
    expect(mockScrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
  });

  it("uses android keyboard behavior when the platform changes", async () => {
    mockPlatformOS = "android";

    const view = await renderScreen();

    expect(view.toJSON()?.props.behavior).toBeUndefined();
  });

});
