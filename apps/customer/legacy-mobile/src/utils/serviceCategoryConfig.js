export const HOME_SERVICE_CATEGORIES = [
  {
    id: "cook",
    title: "Cook",
    icon: "cook",
    tintColor: "#22C55E",
    tagline: "Daily meals",
    routeName: "CookCategory",
    serviceType: "cook",
  },
  {
    id: "clean",
    title: "Clean",
    icon: "clean",
    tintColor: "#38BDF8",
    tagline: "Home care",
    featured: true,
    routeName: "CleaningCategory",
    serviceType: "cleaning",
  },
  {
    id: "repair",
    title: "Repair",
    icon: "repair",
    tintColor: "#F97316",
    tagline: "Quick fixes",
  },
  {
    id: "beauty",
    title: "Beauty",
    icon: "beauty",
    tintColor: "#A855F7",
    tagline: "Salon care",
  },
  {
    id: "appliance",
    title: "Appliance",
    icon: "appliance",
    tintColor: "#F59E0B",
    tagline: "Expert help",
  },
];

export const SERVICE_CATEGORY_ROUTE_MAP = HOME_SERVICE_CATEGORIES.reduce(
  (routeMap, category) => {
    if (category.routeName) {
      routeMap[category.id] = {
        routeName: category.routeName,
        serviceType: category.serviceType,
      };
    }

    return routeMap;
  },
  {},
);

export function getServiceCategoryRoute(categoryId) {
  return SERVICE_CATEGORY_ROUTE_MAP[categoryId] || null;
}

export function getHomeServiceCategories() {
  return HOME_SERVICE_CATEGORIES.map(({ routeName, serviceType, ...category }) => ({
    ...category,
  }));
}
