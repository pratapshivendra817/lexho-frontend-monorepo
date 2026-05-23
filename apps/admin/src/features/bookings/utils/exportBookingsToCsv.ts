import type { BookingListItem } from "../types";

function escapeCsv(value: string | number) {
  const source = String(value ?? "");
  if (source.includes(",") || source.includes("\n") || source.includes('"')) {
    return `"${source.replaceAll('"', '""')}"`;
  }
  return source;
}

export function exportBookingsToCsv(rows: BookingListItem[]) {
  const headers = [
    "Booking ID",
    "Customer Name",
    "Service",
    "Partner",
    "Date",
    "Amount",
    "Status",
  ];

  const lines = rows.map((row) =>
    [
      row.id,
      row.customerName,
      row.service,
      row.partnerName,
      row.bookingDate,
      row.amount,
      row.status,
    ]
      .map(escapeCsv)
      .join(","),
  );

  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();

  URL.revokeObjectURL(objectUrl);
}


