import React from "react";
import { Animated } from "react-native";
import {
  cleanup,
  fireEvent,
  render,
} from "@testing-library/react-native";

const mockReload = jest.fn();
const mockUseHomeSections = jest.fn();

jest.mock("../src/modules/home/useHomeSections", () => ({
  useHomeSections: () => mockUseHomeSections(),
}));

import { DynamicHomeSections } from "../src/modules/home/DynamicHomeSections";
import type {
  HomeSection,
  HomeSectionItem,
} from "../src/modules/home/types";

const itemBuilder = (
  overrides: Partial<HomeSectionItem> = {},
): HomeSectionItem => ({
  id: 1,
  sectionId: 1,
  title: "Item",
  subtitle: null,
  value: null,
  icon: null,
  color: null,
  borderColor: null,
  backgroundColor: null,
  iconColor: null,
  priority: 1,
  active: true,
  ...overrides,
});

const sectionBuilder = (
  overrides: Partial<HomeSection> = {},
): HomeSection => ({
  id: 1,
  type: "TRUST",
  title: "Section",
  subtitle: null,
  icon: null,
  color: null,
  borderColor: null,
  backgroundColor: null,
  iconColor: null,
  priority: 1,
  active: true,
  createdAt: null,
  items: [],
  ...overrides,
});

