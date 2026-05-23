import { useMemo, useState } from "react";
import axios from "axios";

import { api } from "@/api/axios";
import { appConfig } from "@/config";

type CheckMethod = "GET" | "POST" | "PUT" | "DELETE";
type CheckResultStatus = "idle" | "running" | "success" | "error" | "manual";

type EndpointCheck = {
  key: string;
  method: CheckMethod;
  path: string;
  kind: "auto" | "manual";
  note?: string;
  body?: Record<string, unknown>;
  acceptableStatuses?: number[];
};

type CheckResult = {
  status: CheckResultStatus;
  httpStatus?: number;
  message?: string;
  checkedAt?: string;
};

const checks: EndpointCheck[] = [
  {
    key: "admin-login",
    method: "POST",
    path: "/api/admin/login",
    kind: "auto",
    body: {},
    acceptableStatuses: [400, 401],
    note: "400/401 is acceptable for readiness without valid credentials.",
  },
  {
    key: "admin-verify-otp",
    method: "POST",
    path: "/api/admin/verify-otp",
    kind: "auto",
    body: {},
    acceptableStatuses: [400, 401],
    note: "400/401 is acceptable for readiness without valid OTP.",
  },
  { key: "dashboard-stats", method: "GET", path: "/api/admin/dashboard/stats", kind: "auto" },
  { key: "dashboard-revenue", method: "GET", path: "/api/admin/dashboard/revenue", kind: "auto" },
  {
    key: "dashboard-services-distribution",
    method: "GET",
    path: "/api/admin/dashboard/services-distribution",
    kind: "auto",
  },
  { key: "users", method: "GET", path: "/api/admin/users?page=1&limit=5", kind: "auto" },
  { key: "bookings", method: "GET", path: "/api/admin/bookings?page=1&limit=5", kind: "auto" },
  { key: "partners", method: "GET", path: "/api/admin/partners?page=0&size=10&sortBy=createdAt&sortDir=desc", kind: "auto" },
  { key: "services", method: "GET", path: "/api/admin/services", kind: "auto" },
  { key: "banners", method: "GET", path: "/api/admin/banners?page=0&size=5", kind: "auto" },
  { key: "reviews", method: "GET", path: "/api/admin/reviews", kind: "auto" },
  { key: "notifications", method: "GET", path: "/api/admin/notifications", kind: "auto" },
  { key: "payouts", method: "GET", path: "/api/admin/payouts", kind: "auto" },
  { key: "activity-logs", method: "GET", path: "/api/admin/activity-logs", kind: "auto" },
  { key: "support-tickets", method: "GET", path: "/api/admin/support/tickets", kind: "auto" },
  {
    key: "users-id",
    method: "GET",
    path: "/api/admin/users/:id",
    kind: "manual",
    note: "Requires real id from your DB.",
  },
  {
    key: "bookings-id",
    method: "GET",
    path: "/api/admin/bookings/:id",
    kind: "manual",
    note: "Requires real id from your DB.",
  },
  {
    key: "partners-id",
    method: "GET",
    path: "/api/admin/partners/:id",
    kind: "manual",
    note: "Requires real id from your DB.",
  },
  {
    key: "partners-stats",
    method: "GET",
    path: "/api/admin/partners/stats",
    kind: "manual",
    note: "Covered by partners stats UI API; listed for explicit partner endpoint tracking.",
  },
  {
    key: "partners-approve",
    method: "PUT",
    path: "/api/admin/partners/:id/approve",
    kind: "manual",
    note: "Mutation endpoint, kept manual to avoid side effects.",
  },
  {
    key: "partners-reject",
    method: "PUT",
    path: "/api/admin/partners/:id/reject",
    kind: "manual",
    body: { reason: "KYC mismatch" },
    note: "Mutation endpoint, kept manual to avoid side effects.",
  },
  {
    key: "partners-block",
    method: "PUT",
    path: "/api/admin/partners/:id/block",
    kind: "manual",
    body: { reason: "Policy violation" },
    note: "Mutation endpoint, kept manual to avoid side effects.",
  },
  {
    key: "partners-unblock",
    method: "PUT",
    path: "/api/admin/partners/:id/unblock",
    kind: "manual",
    note: "Mutation endpoint, kept manual to avoid side effects.",
  },
  {
    key: "partners-delete",
    method: "DELETE",
    path: "/api/admin/partners/:id",
    kind: "manual",
    note: "Mutation endpoint, kept manual to avoid side effects.",
  },
  {
    key: "partners-document-download",
    method: "GET",
    path: "/api/admin/partners/:partnerId/documents/:documentId/download",
    kind: "manual",
    note: "Requires real partner/document IDs.",
  },
  {
    key: "users-toggle",
    method: "POST",
    path: "/api/admin/users/:id/toggle",
    kind: "manual",
    note: "Mutation endpoint, kept manual to avoid side effects.",
  },
  {
    key: "partners-verification",
    method: "POST",
    path: "/api/admin/partners/:id/verification",
    kind: "manual",
    note: "Mutation endpoint, kept manual to avoid side effects.",
  },
  {
    key: "reviews-flag",
    method: "POST",
    path: "/api/admin/reviews/:id/flag",
    kind: "manual",
    note: "Mutation endpoint, kept manual to avoid side effects.",
  },
  {
    key: "notifications-create",
    method: "POST",
    path: "/api/admin/notifications",
    kind: "manual",
    note: "Mutation endpoint, kept manual to avoid side effects.",
  },
  {
    key: "support-status",
    method: "POST",
    path: "/api/admin/support/tickets/:id/status",
    kind: "manual",
    note: "Mutation endpoint, kept manual to avoid side effects.",
  },
  {
    key: "support-reply",
    method: "POST",
    path: "/api/admin/support/tickets/:id/reply",
    kind: "manual",
    note: "Mutation endpoint, kept manual to avoid side effects.",
  },
];

