import React from "react";
import { Text } from "react-native";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react-native";

let mockQueryResult: any = { data: undefined, isFetching: false };
let mockMutationPending = false;
let mockMutationOptions: any;
const mockSubmitCustomerReview = jest.fn();
const mockGetCleaningCoverage = jest.fn();
const mockGetFallbackCoverage = jest.fn();
const mockSetAccessToken = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQuery: (options: any) => {
    options.queryFn = options.queryFn.bind(options);
    return mockQueryResult;
  },
  useMutation: (options: any) => {
    mockMutationOptions = options;
    return {
      isPending: mockMutationPending,
      mutate: () => {
        Promise.resolve()
          .then(() => options.mutationFn())
          .then(options.onSuccess)
          .catch(options.onError);
      },
    };
  },
}));

jest.mock("../src/api/reviewApi", () => ({
  submitCustomerReview: (...args: any[]) => mockSubmitCustomerReview(...args),
}));

jest.mock("../src/api/cleaningCoverageApi", () => ({
  getCleaningCoverage: (...args: any[]) => mockGetCleaningCoverage(...args),
}));

jest.mock("../src/constants/cleaningCoverageConfig", () => ({
  getCleaningCoverageForDuration: (...args: any[]) => mockGetFallbackCoverage(...args),
}));

jest.mock("@rnmapbox/maps", () => {
  const { View } = require("react-native");
  const component = (testID: string) => ({ children, ...props }: any) => <View testID={testID} {...props}>{children}</View>;
  return {
    __esModule: true,
    default: {
      setAccessToken: (...args: any[]) => mockSetAccessToken(...args),
      StyleURL: { Dark: "dark-map" },
      MapView: component("map-view"),
      Camera: component("map-camera"),
      PointAnnotation: component("map-point"),
      ShapeSource: component("map-shape"),
      LineLayer: component("map-line"),
    },
  };
});

import { BookingCard } from "../src/components/booking/BookingCard";
import { BookingStageShell } from "../src/components/booking/BookingStageShell";
import { BookingTimeline } from "../src/components/booking/BookingTimeline";
import { CleaningCoverageCard } from "../src/components/booking/CleaningCoverageCard";
import { CustomerReviewCard } from "../src/components/booking/CustomerReviewCard";
import { LiveMapView } from "../src/components/booking/LiveMapView";
import { OTPInput } from "../src/components/booking/OTPInput";
import { PartnerCard } from "../src/components/booking/PartnerCard";
import { PaymentBottomSheet } from "../src/components/booking/PaymentBottomSheet";
import { PaymentCard } from "../src/components/booking/PaymentCard";
import { RatingModal } from "../src/components/booking/RatingModal";
import { StatusBadge } from "../src/components/booking/StatusBadge";
import { bookingTheme } from "../src/components/booking/bookingTheme";

