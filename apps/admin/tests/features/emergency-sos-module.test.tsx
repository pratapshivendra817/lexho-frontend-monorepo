import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component }: { component: unknown }) => <div data-testid="lazy-screen">{String(component)}</div>,
}));

vi.mock("@/features/emergency-sos/pages/EmergencyIncidentsPage", () => ({
  default: () => <div>emergency-incidents-page</div>,
}));

vi.mock("@/features/emergency-sos/pages/EmergencyIncidentDetailsPage", () => ({
  default: () => <div>emergency-incident-details-page</div>,
}));

import {
  emergencySosNavItems,
  emergencySosRouteMeta,
  emergencySosRoutes,
} from "@/features/emergency-sos";

describe("emergency-sos module", () => {
  it("exports navigation, route metadata and routes", () => {
    expect(emergencySosNavItems).toEqual([{ path: "/emergency-sos", label: "Emergency SOS" }]);
    expect(emergencySosRouteMeta).toEqual([
      { pathPrefix: "/emergency-sos", title: "Emergency SOS", breadcrumb: "Emergency / Incidents" },
    ]);
    expect(emergencySosRoutes).toHaveLength(2);
    expect(emergencySosRoutes[0].path).toBe("/emergency-sos");
    expect(emergencySosRoutes[1].path).toBe("/emergency-sos/:eventId");
  });

  it("renders both lazy route elements", () => {
    const { rerender } = render(<>{emergencySosRoutes[0].element}</>);
    expect(screen.getByTestId("lazy-screen")).toBeInTheDocument();

    rerender(<>{emergencySosRoutes[1].element}</>);
    expect(screen.getByTestId("lazy-screen")).toBeInTheDocument();
  });
});
