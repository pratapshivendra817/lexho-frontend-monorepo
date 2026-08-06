import React from "react";
import { Text, TextInput, TouchableOpacity } from "react-native";
import ReactTestRenderer, { act } from "react-test-renderer";

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
import { fetchMessages } from "../../../redux/slices/chatSlice";
import { chatSocket } from "../../../services/chatSocket";
const { Platform } = require("react-native");

const mockDispatch = jest.fn();
const mockSetOptions = jest.fn();
const mockUnsubscribe = jest.fn();
const mockUseAppDispatch = useAppDispatch as jest.MockedFunction<typeof useAppDispatch>;
const mockUseAppSelector = useAppSelector as jest.MockedFunction<typeof useAppSelector>;
const mockFetchMessages = fetchMessages as jest.MockedFunction<typeof fetchMessages>;
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
  navigate: jest.fn(),
});

const configureSelectors = (stateOverrides?: any) => {
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
};

describe("ChatScreen branch coverage", () => {
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
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("retries errors, paginates older messages, and auto-scrolls when page zero content changes", async () => {
    configureSelectors({
      chat: {
        messagesByOrder: {
          "42": {
            items: [
              {
                id: "msg-1",
                orderId: 42,
                senderType: "CUSTOMER" as const,
                text: "Hello partner",
                createdAt: "2026-07-07T09:00:00.000Z",
                status: "read" as const,
              },
            ],
            page: 0,
            hasMore: true,
            loading: false,
            loadingMore: false,
            error: "Socket lost",
          },
        },
      },
    });

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <ChatScreen
          navigation={buildNavigation()}
          route={{ params: { orderId: 42, customerName: "Aarav" } }}
        />,
      );
    });

    const touchables = tree.root.findAllByType(TouchableOpacity);
    const errorRetry = touchables.find((node) => {
      const textNode = node.findAllByType(Text)[0];
      const children = textNode?.props?.children;
      const value = Array.isArray(children) ? children.join("") : String(children ?? "");
      return value.includes("Socket lost");
    });

    await act(async () => {
      errorRetry?.props.onPress();
      tree.root.findByProps({ testID: "chat-list" }).props.onEndReached();
      tree.root.findByProps({ testID: "chat-list" }).props.onContentSizeChange();
    });

    expect(mockFetchMessages).toHaveBeenCalledWith({ orderId: 42, page: 0 });
    expect(mockFetchMessages).toHaveBeenCalledWith({ orderId: 42, page: 1 });
    expect(mockDispatch).toHaveBeenCalledWith({ type: "chat/fetchMessages", payload: { orderId: 42, page: 1 } });
    expect(mockScrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
  });

  it("skips pagination while already loading older rows and ignores blank sends", async () => {
    configureSelectors({
      chat: {
        messagesByOrder: {
          "42": {
            items: [],
            page: 2,
            hasMore: true,
            loading: false,
            loadingMore: true,
            error: null,
          },
        },
      },
    });

    let tree!: ReactTestRenderer.ReactTestRenderer;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <ChatScreen
          navigation={buildNavigation()}
          route={{ params: { orderId: 42, customerName: "Aarav" } }}
        />,
      );
    });

    const input = tree.root.findByType(TextInput);
    await act(async () => {
      input.props.onChangeText("   ");
      tree.root.findByProps({ testID: "chat-list" }).props.onEndReached();
    });

    const sendButton = tree.root.findAllByType(TouchableOpacity).find((node) => node.props.accessibilityLabel === "Send message");
    await act(async () => {
      sendButton?.props.onPress();
    });

    expect(mockFetchMessages).not.toHaveBeenCalledWith({ orderId: 42, page: 3 });
  });
});
