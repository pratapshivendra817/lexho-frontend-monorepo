// src/components/UserTable.tsx

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

import type { ColumnDef } from "@tanstack/react-table";
import type { User } from "../types/user";

import UserActions from "./UserActions";

interface Props {
  data: User[];
  refetch: () => void;
}

export default function UserTable({ data, refetch }: Props) {
  const columns: ColumnDef<User>[] = [
    { accessorKey: "id", header: "#" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "phone", header: "Phone" },
    { accessorKey: "location", header: "Location" },
    { accessorKey: "role", header: "Role" },
    { accessorKey: "bookings", header: "Bookings" },
    {
      accessorKey: "status",
      header: "Status",
      cell: (info) => {
        const status = info.row.original.status;
        return (
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              status === "ACTIVE"
                ? "bg-green-600"
                : "bg-red-600"
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      header: "Actions",
      cell: (info) => (
        <UserActions user={info.row.original} refetch={refetch} />
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <table className="w-full text-left text-white">
      <thead className="bg-purple-700">
        {table.getHeaderGroups().map((hg) => (
          <tr key={hg.id}>
            {hg.headers.map((h) => (
              <th key={h.id} className="p-3">
                {flexRender(
                  h.column.columnDef.header,
                  h.getContext()
                )}
              </th>
            ))}
          </tr>
        ))}
      </thead>

      <tbody className="bg-gray-900">
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id} className="border-b border-gray-800">
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id} className="p-3">
                {flexRender(
                  cell.column.columnDef.cell,
                  cell.getContext()
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}