import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  isValidEmail: vi.fn(),
  validateOtpPayload: vi.fn(),
  requestAdminOtp: vi.fn(),
  verifyAdminOtp: vi.fn(),
  setAccessToken: vi.fn(),
  setRefreshToken: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@lexho/ui", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  Input: ({
    label,
    value,
    onChange,
    type = "text",
  }: {
    label: string;
    value: string;
    type?: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  }) => (
    <label>
      <span>{label}</span>
      <input aria-label={label} value={value} type={type} onChange={onChange} />
    </label>
  ),
}));

vi.mock("@lexho/utils", () => ({
  isValidEmail: mocks.isValidEmail,
}));

vi.mock("@lexho/auth", () => ({
  validateOtpPayload: mocks.validateOtpPayload,
}));

vi.mock("@/features/auth/api", () => ({
  requestAdminOtp: mocks.requestAdminOtp,
  verifyAdminOtp: mocks.verifyAdminOtp,
}));

vi.mock("@/utils/authSession", () => ({
  setAccessToken: mocks.setAccessToken,
  setRefreshToken: mocks.setRefreshToken,
}));

vi.mock("react-hot-toast", () => ({
  default: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

import * as authModule from "@/features/auth";

describe("AdminLoginScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isValidEmail.mockReturnValue(true);
    mocks.validateOtpPayload.mockReturnValue(true);
    mocks.requestAdminOtp.mockResolvedValue(undefined);
    mocks.verifyAdminOtp.mockResolvedValue({ data: { token: "access-token" } });
  });

  it("re-exports auth module members through the feature index", () => {
    expect(authModule).toHaveProperty("AdminLoginScreen");
    expect(authModule).toHaveProperty("requestAdminOtp");
    expect(authModule).toHaveProperty("verifyAdminOtp");
  });

  it("blocks invalid email before requesting OTP", async () => {
    mocks.isValidEmail.mockReturnValue(false);
    const user = userEvent.setup();

    render(<authModule.AdminLoginScreen />);

    await user.type(screen.getByLabelText("Email"), "bad-email");
    await user.click(screen.getByRole("button", { name: "Request OTP" }));

    expect(mocks.toastError).toHaveBeenCalledWith("Enter a valid email");
    expect(mocks.requestAdminOtp).not.toHaveBeenCalled();
  });

  it("blocks short passwords before requesting OTP", async () => {
    const user = userEvent.setup();

    render(<authModule.AdminLoginScreen />);

    await user.type(screen.getByLabelText("Email"), "admin@lexho.com");
    await user.type(screen.getByLabelText("Password"), "12345");
    await user.click(screen.getByRole("button", { name: "Request OTP" }));

    expect(mocks.toastError).toHaveBeenCalledWith("Enter password (minimum 6 characters)");
    expect(mocks.requestAdminOtp).not.toHaveBeenCalled();
  });

  it("requests OTP successfully and switches to the OTP step", async () => {
    const user = userEvent.setup();

    render(<authModule.AdminLoginScreen />);

    await user.type(screen.getByLabelText("Email"), " admin@lexho.com ");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Request OTP" }));

    await waitFor(() => {
      expect(mocks.requestAdminOtp).toHaveBeenCalledWith({
        email: "admin@lexho.com",
        password: "secret123",
      });
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("OTP sent");
    expect(await screen.findByLabelText("OTP")).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });

  it("shows API request errors from Error objects and generic unknown request failures", async () => {
    const user = userEvent.setup();
    mocks.requestAdminOtp.mockRejectedValueOnce(new Error("Wrong credentials"));

    const { rerender } = render(<authModule.AdminLoginScreen />);

    await user.type(screen.getByLabelText("Email"), "admin@lexho.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Request OTP" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Wrong credentials");
    });

    mocks.requestAdminOtp.mockRejectedValueOnce("boom");
    rerender(<authModule.AdminLoginScreen />);

    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "admin@lexho.com");
    await user.clear(screen.getByLabelText("Password"));
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Request OTP" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Unable to request OTP");
    });
  });

  it("blocks invalid OTP payloads before verification", async () => {
    const user = userEvent.setup();
    mocks.validateOtpPayload.mockReturnValue(false);

    render(<authModule.AdminLoginScreen />);

    await user.type(screen.getByLabelText("Email"), "admin@lexho.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Request OTP" }));
    await screen.findByLabelText("OTP");
    await user.type(screen.getByLabelText("OTP"), "12");
    await user.click(screen.getByRole("button", { name: "Verify OTP" }));

    expect(mocks.toastError).toHaveBeenCalledWith("Enter valid OTP");
    expect(mocks.verifyAdminOtp).not.toHaveBeenCalled();
  });

  it("handles missing tokens in the verify response", async () => {
    const user = userEvent.setup();
    mocks.verifyAdminOtp.mockResolvedValueOnce({ data: { result: {} } });

    render(<authModule.AdminLoginScreen />);

    await user.type(screen.getByLabelText("Email"), "admin@lexho.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Request OTP" }));
    await user.type(await screen.findByLabelText("OTP"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify OTP" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Login response me token nahi mila");
    });
    expect(mocks.setAccessToken).not.toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("stores access and refresh tokens from nested payloads and redirects after verify", async () => {
    const user = userEvent.setup();
    mocks.verifyAdminOtp.mockResolvedValueOnce({
      data: {
        data: {
          accessToken: "nested-access",
          refreshToken: "nested-refresh",
        },
      },
    });

    render(<authModule.AdminLoginScreen />);

    await user.type(screen.getByLabelText("Email"), "admin@lexho.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Request OTP" }));
    await user.type(await screen.findByLabelText("OTP"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify OTP" }));

    await waitFor(() => {
      expect(mocks.setAccessToken).toHaveBeenCalledWith("nested-access");
    });
    expect(mocks.setRefreshToken).toHaveBeenCalledWith("nested-refresh");
    expect(mocks.toastSuccess).toHaveBeenCalledWith("Login successful");
    expect(mocks.navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("skips refresh token storage when no usable refresh token exists", async () => {
    const user = userEvent.setup();
    mocks.verifyAdminOtp.mockResolvedValueOnce({
      data: {
        result: {
          jwt: "jwt-token",
          refreshToken: "   ",
        },
      },
    });

    render(<authModule.AdminLoginScreen />);

    await user.type(screen.getByLabelText("Email"), "admin@lexho.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Request OTP" }));
    await user.type(await screen.findByLabelText("OTP"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify OTP" }));

    await waitFor(() => {
      expect(mocks.setAccessToken).toHaveBeenCalledWith("jwt-token");
    });
    expect(mocks.setRefreshToken).not.toHaveBeenCalled();
  });

  it("shows verification failures from Error objects and generic unknown failures", async () => {
    const user = userEvent.setup();

    mocks.verifyAdminOtp.mockRejectedValueOnce(new Error("OTP expired"));
    render(<authModule.AdminLoginScreen />);

    await user.type(screen.getByLabelText("Email"), "admin@lexho.com");
    await user.type(screen.getByLabelText("Password"), "secret123");
    await user.click(screen.getByRole("button", { name: "Request OTP" }));
    await user.type(await screen.findByLabelText("OTP"), "123456");
    await user.click(screen.getByRole("button", { name: "Verify OTP" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("OTP expired");
    });

    mocks.verifyAdminOtp.mockRejectedValueOnce("unexpected");
    render(<authModule.AdminLoginScreen />);

    const emailFields = screen.getAllByLabelText("Email");
    const passwordFields = screen.getAllByLabelText("Password");
    await user.type(emailFields.at(-1) as HTMLElement, "admin@lexho.com");
    await user.type(passwordFields.at(-1) as HTMLElement, "secret123");
    await user.click(screen.getAllByRole("button", { name: "Request OTP" }).at(-1) as HTMLElement);
    const otpFields = await screen.findAllByLabelText("OTP");
    await user.type(otpFields.at(-1) as HTMLElement, "123456");
    await user.click(screen.getAllByRole("button", { name: "Verify OTP" }).at(-1) as HTMLElement);

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("OTP verification failed");
    });
  });
});