const probeClient = axios.create({
  baseURL: appConfig.apiBaseUrl,
  timeout: 15000,
});

function defaultResults() {
  const initial: Record<string, CheckResult> = {};
  checks.forEach((check) => {
    initial[check.key] = {
      status: check.kind === "manual" ? "manual" : "idle",
    };
  });
  return initial;
}

export default function ApiReadinessPage() {
  const [results, setResults] = useState<Record<string, CheckResult>>(defaultResults);
  const [isRunningAll, setIsRunningAll] = useState(false);

  const autoChecks = useMemo(() => checks.filter((check) => check.kind === "auto"), []);

  const runCheck = async (check: EndpointCheck) => {
    setResults((prev) => ({
      ...prev,
      [check.key]: {
        status: "running",
      },
    }));

    try {
      const client = check.path.includes("/login") || check.path.includes("/verify-otp") ? probeClient : api;
      const response =
        check.method === "GET"
          ? await client.get(check.path)
          : await client.post(check.path, check.body ?? {});

      setResults((prev) => ({
        ...prev,
        [check.key]: {
          status: "success",
          httpStatus: response.status,
          message: "OK",
          checkedAt: new Date().toLocaleTimeString(),
        },
      }));
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const httpStatus = error.response?.status;
        const acceptable = check.acceptableStatuses?.includes(httpStatus ?? -1) ?? false;
        const nextStatus: CheckResultStatus = acceptable ? "success" : "error";
        const message =
          typeof error.response?.data === "string"
            ? error.response.data
            : (error.response?.data as { message?: unknown })?.message;

        console.error(
          `[Readiness Check Failed] ${check.method} ${appConfig.apiBaseUrl}${check.path} -> ${httpStatus ?? "NO_STATUS"}`,
          error,
        );

        setResults((prev) => ({
          ...prev,
          [check.key]: {
            status: nextStatus,
            httpStatus,
            message: typeof message === "string" && message.length > 0 ? message : error.message,
            checkedAt: new Date().toLocaleTimeString(),
          },
        }));
        return;
      }

      console.error(
        `[Readiness Check Failed] ${check.method} ${appConfig.apiBaseUrl}${check.path} -> UNKNOWN`,
        error,
      );

      setResults((prev) => ({
        ...prev,
        [check.key]: {
          status: "error",
          message: "Unknown error",
          checkedAt: new Date().toLocaleTimeString(),
        },
      }));
    }
  };

  const runAll = async () => {
    setIsRunningAll(true);
    for (const check of autoChecks) {
      // Sequential checks make backend logs easier to read endpoint-by-endpoint.
      // eslint-disable-next-line no-await-in-loop
      await runCheck(check);
    }
    setIsRunningAll(false);
  };

  const successCount = autoChecks.filter((check) => results[check.key]?.status === "success").length;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Endpoint Readiness</h1>
          <p className="text-sm text-gray-400">Base URL: {appConfig.apiBaseUrl}</p>
        </div>

        <button
          type="button"
          onClick={() => void runAll()}
          disabled={isRunningAll}
          className="rounded bg-purple-600 px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {isRunningAll ? "Running..." : "Run All Auto Checks"}
        </button>
      </div>

      <div className="text-sm text-gray-300">
        Auto checks passed: {successCount} / {autoChecks.length}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-900/80">
            <tr>
              <th className="px-3 py-2">Endpoint</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2">Mode</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">HTTP</th>
              <th className="px-3 py-2">Message</th>
              <th className="px-3 py-2">Checked At</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {checks.map((check) => {
              const result = results[check.key];
              const colorClass =
                result.status === "success"
                  ? "text-emerald-300"
                  : result.status === "error"
                    ? "text-red-300"
                    : result.status === "running"
                      ? "text-yellow-300"
                      : result.status === "manual"
                        ? "text-sky-300"
                        : "text-gray-300";

              return (
                <tr key={check.key} className="border-t border-gray-800">
                  <td className="px-3 py-2">
                    <div className="font-mono text-xs">{check.path}</div>
                    {check.note ? <div className="text-xs text-gray-400">{check.note}</div> : null}
                  </td>
                  <td className="px-3 py-2">{check.method}</td>
                  <td className="px-3 py-2">{check.kind}</td>
                  <td className={`px-3 py-2 capitalize ${colorClass}`}>{result.status}</td>
                  <td className="px-3 py-2">{result.httpStatus ?? "-"}</td>
                  <td className="px-3 py-2 max-w-[340px] truncate">{result.message ?? "-"}</td>
                  <td className="px-3 py-2">{result.checkedAt ?? "-"}</td>
                  <td className="px-3 py-2">
                    {check.kind === "auto" ? (
                      <button
                        type="button"
                        onClick={() => void runCheck(check)}
                        className="rounded bg-gray-700 px-2 py-1 text-xs hover:bg-gray-600"
                      >
                        Retry
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Manual</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


