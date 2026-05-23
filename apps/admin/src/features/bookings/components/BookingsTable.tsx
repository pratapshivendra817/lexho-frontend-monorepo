import { DataTable } from "@/components/admin";

import type { BookingListItem } from "../types";
import { BookingActionsMenu } from "./BookingActionsMenu";
import { BookingStatusBadge } from "./BookingStatusBadge";

type BookingsTableProps = {
  rows: BookingListItem[];
  activeActionBookingId?: string | null;
  onView: (booking: BookingListItem) => void;
  onEdit: (booking: BookingListItem) => void;
  onCancel: (booking: BookingListItem) => void;
  onDelete: (booking: BookingListItem) => void;
};

export function BookingsTable({
  rows,
  activeActionBookingId,
  onView,
  onEdit,
  onCancel,
  onDelete,
}: BookingsTableProps) {
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.id}
      columns={[
        {
          key: "id",
          header: "Booking ID",
          render: (row) => row.id,
        },
        {
          key: "customer",
          header: "Customer Name",
          render: (row) => row.customerName,
        },
        {
          key: "service",
          header: "Service",
          render: (row) => row.service,
        },
        {
          key: "partner",
          header: "Partner",
          render: (row) => row.partnerName || "Not assigned",
        },
        {
          key: "date",
          header: "Date",
          render: (row) => row.bookingDate,
        },
        {
          key: "amount",
          header: "Amount",
          render: (row) => `INR ${row.amount.toFixed(2)}`,
        },
        {
          key: "status",
          header: "Status",
          render: (row) => <BookingStatusBadge status={row.status} />,
        },
        {
          key: "actions",
          header: "Actions",
          render: (row) => (
            <BookingActionsMenu
              booking={row}
              onView={onView}
              onEdit={onEdit}
              onCancel={onCancel}
              onDelete={onDelete}
              isBusy={activeActionBookingId === row.id}
            />
          ),
        },
      ]}
    />
  );
}


