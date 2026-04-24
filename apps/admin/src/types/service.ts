export interface Service {
  name: string;
  category: string;
  price: number;
  rating: number;
  bookings: number;
  status: "Active" | "Inactive";
}