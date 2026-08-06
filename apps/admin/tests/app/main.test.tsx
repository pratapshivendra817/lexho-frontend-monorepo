import { render, screen } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createRoot: vi.fn(),
  render: vi.fn(),
}));

vi.mock("react-dom/client", () => ({
  createRoot: mocks.createRoot,
}));

vi.mock("@/App", () => ({
  default: () => <div data-testid="app-root">app-root</div>,
}));

vi.mock("@/context/AdminThemeProvider", () => ({
  AdminThemeProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

function getRenderedTree() {
  return mocks.render.mock.calls[0]?.[0] as ReactElement;
}

describe("main", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.createRoot.mockReturnValue({ render: mocks.render });
    document.body.innerHTML = "";
  });

  it("creates a root from the #root element and renders App inside StrictMode and the theme provider", async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import("@/main");

    const rootElement = document.getElementById("root");
    expect(mocks.createRoot).toHaveBeenCalledWith(rootElement);

    const tree = getRenderedTree();
    expect(tree.type).toBe(StrictMode);

    render(tree);
    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
    expect(screen.getByTestId("app-root")).toBeInTheDocument();
  });

  it("still looks up the root element even when it is missing", async () => {
    await import("@/main");

    expect(mocks.createRoot).toHaveBeenCalledWith(null);
    expect(mocks.render).toHaveBeenCalledTimes(1);
  });
});
