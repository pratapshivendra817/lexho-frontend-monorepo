import {
  HOME_SERVICE_CATEGORIES,
  SERVICE_CATEGORY_ROUTE_MAP,
  getHomeServiceCategories,
  getServiceCategoryRoute,
} from "../src/utils/serviceCategoryConfig";

describe("utils/serviceCategoryConfig", () => {
  it("builds routes only for navigable categories", () => {
    expect(SERVICE_CATEGORY_ROUTE_MAP).toEqual({
      cook: { routeName: "CookCategory", serviceType: "cook" },
      clean: {
        routeName: "CleaningCategory",
        serviceType: "cleaning",
      },
    });
  });

  it.each([
    ["cook", { routeName: "CookCategory", serviceType: "cook" }],
    [
      "clean",
      { routeName: "CleaningCategory", serviceType: "cleaning" },
    ],
  ])("returns the route for %s", (categoryId, expected) => {
    expect(getServiceCategoryRoute(categoryId)).toEqual(expected);
  });

  it.each(["repair", "missing", "", null, undefined])(
    "returns null for non-routable category %s",
    (categoryId) => {
      expect(getServiceCategoryRoute(categoryId)).toBeNull();
    },
  );

  it("returns display categories without navigation metadata", () => {
    const categories = getHomeServiceCategories();

    expect(categories).toHaveLength(HOME_SERVICE_CATEGORIES.length);
    expect(categories[0]).toEqual(
      expect.objectContaining({
        id: "cook",
        title: "Cook",
        tagline: "Daily meals",
      }),
    );
    categories.forEach((category) => {
      expect(category).not.toHaveProperty("routeName");
      expect(category).not.toHaveProperty("serviceType");
    });
  });

  it("returns fresh category objects", () => {
    const first = getHomeServiceCategories();
    const second = getHomeServiceCategories();

    expect(first).not.toBe(second);
    expect(first[0]).not.toBe(second[0]);
  });
});
