import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import ChatListScreen from "../ChatListScreen";
import { fetchChatThreads } from "../../../redux/slices/chatSlice";
import { useAppDispatch, useAppSelector } from "../../../hooks/useRedux";
import { useFocusEffect } from "@react-navigation/native";

jest.mock("react-native/Libraries/Lists/FlatList", () => {
  const React = require("react");
  const { View } = require("react-native");

  const MockFlatList = ({ data = [], renderItem, ListEmptyComponent, ListFooterComponent, testID = "chat-list", ...props }: any) => {
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
  };

  return { __esModule: true, default: MockFlatList };
});

jest.mock("@react-navigation/native", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("../../../hooks/useRedux", () => ({
  useAppDispatch: jest.fn(),
  useAppSelector: jest.fn(),
}));

jest.mock("../../../redux/slices/chatSlice", () => ({
  fetchChatThreads: jest.fn((page: number) => ({ type: "chat/fetchThreads", payload: page })),
}));

const mockedUseFocusEffect = useFocusEffect as jest.MockedFunction<typeof useFocusEffect>;
const mockedUseAppDispatch = useAppDispatch as jest.MockedFunction<typeof useAppDispatch>;
const mockedUseAppSelector = useAppSelector as jest.MockedFunction<typeof useAppSelector>;
const mockedFetchChatThreads = fetchChatThreads as jest.MockedFunction<typeof fetchChatThreads>;

describe("ChatListScreen", () => {
  const dispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseAppDispatch.mockReturnValue(dispatch as any);
    mockedUseFocusEffect.mockImplementation((callback: any) => {
      callback();
    });
  });

  it("renders empty state and loads threads on focus", async () => {
    mockedUseAppSelector.mockImplementation((selector: any) =>
      selector({ chat: { threads: [], threadsPage: 0, threadsHasMore: true, threadsLoading: false, threadsError: null, connected: true } }),
    );

    const view = await render(<ChatListScreen navigation={{ navigate: jest.fn() }} />);

    expect(view.getByText("No order conversations yet.")).toBeTruthy();
    expect(mockedFetchChatThreads).toHaveBeenCalledWith(0);
    expect(dispatch).toHaveBeenCalled();
  });

  it("renders error state and retries on tap", async () => {
    mockedUseAppSelector.mockImplementation((selector: any) =>
      selector({ chat: { threads: [], threadsPage: 0, threadsHasMore: true, threadsLoading: false, threadsError: "broken", connected: false } }),
    );

    const view = await render(<ChatListScreen navigation={{ navigate: jest.fn() }} />);

    await act(async () => {
      fireEvent.press(view.getByText("broken"));
    });

    expect(dispatch).toHaveBeenCalledTimes(2);
  });

  it("renders threads, unread badge, navigates, refreshes, and loads more", async () => {
    mockedUseAppSelector.mockImplementation((selector: any) =>
      selector({
        chat: {
          threads: [{
            orderId: 77,
            customerName: "Riya",
            serviceName: "Cleaning",
            lastMessage: { text: "Hello", id: "m1", orderId: 77, senderType: "CUSTOMER", createdAt: "2026-06-24T10:00:00Z", status: "sent" },
            unreadCount: 3,
            updatedAt: "2026-06-24T10:00:00Z",
          }],
          threadsPage: 1,
          threadsHasMore: true,
          threadsLoading: false,
          threadsError: null,
          connected: true,
        },
      }),
    );

    const navigation = { navigate: jest.fn() };
    const view = await render(<ChatListScreen navigation={navigation} />);

    expect(view.getByText("Riya")).toBeTruthy();
    expect(view.getByText("Order #77 - Cleaning")).toBeTruthy();
    expect(view.getByText("3")).toBeTruthy();

    await act(async () => {
      fireEvent.press(view.getByText("Riya"));
      view.getByTestId("chat-list").props.refreshControl.props.onRefresh();
      view.getByTestId("chat-list").props.onEndReached();
    });

    expect(navigation.navigate).toHaveBeenCalledWith("Chat", { orderId: 77, customerName: "Riya" });
    expect(mockedFetchChatThreads).toHaveBeenCalledWith(0);
    expect(mockedFetchChatThreads).toHaveBeenCalledWith(2);
  });

  it("does not load more while already loading or when no more pages remain", async () => {
    mockedUseAppSelector.mockImplementation((selector: any) =>
      selector({ chat: { threads: [], threadsPage: 1, threadsHasMore: false, threadsLoading: true, threadsError: null, connected: false } }),
    );

    const view = await render(<ChatListScreen navigation={{ navigate: jest.fn() }} />);

    dispatch.mockClear();
    await act(async () => {
      view.getByTestId("chat-list").props.onEndReached();
    });

    expect(dispatch).not.toHaveBeenCalled();
  });
});
