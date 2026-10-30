import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

type MockResponse = { ok?: boolean; status?: number; body?: unknown };

function jsonResponse({ ok = true, status = 200, body = {} }: MockResponse = {}) {
  return Promise.resolve({
    ok,
    status,
    json: async () => body,
  });
}

function installFetchMock(routes: Record<string, MockResponse | (() => MockResponse)>) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const path = url.replace(/^https?:\/\/[^/]+/, "");
    const resolver = routes[path];

    if (!resolver) {
      return jsonResponse({ ok: false, status: 404, body: {} });
    }

    return jsonResponse(typeof resolver === "function" ? resolver() : resolver);
  });

  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderAppAt(pathname = "/", state: unknown = {}) {
  window.history.pushState({ usr: state, key: "test", idx: 0 }, "", pathname);
  return render(<App />);
}

describe("manage data", () => {
  function fillDeletionForm() {
    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Test Customer" } });
    fireEvent.change(screen.getByLabelText("Registered phone number"), { target: { value: "+91 9876543210" } });
    fireEvent.change(screen.getByLabelText("Contact email"), { target: { value: "customer@example.com" } });
    fireEvent.click(screen.getByRole("checkbox"));
  }

  it("replaces removed footer links with Manage data", async () => {
    installFetchMock({});
    renderAppAt("/");
    await act(async () => {});
    expect(screen.queryByRole("link", { name: "Cookies" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Disclaimer" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Grievance" })).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Manage data" }));
    expect(screen.getByRole("heading", { name: "Manage data" })).toBeTruthy();
  });

  it.each(["/cookie-policy", "/disclaimer", "/grievance"])("removes the %s page", async (path) => {
    installFetchMock({});
    renderAppAt(path);
    await act(async () => {});
    expect(screen.getByRole("heading", { name: "That page isn't here." })).toBeTruthy();
  });

  it("sends the deletion request to support and confirms receipt", async () => {
    const fetchMock = installFetchMock({ "/api/public/support/tickets": { status: 201 } });
    renderAppAt("/manage-data");
    await act(async () => {});
    fillDeletionForm();
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "No longer needed" } });
    fireEvent.click(screen.getByRole("button", { name: "Request account deletion" }));
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.getByText(/Your account has not been deleted yet/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/public/support/tickets"), expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        name: "Test Customer", email: "customer@example.com", phone: "+91 9876543210",
        subject: "Account deletion request",
        message: "I request deletion of my Lexho account and associated personal data.\nSubmitted through the website Manage data page.\nI understand this request requires review and verification of account ownership.\nReason: No longer needed",
      }),
    }));
  });

  it("requires confirmation and rejects invalid phone numbers without sending", async () => {
    const fetchMock = installFetchMock({});
    renderAppAt("/manage-data");
    await act(async () => {});
    fillDeletionForm();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.submit(screen.getByRole("form"));
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/support/tickets"))).toBe(false);
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.change(screen.getByLabelText("Registered phone number"), { target: { value: "invalid phone" } });
    fireEvent.submit(screen.getByRole("form"));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/support/tickets"))).toBe(false);
  });

  it("preserves form details after failure and allows retry", async () => {
    let fail = true;
    installFetchMock({ "/api/public/support/tickets": () => ({ ok: !fail, status: fail ? 503 : 201 }) });
    renderAppAt("/manage-data");
    await act(async () => {});
    fillDeletionForm();
    fireEvent.click(screen.getByRole("button", { name: "Request account deletion" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect((screen.getByLabelText("Contact email") as HTMLInputElement).value).toBe("customer@example.com");
    expect(screen.queryByRole("status")).toBeNull();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Request account deletion" }));
    await waitFor(() => expect(screen.getByRole("status")).toBeTruthy());
  });
});

describe("website header navigation", () => {
  it("renders services and cities navigation in the header", async () => {
    installFetchMock({
      "/api/public/social-media": { body: { data: [] } },
      "/api/v1/legal/about": { ok: false, status: 404, body: {} },
      "/api/public/website/services/categories": { body: { data: [{ id: 1, name: "Cleaning", slug: "cleaning" }] } },
      "/api/public/website/services/categories/cleaning/services": { body: { data: [{ id: 101, name: "Deep Cleaning", slug: "deep-cleaning" }] } },
      "/api/public/website/cities": { body: { data: [{ id: 1, name: "Delhi", slug: "delhi" }] } },
      "/api/public/website/cities/delhi/areas": { body: { data: [{ id: 1, name: "Saket", slug: "saket" }] } },
    });

    renderAppAt("/");
    await act(async () => {});

    fireEvent.click(screen.getAllByRole("button", { name: /our services/i })[0]);
    expect((await screen.findAllByRole("button", { name: /cleaning/i })).length).toBeGreaterThan(0);

    fireEvent.click(screen.getAllByRole("button", { name: /^cities/i })[0]);
    expect((await screen.findAllByRole("button", { name: /delhi/i })).length).toBeGreaterThan(0);
  });

  it("navigates to the service detail page and loads existing service data", async () => {
    installFetchMock({
      "/api/public/social-media": { body: { data: [] } },
      "/api/v1/legal/about": { ok: false, status: 404, body: {} },
      "/api/customer/services/101": {
        body: {
          data: {
            serviceId: 101,
            serviceName: "Home Deep Cleaning",
            description: "A detailed cleaning visit for the whole home.",
            price: 1499,
            included: ["Kitchen", "Bathrooms"],
            instructions: ["Keep the area accessible"],
            faqs: ["How long does it take?"],
          },
        },
      },
      "/api/services/101": {
        body: {
          data: {
            serviceId: 101,
            serviceName: "Home Deep Cleaning",
            description: "A detailed cleaning visit for the whole home.",
            price: 1499,
            included: ["Kitchen", "Bathrooms"],
            instructions: ["Keep the area accessible"],
            faqs: ["How long does it take?"],
          },
        },
      },
      "/api/customer/services/101/details": { ok: false, status: 404, body: {} },
      "/api/services/101/details": { ok: false, status: 404, body: {} },
      "/api/customer/services/home-deep-cleaning": { ok: false, status: 404, body: {} },
      "/api/services/home-deep-cleaning": { ok: false, status: 404, body: {} },
    });

    renderAppAt("/services/home-deep-cleaning", { serviceId: 101, serviceName: "Home Deep Cleaning" });

    expect(await screen.findByRole("heading", { name: /home deep cleaning/i })).toBeTruthy();
    expect(screen.getAllByText(/a detailed cleaning visit for the whole home\./i).length).toBeGreaterThan(0);
    expect(screen.getByText(/starting at/i)).toBeTruthy();
  });
});
