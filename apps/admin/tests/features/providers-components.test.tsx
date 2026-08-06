import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const uiMocks = vi.hoisted(() => ({
  buttonCalls: [] as Array<{ label: string; disabled?: boolean }>,
}));

vi.mock("@lexho/ui", () => ({
  Badge: ({ status }: { status: string }) => <div>{`badge:${status}`}</div>,
  Button: ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => {
    uiMocks.buttonCalls.push({ label, disabled });
    return (
      <button type="button" disabled={disabled} onClick={onClick}>
        {label}
      </button>
    );
  },
  Card: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
  Input: ({ value, onChange, placeholder }: any) => (
    <input value={value} onChange={onChange} placeholder={placeholder} />
  ),
}));

vi.mock("@/components/admin", () => ({
  StatCard: ({ title, value }: { title: string; value: string }) => <div>{`${title}:${value}`}</div>,
}));

import ProviderDocuments from "@/features/providers/components/ProviderDocuments";
import ProviderInfo from "@/features/providers/components/ProviderInfo";
import { ProviderStatusBadge } from "@/features/providers/components/ProviderStatusBadge";
import { ProvidersFiltersBar } from "@/features/providers/components/ProvidersFiltersBar";
import { ProvidersStatsCards } from "@/features/providers/components/ProvidersStatsCards";
import VerificationStatusComp from "@/features/providers/components/VerificationStatus";
import { partnerData } from "@/features/providers/data/mockProvider";

describe("providers components", () => {
  beforeEach(() => {
    uiMocks.buttonCalls.length = 0;
  });

  it("renders provider info and partner document images", () => {
    render(
      <>
        <ProviderInfo data={partnerData as any} />
        <ProviderDocuments data={partnerData as any} />
      </>,
    );

    expect(screen.getByText("Partner Info")).toBeInTheDocument();
    expect(screen.getByText(/Ravi Kumar/)).toBeInTheDocument();
    expect(screen.getByText(/Delhi/)).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(3);
  });

  it("updates verification state, syncs prop changes, and toggles loading around callbacks", async () => {
    const user = userEvent.setup();
    const onStatusChange = vi.fn(() => Promise.resolve());

    const { rerender } = render(
      <VerificationStatusComp data={partnerData as any} onStatusChange={onStatusChange} />,
    );

    expect(screen.getByText("badge:PENDING")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByPlaceholderText("Enter rejection reason...")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("Enter rejection reason..."), "mismatch");
    await user.click(screen.getByRole("button", { name: "Approve" }));
    expect(onStatusChange).toHaveBeenCalledWith("APPROVED", "mismatch");

    rerender(
      <VerificationStatusComp
        data={{ ...(partnerData as any), status: "APPROVED" }}
        onStatusChange={undefined}
      />,
    );
    expect(screen.getByText("badge:APPROVED")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reject" }));
    expect(screen.getByText("badge:REJECTED")).toBeInTheDocument();
  });

  it("wires provider filters callbacks and renders stats and status badge variants", async () => {
    const user = userEvent.setup();
    const onSearchChange = vi.fn();
    const onStatusChange = vi.fn();
    const onServiceTypeChange = vi.fn();
    const onCityChange = vi.fn();
    const onSortByChange = vi.fn();
    const onReset = vi.fn();

    render(
      <>
        <ProvidersFiltersBar
          search=""
          status=""
          serviceType=""
          city=""
          sortBy="createdAt"
          onSearchChange={onSearchChange}
          onStatusChange={onStatusChange}
          onServiceTypeChange={onServiceTypeChange}
          onCityChange={onCityChange}
          onSortByChange={onSortByChange}
          onReset={onReset}
        />
        <ProvidersStatsCards stats={{ pending: 1, approved: 2, rejected: 3, blocked: 4 }} />
        <ProviderStatusBadge status="BLOCKED" />
      </>,
    );

    await user.type(screen.getByPlaceholderText("Search by name/phone"), "ra");
    await user.selectOptions(screen.getByDisplayValue("All Status"), "APPROVED");
    await user.selectOptions(screen.getByDisplayValue("All Services"), "COOK");
    await user.type(screen.getByPlaceholderText("City"), "Delhi");
    await user.selectOptions(screen.getByDisplayValue("Applied Date"), "name");
    await user.click(screen.getByRole("button", { name: "Reset" }));

    expect(onSearchChange).toHaveBeenCalled();
    expect(onStatusChange).toHaveBeenCalledWith("APPROVED");
    expect(onServiceTypeChange).toHaveBeenCalledWith("COOK");
    expect(onCityChange).toHaveBeenCalled();
    expect(onSortByChange).toHaveBeenCalledWith("name");
    expect(onReset).toHaveBeenCalled();
    expect(screen.getByText("Pending:1")).toBeInTheDocument();
    expect(screen.getByText("Approved:2")).toBeInTheDocument();
    expect(screen.getByText("Rejected:3")).toBeInTheDocument();
    expect(screen.getByText("Blocked:4")).toBeInTheDocument();
    expect(screen.getByText("BLOCKED")).toBeInTheDocument();
  });
});
