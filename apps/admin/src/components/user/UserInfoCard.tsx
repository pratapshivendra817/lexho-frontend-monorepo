// components/user/UserInfoCard.tsx
//import { User } from "../../types/user";
import type { User } from "../../types/user";

export default function UserInfoCard({ user }: { user: User }) {
  return (
    <div className="bg-[#020617] p-5 rounded-xl shadow">
      <h2 className="text-lg font-semibold mb-4">User Info</h2>

      <p><b>Name:</b> {user.name}</p>
      <p><b>Phone:</b> {user.phone}</p>
      <p><b>Email:</b> {user.email}</p>

      <div className="mt-3 flex gap-3">
        <span className="px-2 py-1 text-xs bg-blue-600 rounded">
          {user.role}
        </span>

        <span className={`px-2 py-1 text-xs rounded ${
          user.status === "ACTIVE"
            ? "bg-green-600"
            : "bg-red-600"
        }`}>
          {user.status}
        </span>
      </div>
    </div>
  );
}