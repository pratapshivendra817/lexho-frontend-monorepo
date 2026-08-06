import { reverseGeocodeCoordinates } from "../src/utils/reverseGeocode";

describe("utils/reverseGeocode", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.useRealTimers();
  });

  it("maps alternate address fields and defaults the country", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        display_name: "Sector 7A, Rural Area",
        address: {
          neighbourhood: "Neighbourhood",
          city_district: "District",
          town: "Town",
          village: "Village",
          county: "County",
          state: "State",
          postcode: 12345,
        },
      }),
    }) as jest.Mock;

    await expect(reverseGeocodeCoordinates(12.5, 77.6)).resolves.toEqual({
      displayName: "Sector 7A, Rural Area",
      shortName: "Neighbourhood, District, Town",
      area: "Neighbourhood",
      sector: "Sector 7A",
      city: "Town",
      state: "State",
      country: "India",
      pincode: "12345",
    });
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("lat=12.5&lon=77.6"),
      {
        method: "GET",
        headers: { Accept: "application/json" },
      },
    );
  });

  it("uses display name when no short-name fields exist", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        display_name: "Standalone Place",
        address: { country: "" },
      }),
    }) as jest.Mock;

    await expect(reverseGeocodeCoordinates(1, 2)).resolves.toEqual({
      displayName: "Standalone Place",
      shortName: "Standalone Place",
      area: "",
      sector: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
    });
  });

  it("returns null when response JSON rejects", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockRejectedValue(new Error("invalid JSON")),
    }) as jest.Mock;

    await expect(reverseGeocodeCoordinates(1, 2)).resolves.toBeNull();
  });

  it("returns null for invalid coordinates, HTTP errors, and empty data", async () => {
    await expect(
      reverseGeocodeCoordinates(Number.NaN, 2),
    ).resolves.toBeNull();
    await expect(
      reverseGeocodeCoordinates(1, Number.POSITIVE_INFINITY),
    ).resolves.toBeNull();

    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ display_name: "   " }),
      }) as jest.Mock;

    await expect(reverseGeocodeCoordinates(1, 2)).resolves.toBeNull();
    await expect(reverseGeocodeCoordinates(1, 2)).resolves.toBeNull();
  });

  it("returns null when the fetch promise rejects", async () => {
    globalThis.fetch = jest
      .fn()
      .mockRejectedValue(new Error("offline")) as jest.Mock;

    await expect(reverseGeocodeCoordinates(1, 2)).resolves.toBeNull();
  });

  it("returns null after the timeout and clears late resolution safely", async () => {
    jest.useFakeTimers();
    let resolveFetch: ((value: Response) => void) | undefined;
    globalThis.fetch = jest.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const result = reverseGeocodeCoordinates(1, 2);
    await jest.advanceTimersByTimeAsync(6000);

    await expect(result).resolves.toBeNull();
    resolveFetch?.({
      ok: true,
      json: jest.fn(),
    } as unknown as Response);
    await Promise.resolve();
  });
});
