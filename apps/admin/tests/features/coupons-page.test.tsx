import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CouponsPage from "@/features/coupons/pages/CouponsPage";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn() }));
vi.mock("@/api/axios", () => ({ api }));
const campaign = {
  code: "DIWALI20", title: "Diwali 20% Off", description: "Festive campaign", discountType: "PERCENTAGE", discountValue: 20,
  maxDiscountAmount: 100, minimumPurchaseAmount: 499, totalUsageLimit: 1000, perUserUsageLimit: 1,
  maxUsesPerDay: 100, validFrom: "2026-09-13T00:00:00", validUntil: "2026-09-30T23:59:59",
  active: true, customerVisible: true, firstBookingOnly: false, applicableServiceId: null,
  applicableCategoryId: null, applicableBookingType: "INSTANT",
};
function mount() {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><CouponsPage /></QueryClientProvider>);
}
function fill(label: string, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }); }

describe("coupon campaigns", () => {
  beforeEach(() => { vi.resetAllMocks(); api.get.mockResolvedValue({ data: [] }); api.post.mockResolvedValue({}); api.put.mockResolvedValue({}); });
  it("creates a campaign with all fields and firstBookingOnly false by default", async () => {
    mount();
    await screen.findByText("No coupons found.");
    expect(screen.getByRole("switch", { name: /First booking only/ })).not.toBeChecked();
    fill("Code", "DIWALI20"); fill("Title", campaign.title); fill("Description", campaign.description);
    fill("Maximum discount amount (optional)", "100"); fill("Minimum purchase amount", "499");
    fill("Total usage limit (optional)", "1000"); fill("Daily global usage limit (optional)", "100");
    fill("Valid from", campaign.validFrom); fill("Valid until", campaign.validUntil); fill("Booking type", "INSTANT");
    fireEvent.click(screen.getByRole("button", { name: "Save coupon" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/admin/coupons", campaign));
  });
  it("preserves welcome eligibility on edit and allows switching it off", async () => {
    api.get.mockResolvedValue({ data: { data: { content: [{ ...campaign, id: 7, firstBookingOnly: true, customerVisible: false, applicableServiceId: 11, applicableCategoryId: 3 }] } } });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Edit DIWALI20" }));
    expect(screen.getByRole("switch", { name: /First booking only/ })).toBeChecked();
    expect(screen.getByRole("switch", { name: /Show in customer app/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole("switch", { name: /First booking only/ }));
    fill("Daily global usage limit (optional)", "");
    fireEvent.click(screen.getByRole("button", { name: "Save coupon" }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/api/admin/coupons/7", { ...campaign, customerVisible: false, maxUsesPerDay: null, applicableServiceId: 11, applicableCategoryId: 3 }));
  });
});
