// src/pages/UsersPage.tsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useUsers } from "../hooks/useUsers";
import { useDebounce } from "../hooks/useDebounce";

import UserFilters from "../components/UserFilters";
import UserTable from "../components/UserTable";

// ✅ fallback dummy data
import { usersData } from "../data/usersData";


export default function UsersPage() {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");

  const debouncedSearch = useDebounce(search);

  // ✅ API call
  const { data, isLoading, refetch } = useUsers({
    page,
    limit: 10,
    role:
      activeTab === "CUSTOMER"
        ? "customer"
        : activeTab === "PROVIDER"
        ? "provider"
        : undefined,
    search: debouncedSearch,
  });

  // ✅ Normalize API response (handles multiple backend formats)
  const users =
    data?.data ||
    data?.content ||
    data?.users ||
    usersData; // fallback

  const total =
    data?.total ||
    data?.totalElements ||
    users.length;

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] text-white p-6">
      
      {/* Header */}
      <h1 className="text-2xl font-bold">User Management</h1>
      <p className="text-gray-400 mb-4">
        Customers & Service Providers
      </p>

      {/* Filters */}
      <UserFilters
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        search={search}
        setSearch={setSearch}
      />

      {/* Loading */}
      {isLoading ? (
        <div className="text-center py-10">Loading...</div>
      ) : users.length === 0 ? (
        // ✅ Empty State
        <div className="text-center py-10 text-gray-400">
          No users found
        </div>
      ) : (
        <>
          {/* Table */}
          <UserTable
            data={users}
            refetch={refetch}
            onView={(id: string) => navigate(`/users/${id}`)} // 👁️ navigation
          />

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <span>
              Showing {(page - 1) * 10 + 1}–
              {Math.min(page * 10, total)} of {total} users
            </span>

            <div className="flex gap-2">
              
              {/* Prev */}
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-800 rounded disabled:opacity-50"
              >
                Prev
              </button>

              {/* Pages */}
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`px-3 py-1 rounded ${
                    page === i + 1
                      ? "bg-purple-600"
                      : "bg-gray-800"
                  }`}
                >
                  {i + 1}
                </button>
              ))}

              {/* Next */}
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 bg-gray-800 rounded disabled:opacity-50"
              >
                Next
              </button>

            </div>
          </div>
        </>
      )}
    </div>
  );
}