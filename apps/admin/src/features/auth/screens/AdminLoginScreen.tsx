import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input } from "@lexho/ui";
import { isValidEmail } from "@lexho/utils";
import { validateOtpPayload } from "@lexho/auth";
import toast from "react-hot-toast";

import { setAccessToken } from "@/utils/authSession";
import { requestAdminOtp, verifyAdminOtp } from "../api";

function extractAdminToken(payload: Record<string, unknown> | undefined): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const nestedData =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : null;
  const nestedResult =
    record.result && typeof record.result === "object"
      ? (record.result as Record<string, unknown>)
      : null;

  const token =
    record.token ??
    record.accessToken ??
    record.jwt ??
    record.jwtToken ??
    record.authToken ??
    nestedData?.token ??
    nestedData?.accessToken ??
    nestedData?.jwt ??
    nestedResult?.token ??
    nestedResult?.accessToken ??
    nestedResult?.jwt;

  return typeof token === "string" && token.trim().length > 0 ? token : null;
}

export const AdminLoginScreen = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"PASSWORD" | "OTP">("PASSWORD");

  const submitPassword = () => {
    const normalizedIdentifier = identifier.trim();
    if (!isValidEmail(normalizedIdentifier)) {
      toast.error("Enter a valid email");
      return;
    }

    if (password.trim().length < 6) {
      toast.error("Enter password (minimum 6 characters)");
      return;
    }

    void requestAdminOtp({ identifier: normalizedIdentifier, password })
      .then(() => {
        toast.success("OTP sent");
        setStep("OTP");
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Unable to request OTP");
      });
  };

  const submitOtp = () => {
    const normalizedIdentifier = identifier.trim();
    if (!validateOtpPayload({ email: normalizedIdentifier, otp })) {
      toast.error("Enter valid OTP");
      return;
    }

    void verifyAdminOtp({ identifier: normalizedIdentifier, otp })
      .then((response) => {
        const token = extractAdminToken(response?.data as Record<string, unknown> | undefined);

        if (!token) {
          toast.error("Login response me token nahi mila");
          return;
        }

        setAccessToken(token);
        toast.success("Login successful");
        navigate("/", { replace: true });
      })
      .catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "OTP verification failed");
      });
  };

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 360 }}>
      <Input
        label="Email"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
      />

      {step === "PASSWORD" ? (
        <>
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button onClick={submitPassword}>Request OTP</Button>
        </>
      ) : (
        <>
          <Input label="OTP" value={otp} onChange={(event) => setOtp(event.target.value)} />
          <Button onClick={submitOtp}>Verify OTP</Button>
        </>
      )}
    </div>
  );
};
