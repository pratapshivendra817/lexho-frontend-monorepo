import type { Service } from "../types/service";

export const services: Service[] = [
  {
    name: "Bathroom Clean",
    category: "Cleaning",
    price: 199,
    rating: 4.9,
    bookings: 684,
    status: "Active",
  },
  {
    name: "Veg Cook",
    category: "Cook",
    price: 149,
    rating: 4.8,
    bookings: 540,
    status: "Active",
  },
  {
    name: "Floor Mop & Sweep",
    category: "Cleaning",
    price: 149,
    rating: 4.7,
    bookings: 420,
    status: "Active",
  },
  {
    name: "Non-Veg Cook",
    category: "Cook",
    price: 199,
    rating: 4.6,
    bookings: 380,
    status: "Inactive",
  },
];