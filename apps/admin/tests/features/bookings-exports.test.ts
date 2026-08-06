import { beforeEach, describe, expect, it, vi } from "vitest";
import * as bookings from "@/features/bookings";
import * as apiIndex from "@/features/bookings/api";
import * as hooksIndex from "@/features/bookings/hooks";
import * as pagesIndex from "@/features/bookings/pages";
import * as utilsIndex from "@/features/bookings/utils";

const apiMocks = vi.hoisted(() => ({
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("@/api/axios", () => ({
  api: apiMocks,
}));

describe("bookings exports and csv utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("re-exports booking modules and downloads escaped csv content", () => {
    const realDate = global.Date;
    class MockDate extends Date {
      constructor(...args: any[]) {
        super(args.length ? args[0] : "2026-07-15T08:00:00.000Z");
      }
      static now() {
        return new realDate("2026-07-15T08:00:00.000Z").valueOf();
      }
    }
    // @ts-expect-error test override
    global.Date = MockDate;

    const createObjectURL = vi.fn(() => "blob:bookings");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, writable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, writable: true });

    const click = vi.fn();
    const created: Array<{ href?: string; download?: string; click: typeof click }> = [];
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "a") {
        const anchor = { href: "", download: "", click };
        created.push(anchor);
        return anchor as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement);

    expect(bookings.bookingsRoutes).toBeDefined();
    expect(bookings.getBookings).toBe(apiIndex.getBookings);
    expect(bookings.useBookingsQuery).toBe(hooksIndex.useBookingsQuery);
    expect(pagesIndex.BookingsPage).toBeDefined();
    expect(utilsIndex.exportBookingsToCsv).toBeDefined();

    utilsIndex.exportBookingsToCsv([
      {
        id: "bk-1",
        customerName: 'Aman, "Raj"',
        service: "Cleaning",
        serviceType: "CLEANING",
        partnerName: "Ravi",
        bookingDate: "2026-05-01",
        amount: 999,
        status: "PENDING",
      },
    ]);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(created[0].download).toBe("bookings-2026-07-15.csv");
    expect(created[0].href).toBe("blob:bookings");
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:bookings");

    global.Date = realDate;
  }, 10000);

  it("serializes nullish csv values as empty strings", () => {
    const createObjectURL = vi.fn(() => "blob:bookings-empty");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { value: createObjectURL, writable: true });
    Object.defineProperty(URL, "revokeObjectURL", { value: revokeObjectURL, writable: true });

    const click = vi.fn();
    const created: Array<{ href?: string; download?: string; click: typeof click }> = [];
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      if (tag === "a") {
        const anchor = { href: "", download: "", click };
        created.push(anchor);
        return anchor as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tag);
    }) as typeof document.createElement);

    utilsIndex.exportBookingsToCsv([
      {
        id: "bk-2",
        customerName: undefined as unknown as string,
        service: "",
        serviceType: "OTHER",
        partnerName: "",
        bookingDate: "",
        amount: 0,
        status: "CANCELLED",
      },
    ]);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(created[0].href).toBe("blob:bookings-empty");
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:bookings-empty");
  });
});
