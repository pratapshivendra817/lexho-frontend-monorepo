import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cloneElement, isValidElement } from "react";

const mocks = vi.hoisted(() => ({
  sharedConfirmDialog: vi.fn(),
  subscribeApiErrors: vi.fn(),
  getApiRequestLogs: vi.fn(),
  subscribeApiRequestLogs: vi.fn(),
  uploadAdminImage: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  latestDialogOnOpenChange: undefined as ((open: boolean) => void) | undefined,
}));

vi.mock("@lexho/ui", () => ({
  ConfirmDialog: (props: any) => {
    mocks.sharedConfirmDialog(props);
    if (!props.open) return null;
    return (
      <div role="dialog" aria-label={props.title}>
        <p>{props.description}</p>
        <button type="button" onClick={props.onConfirm} disabled={props.isLoading}>
          {props.confirmLabel}
        </button>
        <button type="button" onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    );
  },
}));

vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ open, onOpenChange, children }: any) => {
    mocks.latestDialogOnOpenChange = onOpenChange;
    return (
      <div data-open={String(open)}>
        <button type="button" onClick={() => onOpenChange(false)}>
          Trigger Root Close
        </button>
        {children}
      </div>
    );
  },
  Portal: ({ children }: any) => <>{children}</>,
  Overlay: (props: any) => <div data-testid="modal-overlay" {...props} />,
  Content: ({ children, className, ...props }: any) => (
    <div role="dialog" className={className} {...props}>
      {children}
    </div>
  ),
  Title: ({ children, className }: any) => <h2 className={className}>{children}</h2>,
  Close: ({ children }: any) => {
    if (!isValidElement(children)) {
      return <>{children}</>;
    }
    return cloneElement(children, {
      onClick: (...args: unknown[]) => {
        children.props.onClick?.(...args);
        mocks.latestDialogOnOpenChange?.(false);
      },
    });
  },
}));

vi.mock("@/utils/apiErrorBus", () => ({
  subscribeApiErrors: mocks.subscribeApiErrors,
}));

vi.mock("@/utils/apiRequestLog", () => ({
  getApiRequestLogs: mocks.getApiRequestLogs,
  subscribeApiRequestLogs: mocks.subscribeApiRequestLogs,
}));

vi.mock("@/services/lexhoAdminApi", () => ({
  uploadAdminImage: mocks.uploadAdminImage,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/config", () => ({
  appConfig: {
    adminImageUploadEndpoint: "/api/admin/upload/image",
  },
}));

import {
  ApiDebugPanel,
  ConfirmDialog,
  ErrorFeedbackProvider,
  ImageUrlInput,
  Modal,
  ModalFormLayout,
} from "@/components/admin";

