import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PopularServiceModal } from "@/features/popular-services/components/PopularServiceModal";
import { PrimaryButton } from "@/features/popular-services/components/PrimaryButton";
import { ServiceCard } from "@/features/popular-services/components/ServiceCard";

vi.mock("@/components/admin", () => ({
  Modal: ({
    open,
    title,
    children,
    footer,
  }: {
    open: boolean;
    title: string;
    children: React.ReactNode;
    footer: React.ReactNode;
  }) => (open ? <div role="dialog" aria-label={title}>{children}{footer}</div> : null),
}));

describe("popular-services components", () => {
  it("renders primary button tones and disabled state", () => {
    render(
      <>
        <PrimaryButton>Save</PrimaryButton>
        <PrimaryButton tone="danger" disabled>Delete</PrimaryButton>
        <PrimaryButton tone="neutral">Cancel</PrimaryButton>
      </>,
    );

    expect(screen.getByRole("button", { name: "Save" }).className).toContain("bg-blue-600");
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" }).className).toContain("border");
  });

  it("renders service card data with fallback image and debug info", async () => {
    const onMakePopular = vi.fn();
    const item = {
      id: "1",
      name: "Deep Clean",
      imageUrl: "",
      price: 1499,
      rating: 4.2,
      categoryId: "7",
      categoryName: "Cleaning",
    };

    render(<ServiceCard item={item} onMakePopular={onMakePopular} debug />);

    expect(screen.getByRole("img", { name: "Deep Clean" })).toHaveAttribute("src", expect.stringContaining("via.placeholder.com"));
    expect(screen.getByText("INR 1499.00")).toBeInTheDocument();
    expect(screen.getByText("Rating: 4.2")).toBeInTheDocument();
    expect(screen.getByText(/sid:1 \| cid:7 \| c:Cleaning/)).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Make Popular" }));
    expect(onMakePopular).toHaveBeenCalledWith(item);
  });

  it("uses the provided image and hides debug details by default", () => {
    render(
      <ServiceCard
        item={{
          id: "2",
          name: "Cook Assist",
          imageUrl: "https://example.com/cook.png",
          price: 999,
          rating: 4.8,
          categoryId: "",
          categoryName: "",
        }}
        onMakePopular={vi.fn()}
      />,
    );

    expect(screen.getByRole("img", { name: "Cook Assist" })).toHaveAttribute("src", "https://example.com/cook.png");
    expect(screen.queryByText(/sid:2/)).not.toBeInTheDocument();
  });

  it("shows debug fallback values when category metadata is missing", () => {
    render(
      <ServiceCard
        item={{
          id: "3",
          name: "Loose Metadata",
          imageUrl: "",
          price: 499,
          rating: 4.1,
          categoryId: "",
          categoryName: "",
        }}
        onMakePopular={vi.fn()}
        debug
      />,
    );

    expect(screen.getByText(/sid:3 \| cid:- \| c:-/)).toBeInTheDocument();
  });

  it("renders and resets popular-service modal state on open", async () => {
    const onClose = vi.fn();
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    const { rerender } = render(
      <PopularServiceModal
        open
        categories={[
          { id: "1", name: "Cleaning" },
          { id: "2", name: "Cooking" },
        ]}
        service={{ id: "s1", name: "Deep Clean", imageUrl: "", price: 0, rating: 0, categoryId: "1", categoryName: "Cleaning" }}
        defaultCategoryId="1"
        isSubmitting={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByRole("dialog", { name: "Make Popular: Deep Clean" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "0" } });
    expect(screen.getByLabelText("Priority")).toHaveValue(1);

    await user.click(screen.getByRole("button", { name: "Add Popular" }));
    expect(onSubmit).toHaveBeenCalledWith({ categoryId: "2", priority: 1 });

    rerender(
      <PopularServiceModal
        open
        categories={[{ id: "1", name: "Cleaning" }]}
        service={{ id: "s2", name: "Cook", imageUrl: "", price: 0, rating: 0, categoryId: "1", categoryName: "Cooking" }}
        defaultCategoryId="1"
        isSubmitting
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.getByLabelText("Category")).toHaveValue("1");
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("accepts positive priorities and stays hidden when closed", () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <PopularServiceModal
        open={false}
        categories={[{ id: "1", name: "Cleaning" }]}
        service={null}
        defaultCategoryId=""
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(
      <PopularServiceModal
        open
        categories={[{ id: "1", name: "Cleaning" }]}
        service={{ id: "s1", name: "Deep Clean", imageUrl: "", price: 0, rating: 0, categoryId: "1", categoryName: "Cleaning" }}
        defaultCategoryId="1"
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Priority"), { target: { value: "4" } });
    expect(screen.getByLabelText("Priority")).toHaveValue(4);
  });
});
