// src/components/UserActions.tsx

import { useNavigate } from "react-router-dom";
import type { User } from "../types/user";
import { api } from "../api/axios";
import { toast } from "react-hot-toast";

interface Props {
  user: User;
  refetch: () => void;
}

export default function UserActions({ user, refetch }: Props) {
  const navigate = useNavigate(); // ✅ ADD THIS

  const toggleBlock = async () => {
    await api.post(`/api/admin/users/${user.id}/toggle`);
    toast.success("Updated");
    refetch();
  };

  return (
    <div className="flex gap-2">
      
      {/* ✏️ Edit */}
      <button className="bg-yellow-500 px-2 py-1 rounded">
        ✏️
      </button>

      {/* 🚫 Block / Unblock */}
      <button
        onClick={toggleBlock}
        className="bg-red-500 px-2 py-1 rounded"
      >
        🚫
      </button>

      {/* 👁️ VIEW PROFILE */}
      <button
        onClick={() => navigate(`/users/${user.id}`)} // ✅ MAIN FIX
        className="bg-blue-500 px-2 py-1 rounded"
      >
        👁️
      </button>

    </div>
  );
}