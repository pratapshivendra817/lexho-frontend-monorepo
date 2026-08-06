import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StatusToggle } from "@/features/serviceable-areas/components/StatusToggle";

describe("StatusToggle", () => {
  it("renders checked and unchecked states and toggles value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<StatusToggle checked={false} onChange={onChange} />);

    const toggle = screen.getByRole("switch");
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(<StatusToggle checked disabled onChange={onChange} />);
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});
