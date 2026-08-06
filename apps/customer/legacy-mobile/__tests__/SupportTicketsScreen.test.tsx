import React from "react";
import { Share } from "react-native";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

import { SupportTicketsScreen } from "../src/screens/support/SupportTicketsScreen";

const mockNavigate = jest.fn();
const mockRefetch = jest.fn();
const mockCreate = jest.fn();
let mockHistory: any;
let mockFaq: any;
let mockMutationState: any;

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) =>
    options.queryKey[0] === "support-history" ? mockHistory : mockFaq,
  useMutation: (options: any) => ({
    ...mockMutationState,
    mutate: async (values: any) => {
      try {
        await options.mutationFn(values);
        options.onSuccess?.();
      } catch (error) {
        options.onError?.(error);
      }
    },
    reset: jest.fn(),
  }),
}));

jest.mock("../src/api/supportApi", () => ({
  createSupportTicket: (...args: any[]) => mockCreate(...args),
  getSupportFaqCategories: jest.fn(),
  getSupportHistory: jest.fn(),
}));

jest.mock("../src/components/common/SkeletonList", () => ({
  SkeletonList: ({ rows }: any) => {
    const { Text } = require("react-native");
    return <Text>{`Skeleton ${rows}`}</Text>;
  },
}));

jest.mock("../src/components/common/EmptyStateCard", () => ({
  EmptyStateCard: ({ title, subtitle }: any) => {
    const { Text, View } = require("react-native");
    return <View><Text>{title}</Text><Text>{subtitle}</Text></View>;
  },
}));

describe("SupportTicketsScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHistory = {
      data: [
        { id: "T1", subject: "Refund", message: "Refund pending", status: "OPEN" },
      ],
      isLoading: false,
      refetch: mockRefetch,
    };
    mockFaq = {
      data: [
        {
          id: "remote",
          label: "Remote FAQ",
          displayOrder: 0,
          faqs: [
            { id: "r1", question: "Remote question?", answer: "Remote answer." },
            { id: "bad", question: "", answer: "" },
          ],
        },
      ],
      isLoading: false,
    };
    mockMutationState = {
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
    };
    mockCreate.mockResolvedValue({});
    jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" } as any);
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("uses remote FAQs, expands answers, navigates, shares, and submits a valid ticket", async () => {
    const view = await render(
      <SupportTicketsScreen navigation={{ navigate: mockNavigate }} />,
    );

    expect(view.getByText("Remote FAQ")).toBeTruthy();
    await fireEvent.press(view.getByText("Remote FAQ"));
    await fireEvent.press(view.getByText("Remote question?"));
    expect(view.getByText("Remote answer.")).toBeTruthy();
    await fireEvent.press(view.getByText("Remote question?"));
    expect(view.queryByText("Remote answer.")).toBeNull();

    await fireEvent.press(view.getByText("Open FAQs"));
    expect(mockNavigate).toHaveBeenCalledWith("Faq");

    await fireEvent.press(view.getByText("Share"));
    expect(Share.share).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("Ticket ID: T1") }),
    );

    await fireEvent.press(view.getByText("Chat with us"));
    await fireEvent.changeText(view.getAllByTestId("text-input-outlined")[1], "Detailed support request");
    await fireEvent.press(view.getByText("Submit"));
    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({
        subject: "Support",
        message: "Detailed support request",
      }),
    );
    expect(mockRefetch).toHaveBeenCalled();
  });

  it("renders local/loading/empty states and form validation and snackbars", async () => {
    mockHistory = { data: [], isLoading: true, refetch: mockRefetch };
    mockFaq = { data: [], isLoading: true };
    let view = await render(<SupportTicketsScreen navigation={{ navigate: mockNavigate }} />);
    expect(view.getAllByText("Skeleton 2").length).toBeGreaterThan(0);
    expect(view.getByText("Why was my booking cancelled?")).toBeTruthy();

    await cleanup();
    mockHistory = { data: [], isLoading: false, refetch: mockRefetch };
    mockFaq = { data: [], isLoading: false };
    mockMutationState = {
      isPending: false,
      isError: true,
      isSuccess: true,
      error: new Error("Create failed"),
    };
    view = await render(<SupportTicketsScreen navigation={{ navigate: mockNavigate }} />);
    expect(view.getByText("No tickets yet")).toBeTruthy();
    expect(view.getByText("Create failed")).toBeTruthy();
    expect(view.getByText("Ticket created")).toBeTruthy();

    await fireEvent.press(view.getByText("Chat with us"));
    await fireEvent.changeText(view.getAllByTestId("text-input-outlined")[1], "short");
    await fireEvent.press(view.getByText("Submit"));
    expect(await view.findByText("Message must be detailed")).toBeTruthy();
  });
});