describe("booking components", () => {
  beforeEach(async () => {
    await cleanup();
    jest.clearAllMocks();
    mockQueryResult = { data: undefined, isFetching: false };
    mockMutationPending = false;
    mockSubmitCustomerReview.mockResolvedValue({ ok: true });
    mockGetFallbackCoverage.mockReturnValue(null);
  });

  afterEach(async () => {
    await cleanup();
  });

  it("renders booking shell, card and status fallback and executes card press", async () => {
    const onPress = jest.fn();
    const view = await render(
      <BookingStageShell title="Booking status" subtitle="Partner assigned">
        <BookingCard title="Home cleaning" subtitle="Tomorrow" amount="Rs 500" status="UNKNOWN" onPress={onPress} />
      </BookingStageShell>,
    );
    expect(view.getByText("Booking status")).toBeTruthy();
    expect(view.getByText("UNKNOWN")).toBeTruthy();
    await fireEvent.press(view.getByText("Home cleaning"));
    expect(onPress).toHaveBeenCalledTimes(1);
    await view.rerender(<BookingStageShell title="Only title"><Text>Body</Text></BookingStageShell>);
    expect(view.queryByText("Partner assigned")).toBeNull();
  });

  it.each(["CREATED", "PAYMENT_PENDING", "SEARCHING_PARTNER", "PARTNER_ASSIGNED", "PARTNER_ARRIVED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "EXPIRED", "PAYMENT_FAILED"])(
    "renders %s status labels",
    async status => {
      const view = await render(<StatusBadge status={status} />);
      expect(view.getByText(status.replaceAll("_", " "))).toBeTruthy();
    },
  );

  it("filters invalid timeline rows and renders done, active and timestamps", async () => {
    const view = await render(
      <BookingTimeline
        compact
        history={[
          { key: "1", label: "Created", completed: true, timestamp: "10:00" },
          { key: "2", label: "Assigned", status: "CURRENT" },
          { key: "3", label: "", status: "DONE" },
          { key: "4", label: "Finished", status: "COMPLETED" },
        ] as any}
      />,
    );
    expect(view.getByText("Created")).toBeTruthy();
    expect(view.getByText("Assigned")).toBeTruthy();
    expect(view.getByText("Finished")).toBeTruthy();
    expect(view.getByText("10:00")).toBeTruthy();
    await view.rerender(<BookingTimeline history={undefined} />);
    expect(view.toJSON()).toBeNull();
  });

  it("normalizes OTP input to configured length and focuses through wrapper", async () => {
    const onChange = jest.fn();
    const view = await render(<OTPInput value="12" onChange={onChange} length={4} />);
    const inputs = view.container.queryAll(node => node.props.keyboardType === "number-pad" || node.props.editable === false);
    expect(inputs).toHaveLength(5);
    await fireEvent.changeText(inputs.at(-1)!, "1a2-345");
    expect(onChange).toHaveBeenCalledWith("1234");
    await fireEvent.press(inputs.at(-1)!.parent!);
  });

  it("renders partner rating with one decimal", async () => {
    const view = await render(<PartnerCard name="Amit" eta="12 min" rating={4} />);
    expect(view.getByText("Amit")).toBeTruthy();
    expect(view.getByText("ETA 12 min")).toBeTruthy();
    expect(view.getByText("4.0")).toBeTruthy();
  });

  it("handles payment card selection and bottom-sheet controls", async () => {
    const select = jest.fn();
    const close = jest.fn();
    const confirm = jest.fn();
    const card = await render(<PaymentCard method="UPI" hint="Apps" selected onPress={() => select("single")} />);
    await fireEvent.press(card.getByText("UPI"));
    expect(select).toHaveBeenCalledWith("single");
    await card.unmount();

    const view = await render(<PaymentBottomSheet visible selected="CARD" onSelect={select} onClose={close} onConfirm={confirm} />);
    await fireEvent.press(view.getByText("COD"));
    await fireEvent.press(view.getByText("Continue"));
    expect(select).toHaveBeenCalledWith("COD");
    expect(confirm).toHaveBeenCalledTimes(1);
    const modal = view.container.queryAll(node => node.props.onRequestClose === close)[0];
    await act(async () => modal.props.onRequestClose());
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("handles rating selection, defer and submit actions", async () => {
    const change = jest.fn();
    const close = jest.fn();
    const submit = jest.fn();
    const view = await render(<RatingModal visible value={2} onChange={change} onClose={close} onSubmit={submit} />);
    const stars = view.container.queryAll(node => String(node.props.name ?? "").startsWith("star"));
    await fireEvent.press(stars[4].parent!);
    await fireEvent.press(view.getByText("Later"));
    await fireEvent.press(view.getByText("Submit"));
    expect(change).toHaveBeenCalledWith(5);
    expect(close).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledTimes(1);
  });

  it("builds map center, annotations and optional route line", async () => {
    const view = await render(<LiveMapView customer={{ latitude: 28, longitude: 77 }} partner={{ latitude: 30, longitude: 79 }} routePoints={[{ latitude: 28, longitude: 77 }, { latitude: 29, longitude: 78 }]} />);
    expect(mockSetAccessToken).toHaveBeenCalled();
    expect(view.getByTestId("map-camera").props.centerCoordinate).toEqual([78, 29]);
    expect(view.getAllByTestId("map-point")).toHaveLength(2);
    expect(view.getByTestId("map-shape").props.shape.geometry.coordinates).toEqual([[77, 28], [78, 29]]);
    await view.rerender(<LiveMapView customer={{ latitude: 1, longitude: 2 }} partner={{ latitude: 3, longitude: 4 }} />);
    expect(view.queryByTestId("map-shape")).toBeNull();
  });

  it("renders local cleaning coverage fallback and toggles expansion", async () => {
    mockGetFallbackCoverage.mockReturnValue({ durationHours: 2, tasks: [{ name: "Fans", icon: "fan", estimatedMinutes: 20 }, { name: "Custom", icon: "unknown", estimatedMinutes: 15 }] });
    const view = await render(<CleaningCoverageCard durationHours={2} />);
    expect(view.getByText("Fans")).toBeTruthy();
    expect(view.getByText("Custom")).toBeTruthy();
    expect(view.getByText("20 mins")).toBeTruthy();
    await fireEvent.press(view.getByText("How much can be covered?"));
    expect(view.queryByText("Fans")).toBeNull();
    await fireEvent.press(view.getByText("How much can be covered?"));
    expect(view.getByText("Fans")).toBeTruthy();
  });

  it("prefers matching API coverage and renders duration states", async () => {
    mockQueryResult = { data: [{ durationHours: 3, tasks: [{ name: "Kitchen", icon: "kitchen", estimatedMinutes: 45 }] }], isFetching: false };
    const view = await render(<CleaningCoverageCard durationHours={3} />);
    expect(view.getByText("Kitchen")).toBeTruthy();

    mockQueryResult = { data: [], isFetching: true };
    mockGetFallbackCoverage.mockReturnValue(null);
    await view.rerender(<CleaningCoverageCard durationHours={4} />);
    expect(view.getByText("Loading coverage estimates...")).toBeTruthy();

    mockQueryResult = { data: [], isFetching: false };
    await view.rerender(<CleaningCoverageCard durationHours={5} />);
    expect(view.getByText("Coverage estimates are not available for this duration.")).toBeTruthy();
    await view.rerender(<CleaningCoverageCard durationHours={null} />);
    expect(view.getByText("Select a duration to view coverage estimates.")).toBeTruthy();
  });

  it("hides review UI unless backend meta allows it and renders submitted state", async () => {
    const first = await render(<CustomerReviewCard booking={{ bookingId: "b1", meta: {} } as any} />);
    expect(first.toJSON()).toBeNull();
    await first.rerender(<CustomerReviewCard booking={{ bookingId: "b1", meta: { reviewSubmitted: true } } as any} />);
    expect(first.getByText("Thank you for your feedback")).toBeTruthy();
  });

  it("validates missing booking and rating before review submission", async () => {
    const view = await render(<CustomerReviewCard booking={{ meta: { canReview: true } } as any} />);
    await fireEvent.press(view.getByText("Submit Review"));
    expect(view.getByText("Booking not found.")).toBeTruthy();
    await view.rerender(<CustomerReviewCard booking={{ bookingId: "booking-1", meta: { canReview: true } } as any} />);
    await fireEvent.press(view.getByText("Submit Review"));
    expect(view.getByText("Rating is mandatory.")).toBeTruthy();
    expect(mockSubmitCustomerReview).not.toHaveBeenCalled();
  });

  it("submits trimmed review, invokes callback and shows local success", async () => {
    const submitted = jest.fn();
    const view = await render(<CustomerReviewCard booking={{ id: 77, meta: { canReview: true } } as any} onSubmitted={submitted} />);
    await fireEvent.press(view.getByLabelText("4 star rating"));
    const input = view.getByPlaceholderText("Share your experience");
    await fireEvent.changeText(input, "  Great service  ");
    expect(view.getByText("17/500")).toBeTruthy();
    await fireEvent.press(view.getByText("Submit Review"));
    await waitFor(() => expect(mockSubmitCustomerReview).toHaveBeenCalledWith({ bookingId: "77", rating: 4, reviewText: "Great service" }));
    await waitFor(() => expect(view.getByText("Thank you for your feedback")).toBeTruthy());
    expect(submitted).toHaveBeenCalledTimes(1);
  });

  it("renders API and fallback review errors and pending state", async () => {
    mockSubmitCustomerReview.mockRejectedValueOnce(new Error("Review rejected"));
    const view = await render(<CustomerReviewCard booking={{ bookingId: "b2", meta: { canReview: true } } as any} />);
    await fireEvent.press(view.getByLabelText("5 star rating"));
    await fireEvent.press(view.getByText("Submit Review"));
    await waitFor(() => expect(view.getByText("Review rejected")).toBeTruthy());

    await act(async () => mockMutationOptions.onError({}));
    await waitFor(() => expect(view.getByText("Unable to submit review. Please try again.")).toBeTruthy());

    mockMutationPending = true;
    await view.rerender(<CustomerReviewCard booking={{ bookingId: "b2", meta: { canReview: true } } as any} />);
    expect(view.queryByText("Submit Review")).toBeNull();
  });

  it("exports stable booking theme tokens", () => {
    expect(bookingTheme.radius.pill).toBe(999);
    expect(bookingTheme.colors.primaryBtn).toBeTruthy();
  });
});