describe("admin shell components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getApiRequestLogs.mockReturnValue([]);
    mocks.subscribeApiErrors.mockImplementation(() => vi.fn());
    mocks.subscribeApiRequestLogs.mockImplementation(() => vi.fn());
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:preview-1"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders ConfirmDialog with default and custom labels and forwards callbacks", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <ConfirmDialog open title="Delete item" description="Are you sure?" onConfirm={onConfirm} onClose={onClose} />,
    );

    expect(screen.getByRole("dialog", { name: "Delete item" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <ConfirmDialog
        open
        title="Archive item"
        description="Still sure?"
        confirmLabel="Archive"
        isLoading
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    expect(screen.getByRole("button", { name: "Archive" })).toBeDisabled();
    expect(mocks.sharedConfirmDialog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        panelClassName: expect.stringContaining("border"),
        confirmButtonClassName: "bg-red-500 text-white",
      }),
    );
  });

  it("renders Modal, closes from root state changes and close button, and shows footer only when provided", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal
        open
        title="Edit Service"
        onClose={onClose}
        footer={<button type="button">Save</button>}
        maxWidthClassName="max-w-xl"
      >
        <div>Modal body</div>
      </Modal>,
    );

    expect(screen.getByRole("heading", { name: "Edit Service" })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveClass("max-w-xl");
    expect(screen.getByText("Modal body")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Trigger Root Close" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);

    rerender(
      <Modal open title="No Footer" onClose={onClose}>
        <div>Only body</div>
      </Modal>,
    );
    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.getByText("Only body")).toBeInTheDocument();
  });

  it("renders ModalFormLayout and forwards cancel, submit, submitting, and width props to Modal", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <ModalFormLayout
        open
        title="Create Banner"
        formId="banner-form"
        submitLabel="Create"
        onClose={onClose}
        maxWidthClassName="max-w-4xl"
      >
        <form id="banner-form">
          <input aria-label="Banner name" />
        </form>
      </ModalFormLayout>,
    );

    expect(screen.getByRole("heading", { name: "Create Banner" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toHaveAttribute("form", "banner-form");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("dialog")).toHaveClass("max-w-4xl");

    rerender(
      <ModalFormLayout
        open
        title="Create Banner"
        formId="banner-form"
        submitLabel="Create"
        isSubmitting
        onClose={onClose}
      >
        <form id="banner-form" />
      </ModalFormLayout>,
    );

    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create" }).querySelector("span")).toBeInTheDocument();
  });

  it("handles ImageUrlInput upload success, preview fallback, no-file early return, and cleanup", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    mocks.uploadAdminImage.mockResolvedValueOnce("https://cdn.lexho.test/uploaded.jpg");

    const { unmount, rerender } = render(
      <ImageUrlInput value="" onChange={onChange} label="Banner Image" />,
    );

    expect(screen.getByText("Upload endpoint: /api/admin/upload/image")).toBeInTheDocument();

    const input = screen.getByLabelText("Banner Image") as HTMLInputElement;
    const file = new File(["abc"], "banner.png", { type: "image/png" });
    await user.upload(input, file);

    await waitFor(() => expect(mocks.uploadAdminImage).toHaveBeenCalledWith(file));
    expect(onChange).toHaveBeenCalledWith("https://cdn.lexho.test/uploaded.jpg");
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Image uploaded successfully");
    expect(input.value).toBe("");

    rerender(<ImageUrlInput value="https://cdn.lexho.test/fallback.jpg" onChange={onChange} />);
    expect(screen.getByRole("img", { name: "Uploaded" })).toHaveAttribute("src", "https://cdn.lexho.test/fallback.jpg");

    await user.upload(input, []);
    expect(mocks.uploadAdminImage).toHaveBeenCalledTimes(1);

    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it("handles ImageUrlInput upload failure and missing object-url support", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    vi.stubGlobal("URL", {
      revokeObjectURL: vi.fn(),
    });
    mocks.uploadAdminImage.mockRejectedValueOnce(new Error("upload failed"));

    render(<ImageUrlInput value="" onChange={onChange} />);
    const input = screen.getByLabelText("Image");
    const file = new File(["bad"], "bad.png", { type: "image/png" });
    await user.upload(input, file);

    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith("Image upload failed (/api/admin/upload/image)"),
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText("Upload endpoint: /api/admin/upload/image")).toBeInTheDocument();
  });

  it("shows ErrorFeedbackProvider toast-only errors, detailed modal errors, and reset flow", async () => {
    let listener: ((error: any) => void) | undefined;
    const unsubscribe = vi.fn();
    mocks.subscribeApiErrors.mockImplementation((next) => {
      listener = next;
      return unsubscribe;
    });

    const user = userEvent.setup();
    const { unmount } = render(
      <ErrorFeedbackProvider>
        <div>Child content</div>
      </ErrorFeedbackProvider>,
    );

    expect(screen.getByText("Child content")).toBeInTheDocument();

    act(() => {
      listener?.({ message: "Simple error" });
    });
    expect(mocks.toastError).toHaveBeenCalledWith("Simple error");
    expect(screen.queryByText("Request failed")).not.toBeInTheDocument();

    act(() => {
      listener?.({
        message: "Detailed error",
        code: "FAIL",
        httpStatus: 500,
        requestId: "req-1",
        correlationId: "corr-1",
        technicalMessage: "stack",
      });
    });

    expect(screen.getByText("Request failed")).toBeInTheDocument();
    expect(screen.getByText("Detailed error")).toBeInTheDocument();
    expect(screen.getByText("FAIL")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("req-1")).toBeInTheDocument();
    expect(screen.getByText("corr-1")).toBeInTheDocument();
    expect(screen.getByText("stack")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByText("Request failed")).not.toBeInTheDocument();

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("renders ApiDebugPanel hidden, empty, populated, and live-updated states", async () => {
    let listener: ((entries: any[]) => void) | undefined;
    const unsubscribe = vi.fn();
    mocks.getApiRequestLogs.mockReturnValueOnce([
      {
        id: "1",
        method: "GET",
        url: "/api/admin/users",
        status: 200,
        durationMs: 25,
        requestId: "req-1",
        correlationId: "corr-1",
        createdAt: "2026-07-15T10:00:00.000Z",
      },
    ]);
    mocks.subscribeApiRequestLogs.mockImplementation((next) => {
      listener = next;
      return unsubscribe;
    });

    const { rerender, unmount } = render(<ApiDebugPanel visible={false} />);
    expect(screen.queryByText("Developer API Logs")).not.toBeInTheDocument();

    rerender(<ApiDebugPanel visible />);
    expect(screen.getByText("Developer API Logs")).toBeInTheDocument();
    expect(screen.getByText(/GET \/api\/admin\/users/)).toBeInTheDocument();
    expect(screen.getByText("200 / 25ms")).toBeInTheDocument();
    expect(screen.getByText("req-1")).toBeInTheDocument();
    expect(screen.getByText("corr-1")).toBeInTheDocument();

    act(() => {
      listener?.([]);
    });
    expect(screen.getByText("No API requests captured yet.")).toBeInTheDocument();

    act(() => {
      listener?.([
        {
          id: "2",
          method: "POST",
          url: "/api/admin/orders",
          errorMessage: "Boom",
          createdAt: "2026-07-15T11:00:00.000Z",
        },
      ]);
    });
    expect(screen.getByText(/POST \/api\/admin\/orders/)).toBeInTheDocument();
    expect(screen.getByText("Boom")).toBeInTheDocument();
    expect(screen.getByText("ERR / 0ms")).toBeInTheDocument();

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
