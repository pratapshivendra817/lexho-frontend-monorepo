import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const rows = [
  {
    familySizeId: 1,
    familySize: "SMALL",
    familySizeLabel: "1-2 Members",
    active: true,
    displayOrder: 1,
  },
];

async function renderValidationCase(formOverride: {
  familySize: string;
  familySizeLabel: string;
  active: boolean;
  displayOrder: string;
}) {
  const toastError = vi.fn();

  cleanup();
  vi.resetModules();
  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    let booleanStateUsed = false;
    return {
      ...actual,
      useState: (initial: unknown) => {
        if (!booleanStateUsed && initial === false) {
          booleanStateUsed = true;
          return [true, vi.fn()];
        }
        if (typeof initial === "object" && initial && "familySize" in (initial as Record<string, unknown>)) {
          return [formOverride, vi.fn()];
        }
        return actual.useState(initial);
      },
    };
  });
  vi.doMock("@tanstack/react-query", () => ({
    useQuery: () => ({ data: rows, isLoading: false, isError: false, refetch: vi.fn() }),
    useMutation: () => ({ isPending: false, mutate: vi.fn() }),
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  }));
  vi.doMock("@/components/admin", () => ({
    DataState: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    DataTable: () => <div>table</div>,
    ModalFormLayout: ({
      open,
      title,
      submitLabel,
      isSubmitting,
      children,
    }: {
      open: boolean;
      title: string;
      submitLabel: string;
      isSubmitting: boolean;
      children: React.ReactNode;
    }) =>
      open ? (
        <div>
          <h2>{title}</h2>
          {children}
          <button form="cook-family-size-form" type="submit" disabled={isSubmitting}>
            {submitLabel}
          </button>
        </div>
      ) : null,
    ConfirmDialog: () => null,
  }));
  vi.doMock("react-hot-toast", () => ({
    default: { success: vi.fn(), error: toastError },
  }));
  vi.doMock("@/utils/apiError", () => ({
    extractApiError: vi.fn(),
  }));
  vi.doMock("@/features/cook-family-sizes/api/cookFamilySizesApi", () => ({
    createAdminCookFamilySize: vi.fn(),
    deleteAdminCookFamilySize: vi.fn(),
    getAdminCookFamilySizes: vi.fn(),
    updateAdminCookFamilySize: vi.fn(),
    updateAdminCookFamilySizeStatus: vi.fn(),
  }));

  const { default: CookFamilySizesPage } = await import("@/features/cook-family-sizes/pages/CookFamilySizesPage");
  render(<CookFamilySizesPage />);
  return { toastError };
}

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock("react");
  vi.doUnmock("@tanstack/react-query");
  vi.doUnmock("@/components/admin");
  vi.doUnmock("react-hot-toast");
  vi.doUnmock("@/utils/apiError");
  vi.doUnmock("@/features/cook-family-sizes/api/cookFamilySizesApi");
});

describe("CookFamilySizesPage validation edge cases", () => {
  it("shows validation errors for missing family size and missing label", async () => {
    const user = userEvent.setup();

    const missingFamilySize = await renderValidationCase({
      familySize: "",
      familySizeLabel: "Label",
      active: true,
      displayOrder: "1",
    });
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(missingFamilySize.toastError).toHaveBeenCalledWith("Family size is required");

    const missingLabel = await renderValidationCase({
      familySize: "SMALL",
      familySizeLabel: "   ",
      active: true,
      displayOrder: "1",
    });
    await user.click(screen.getByRole("button", { name: "Create" }));
    expect(missingLabel.toastError).toHaveBeenCalledWith("Family size label is required");
  });
});
