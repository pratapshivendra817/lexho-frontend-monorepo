import {
  PROFILE_MENU_ITEMS,
  getProfileMenuItem,
} from "../src/utils/profileMenuConfig";

describe("utils/profileMenuConfig", () => {
  it("exposes the complete ordered profile menu", () => {
    expect(PROFILE_MENU_ITEMS.map((item) => item.id)).toEqual([
      "address",
      "rating",
      "refer",
      "about",
      "terms",
      "privacy",
      "support",
      "logout",
    ]);
    expect(PROFILE_MENU_ITEMS.at(-1)).toEqual(
      expect.objectContaining({ id: "logout", isLogout: true }),
    );
  });

  it.each(["address", "support", "logout"])(
    "finds the %s menu item",
    (itemId) => {
      expect(getProfileMenuItem(itemId)).toBe(
        PROFILE_MENU_ITEMS.find((item) => item.id === itemId),
      );
    },
  );

  it.each(["missing", "", null, undefined])(
    "returns null for unknown item %s",
    (itemId) => {
      expect(getProfileMenuItem(itemId)).toBeNull();
    },
  );
});
