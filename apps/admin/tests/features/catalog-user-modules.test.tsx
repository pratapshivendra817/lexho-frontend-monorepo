import { describe, expect, it, vi } from "vitest";

vi.mock("@/navigation/LazyScreen", () => ({
  LazyScreen: ({ component: Component }: { component: () => JSX.Element }) => <Component />,
}));

vi.mock("@/features/categories/pages/CategoriesPage", () => ({
  default: () => <div>categories-page</div>,
}));

vi.mock("@/features/cleaning-coverage/pages/CleaningCoveragePage", () => ({
  default: () => <div>cleaning-coverage-page</div>,
}));

vi.mock("@/features/users/pages/UsersPage", () => ({
  default: () => <div>users-page</div>,
}));

vi.mock("@/features/users/pages/CreateUserPage", () => ({
  default: () => <div>create-user-page</div>,
}));

vi.mock("@/features/users/pages/EditUserPage", () => ({
  default: () => <div>edit-user-page</div>,
}));

vi.mock("@/features/users/pages/UserDetailsPage", () => ({
  default: () => <div>user-details-page</div>,
}));

describe("catalog and user feature modules", () => {
  it("exposes categories route config and barrel exports", async () => {
    const feature = await import("@/features/categories");

    expect(feature.categoriesRoutes).toEqual([{ path: "/categories", element: expect.any(Object) }]);
    expect(feature.categoriesNavItems).toEqual([{ path: "/categories", label: "Categories" }]);
    expect(feature.categoriesRouteMeta).toEqual([
      { pathPrefix: "/categories", title: "Categories", breadcrumb: "catalog / categories" },
    ]);
  });

  it("exposes cleaning coverage route config and barrel exports", async () => {
    const feature = await import("@/features/cleaning-coverage");

    expect(feature.cleaningCoverageRoutes).toEqual([{ path: "/cleaning-coverage", element: expect.any(Object) }]);
    expect(feature.cleaningCoverageNavItems).toEqual([{ path: "/cleaning-coverage", label: "Cleaning Coverage" }]);
    expect(feature.cleaningCoverageRouteMeta).toEqual([
      {
        pathPrefix: "/cleaning-coverage",
        title: "Cleaning Coverage",
        breadcrumb: "catalog / cleaning coverage",
      },
    ]);
  });

  it("exposes users routes, route meta, and barrel exports", async () => {
    const feature = await import("@/features/users");
    const pages = await import("@/features/users/pages");
    const hooks = await import("@/features/users/hooks");
    const api = await import("@/features/users/api");

    expect(feature.usersRoutes).toHaveLength(1);
    expect(feature.usersRoutes[0]?.path).toBe("/users");
    expect(feature.usersRoutes[0]?.children).toHaveLength(4);
    expect(feature.usersNavItems).toEqual([]);
    expect(feature.usersRouteMeta).toEqual([
      { pathPrefix: "/users/new", title: "Create User", breadcrumb: "users / create" },
      { pathPrefix: "/users/", title: "User Details", breadcrumb: "users / details" },
      { pathPrefix: "/users", title: "Users", breadcrumb: "users" },
    ]);
    expect(feature.getUsers).toBeTypeOf("function");
    expect(feature.useUsersQuery).toBeTypeOf("function");
    expect(pages.UsersPage).toBeTypeOf("function");
    expect(pages.CreateUserPage).toBeTypeOf("function");
    expect(pages.EditUserPage).toBeTypeOf("function");
    expect(pages.UserDetailsPage).toBeTypeOf("function");
    expect(hooks.useUserDetailsQuery).toBeTypeOf("function");
    expect(api.createUser).toBeTypeOf("function");
  });
});