describe("DynamicHomeSections", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Animated, "timing").mockImplementation(
      (value, config) =>
        ({
          start: (callback?: (result: { finished: boolean }) => void) => {
            (value as Animated.Value).setValue(Number(config.toValue));
            callback?.({ finished: true });
          },
          stop: jest.fn(),
          reset: jest.fn(),
        }) as any,
    );
    jest.spyOn(Animated, "stagger").mockImplementation(
      (_delay, animations) =>
        ({
          start: (callback?: (result: { finished: boolean }) => void) => {
            animations.forEach(animation => animation.start());
            callback?.({ finished: true });
          },
          stop: jest.fn(),
          reset: jest.fn(),
        }) as any,
    );
    mockUseHomeSections.mockReturnValue({
      loading: false,
      error: null,
      sections: [],
      reload: mockReload,
    });
  });

  afterEach(async () => {
    await cleanup();
    jest.restoreAllMocks();
  });

  it("renders loading state", async () => {
    mockUseHomeSections.mockReturnValue({
      loading: true,
      error: null,
      sections: [],
      reload: mockReload,
    });

    const view = await render(<DynamicHomeSections />);

    expect(view.getByText("Loading homepage sections...")).toBeTruthy();
  });

  it("renders error details and retries", async () => {
    mockUseHomeSections.mockReturnValue({
      loading: false,
      error: "Network unavailable",
      sections: [],
      reload: mockReload,
    });

    const view = await render(<DynamicHomeSections />);

    expect(view.getByText("Unable to load homepage sections")).toBeTruthy();
    expect(view.getByText("Network unavailable")).toBeTruthy();

    await fireEvent.press(view.getByText("Retry"));

    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it("renders nothing for an empty successful response", async () => {
    const view = await render(<DynamicHomeSections />);

    expect(view.toJSON()).toBeNull();
  });

  it("renders populated stats with special values, trends and icon fallbacks", async () => {
    mockUseHomeSections.mockReturnValue({
      loading: false,
      error: null,
      reload: mockReload,
      sections: [
        sectionBuilder({
          id: 10,
          type: "STATS",
          title: "Service Performance",
          subtitle: "Live business metrics",
          items: [
            itemBuilder({
              id: 1,
              sectionId: 10,
              title: "Availability days",
              value: "7days",
              icon: "question-mark",
              subtitle: "Always available",
            }),
            itemBuilder({
              id: 2,
              sectionId: 10,
              title: "Customer support",
              value: "24x7",
              icon: "support",
              subtitle: "Fast response",
            }),
            itemBuilder({
              id: 3,
              sectionId: 10,
              title: "Quality rating",
              value: "4.8x",
              icon: "quality",
              subtitle: "",
            }),
            itemBuilder({
              id: 4,
              sectionId: 10,
              title: "Bookings growth",
              value: "12k",
              icon: "booking",
            }),
            itemBuilder({
              id: 5,
              sectionId: 10,
              title: "Customers",
              value: "",
              icon: "users",
            }),
          ],
        }),
      ],
    });

    const view = await render(<DynamicHomeSections />);

    expect(view.getByText("Service Performance")).toBeTruthy();
    expect(view.getByText("Live business metrics")).toBeTruthy();
    expect(view.getByText("7 days")).toBeTruthy();
    expect(view.getByText("24 * 7")).toBeTruthy();
    expect(view.getByText("Always available")).toBeTruthy();
    expect(view.getByText("Fast response")).toBeTruthy();
    expect(view.getByText("stable")).toBeTruthy();
    expect(view.getByText("+12% this month")).toBeTruthy();
    expect(view.getByText("+5% today")).toBeTruthy();
  });

  it("renders the stats empty state", async () => {
    mockUseHomeSections.mockReturnValue({
      loading: false,
      error: null,
      reload: mockReload,
      sections: [
        sectionBuilder({
          type: "STATS",
          title: "Stats",
          items: [],
        }),
      ],
    });

    const view = await render(<DynamicHomeSections />);

    expect(view.getByText("No stats items available.")).toBeTruthy();
  });

  it("renders trust metrics, filters blank metric labels and shows row details", async () => {
    mockUseHomeSections.mockReturnValue({
      loading: false,
      error: null,
      reload: mockReload,
      sections: [
        sectionBuilder({
          id: 20,
          type: "TRUST",
          title: "Why trust Lexho",
          subtitle: "Verified professionals",
          icon: "safe",
          items: [
            itemBuilder({
              id: 1,
              sectionId: 20,
              title: "Verified experts",
              subtitle: "Background checked",
              value: "100%",
              icon: "verified",
            }),
            itemBuilder({
              id: 2,
              sectionId: 20,
              title: "Trained staff",
              value: "not available",
              icon: "trained",
            }),
            itemBuilder({
              id: 3,
              sectionId: 20,
              title: "Top rated",
              value: "",
              icon: "top-rated",
            }),
            itemBuilder({
              id: 4,
              sectionId: 20,
              title: "Safe service",
              value: "4.9",
            }),
            itemBuilder({
              id: 5,
              sectionId: 20,
              title: " ",
              value: "ignored metric",
            }),
          ],
        }),
      ],
    });

    const view = await render(<DynamicHomeSections />);

    expect(view.getByText("Why trust Lexho")).toBeTruthy();
    expect(view.getByText("Verified professionals")).toBeTruthy();
    expect(view.getAllByText("Verified experts").length).toBeGreaterThan(0);
    expect(view.getByText("Background checked")).toBeTruthy();
    expect(view.getAllByText("100%")).toHaveLength(2);
    expect(view.getAllByText("--").length).toBeGreaterThan(0);
    expect(view.getByText("Safe service")).toBeTruthy();
  });

  it("renders the trust empty state", async () => {
    mockUseHomeSections.mockReturnValue({
      loading: false,
      error: null,
      reload: mockReload,
      sections: [
        sectionBuilder({
          type: "TRUST",
          title: "Trust",
          items: [],
        }),
      ],
    });

    const view = await render(<DynamicHomeSections />);

    expect(view.getByText("No trust highlights available.")).toBeTruthy();
  });

  it("renders tagline and highlight visual variants", async () => {
    mockUseHomeSections.mockReturnValue({
      loading: false,
      error: null,
      reload: mockReload,
      sections: [
        sectionBuilder({
          id: 30,
          type: "TAGLINE",
          title: "Clean home promise",
          subtitle: "A better day starts here",
          icon: "home_cleaning",
          color: " #ffffff ",
          borderColor: " #123456 ",
          backgroundColor: " #222222 ",
          iconColor: "#abcdef",
          items: [
            itemBuilder({
              id: 1,
              sectionId: 30,
              title: "Transparent pricing",
              subtitle: "No hidden charges",
              value: "Always",
              icon: "price",
              color: "#ffffff",
              borderColor: "#112233",
              backgroundColor: "#223344",
              iconColor: "#334455",
            }),
            itemBuilder({
              id: 2,
              sectionId: 30,
              title: "Flexible schedule",
              icon: "n/a",
              iconColor: "invalid-color",
            }),
          ],
        }),
        sectionBuilder({
          id: 40,
          type: "HIGHLIGHTS",
          title: "Service highlights",
          subtitle: "Built around you",
          icon: "highlights",
          items: [
            itemBuilder({
              id: 1,
              sectionId: 40,
              title: "Professional service",
              subtitle: "Trained specialists",
              value: "Included",
              icon: "professional",
              backgroundColor: "#445566",
            }),
            itemBuilder({
              id: 2,
              sectionId: 40,
              title: "Recurring plan",
              icon: "subscription",
              iconColor: "#123456",
            }),
          ],
        }),
      ],
    });

    const view = await render(<DynamicHomeSections />);

    expect(view.getByText("Clean home promise")).toBeTruthy();
    expect(view.getByText("A better day starts here")).toBeTruthy();
    expect(view.getByText("Transparent pricing")).toBeTruthy();
    expect(view.getByText("No hidden charges")).toBeTruthy();
    expect(view.getByText("Always")).toBeTruthy();
    expect(view.getByText("Flexible schedule")).toBeTruthy();
    expect(view.getByText("Service highlights")).toBeTruthy();
    expect(view.getByText("Built around you")).toBeTruthy();
    expect(view.getByText("Professional service")).toBeTruthy();
    expect(view.getByText("Trained specialists")).toBeTruthy();
    expect(view.getByText("Included")).toBeTruthy();
    expect(view.getByText("Recurring plan")).toBeTruthy();
  });

  it("renders a tagline without optional title, subtitle or items", async () => {
    mockUseHomeSections.mockReturnValue({
      loading: false,
      error: null,
      reload: mockReload,
      sections: [
        sectionBuilder({
          type: "TAGLINE",
          title: null,
          subtitle: null,
          icon: null,
          items: [],
        }),
      ],
    });

    const view = await render(<DynamicHomeSections />);

    expect(view.toJSON()).not.toBeNull();
  });

  it("ignores unsupported BANNERS and CUSTOM section types", async () => {
    mockUseHomeSections.mockReturnValue({
      loading: false,
      error: null,
      reload: mockReload,
      sections: [
        sectionBuilder({ id: 50, type: "BANNERS", title: "Banner section" }),
        sectionBuilder({ id: 51, type: "CUSTOM", title: "Custom section" }),
      ],
    });

    const view = await render(<DynamicHomeSections />);

    expect(view.queryByText("Banner section")).toBeNull();
    expect(view.queryByText("Custom section")).toBeNull();
  });
});
