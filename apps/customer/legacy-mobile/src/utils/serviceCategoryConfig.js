import { COLORS } from '../theme/colors';
export const HOME_SERVICE_CATEGORIES = [
  {
    id: "cook",
    title: "Cook",
    icon: "cook",
    tintColor: COLORS.success,
    tagline: "Daily meals",
    routeName: "CookCategory",
    serviceType: "cook",
  },
  {
    id: "clean",
    title: "Clean",
    icon: "clean",
    tintColor: COLORS.blue400,
    tagline: "Home care",
    featured: true,
    routeName: "CleaningCategory",
    serviceType: "cleaning",
  },
  {
    id: "repair",
    title: "Repair",
    icon: "repair",
    tintColor: COLORS.warning,
    tagline: "Quick fixes",
  },
  {
    id: "beauty",
    title: "Beauty",
    icon: "beauty",
    tintColor: COLORS.blue500,
    tagline: "Salon care",
  },
  {
    id: "appliance",
    title: "Appliance",
    icon: "appliance",
    tintColor: COLORS.warning,
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




