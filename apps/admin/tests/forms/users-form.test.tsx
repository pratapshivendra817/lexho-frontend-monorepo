import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CreateUserPage from "@/features/users/pages/CreateUserPage";
import { renderWithProviders } from "../utils/renderWithProviders";

const mocks = vi.hoisted(() => ({
  createUser: vi.fn(),
  getUsers: vi.fn(),
  blockUser: vi.fn(),
  unblockUser: vi.fn(),
  deleteUser: vi.fn(),
  updateUser: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock("@/features/users/api/usersApi", () => ({
  createUser: mocks.createUser,
  getUsers: mocks.getUsers,
  blockUser: mocks.blockUser,
  unblockUser: mocks.unblockUser,
  deleteUser: mocks.deleteUser,
  updateUser: mocks.updateUser,
  getUserById: mocks.getUserById,
}));

describe("CreateUserPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createUser.mockResolvedValue(undefined);
  });

  it("submits valid create user form and calls API", async () => {
    const user = userEvent.setup();

    renderWithProviders(<CreateUserPage />);

    await user.type(screen.getByLabelText("Name"), "Aman Sharma");
    await user.type(screen.getByLabelText("Email"), "aman@example.com");
    await user.type(screen.getByLabelText("Phone"), "9876543210");
    await user.type(screen.getByLabelText("City"), "Indore");
    await user.selectOptions(screen.getByLabelText("Role"), "PROVIDER");
    await user.selectOptions(screen.getByLabelText("Status"), "ACTIVE");
    await user.click(screen.getByRole("button", { name: "Create User" }));

    await waitFor(() => {
      expect(mocks.createUser).toHaveBeenCalledWith({
        name: "Aman Sharma",
        email: "aman@example.com",
        phone: "9876543210",
        role: "PROVIDER",
        city: "Indore",
        status: "ACTIVE",
      });
    });
  });
});
