import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import UsersPage from "@/features/users/pages/UsersPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const mocks = vi.hoisted(() => ({
  getUsers: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  deleteUser: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock("@/features/users/api/usersApi", () => ({
  getUsers: mocks.getUsers,
  blockUser: mocks.blockUser,
  unblockUser: mocks.unblockUser,
  deleteUser: mocks.deleteUser,
  createUser: mocks.createUser,
  updateUser: mocks.updateUser,
  getUserById: mocks.getUserById,
}));

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getUsers.mockResolvedValue({
      content: [
        {
          id: "usr-10",
          name: "Rohit",
          email: "rohit@example.com",
          phone: "9000000001",
          role: "CUSTOMER",
          status: "ACTIVE",
          city: "Indore",
          blocked: false,
          createdAt: "",
          updatedAt: "",
        },
      ],
      totalElements: 1,
      totalPages: 1,
      pageNumber: 1,
    });

    mocks.blockUser.mockResolvedValue(undefined);
    mocks.unblockUser.mockResolvedValue(undefined);
    mocks.deleteUser.mockResolvedValue(undefined);
  });

  it("renders users and executes block + delete actions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<UsersPage />);

    expect(await screen.findByText("Rohit")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Block/i }));
    await waitFor(() => {
      expect(mocks.blockUser).toHaveBeenCalledWith("usr-10");
    });

    await user.click(screen.getAllByRole("button", { name: /^Delete$/i })[0]);
    const deleteDialog = await screen.findByRole("dialog", { name: "Delete User" });
    await user.click(within(deleteDialog).getByRole("button", { name: /^Delete$/i }));

    await waitFor(() => {
      expect(mocks.deleteUser).toHaveBeenCalledWith("usr-10");
    });
  });
});
