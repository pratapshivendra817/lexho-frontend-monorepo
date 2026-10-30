import { getAssignedActiveOrder, isActiveOrderStatus } from "./partnerDispatch";

it.each(["PARTNER_ASSIGNED", "PARTNER_ACCEPTED"] as const)("restores dispatch status %s as an active job", (status) => {
  const order = { id: 147, status };
  expect(isActiveOrderStatus(status)).toBe(true);
  expect(getAssignedActiveOrder([{ id: 146, status: "COMPLETED" }, order])).toEqual(order);
});

it("does not restore cancelled or completed bookings", () => {
  expect(getAssignedActiveOrder([{ id: 145, status: "CANCELLED" }, { id: 146, status: "COMPLETED" }])).toBeNull();
});
