// components/user/UserActions.tsx
//import { User } from "../../types/user";
import type { User } from "../../types/user";

export default function UserActions({ user }: { user: User }) {
  return (
    <div className="flex gap-3">
      <button className="bg-yellow-600 px-4 py-2 rounded">
        Edit User
      </button>

      {user.status === "ACTIVE" ? (
        <button className="bg-red-600 px-4 py-2 rounded">
          Block User
        </button>
      ) : (
        <button className="bg-green-600 px-4 py-2 rounded">
          Unblock User
        </button>
      )}
    </div>
  );
}