import { lazy } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LazyScreen } from "@/navigation/LazyScreen";

describe("LazyScreen", () => {
  it("renders a regular component immediately", () => {
    const SyncScreen = () => <div>Dashboard Module</div>;

    render(<LazyScreen component={SyncScreen} />);

    expect(screen.getByText("Dashboard Module")).toBeInTheDocument();
    expect(screen.queryByText("Loading module...")).not.toBeInTheDocument();
  });

  it("shows the suspense fallback while a lazy component is still loading", () => {
    const DeferredScreen = lazy(
      () =>
        new Promise<{ default: () => JSX.Element }>(() => {
          // Keep the promise pending so Suspense stays on the fallback branch.
        }),
    );

    render(<LazyScreen component={DeferredScreen} />);

    expect(screen.getByText("Loading module...")).toBeInTheDocument();
  });
});
