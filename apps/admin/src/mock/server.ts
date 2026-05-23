// src/mock/server.ts (optional mock if backend missing)
import axios from "axios";

axios.interceptors.request.use(async (config) => {
  if (config.url?.includes("/api/admin/users")) {
    const page = Number(config.params.page || 1);
    const limit = Number(config.params.limit || 10);

    const mock = Array.from({ length: 100 }).map((_, i) => ({
      id: i + 1,
      name: "User " + (i + 1),
      phone: "98XXXXXXX",
      location: "Noida",
      role: i % 2 ? "CUSTOMER" : "PARTNER",
      bookings: Math.floor(Math.random() * 50),
      status: i % 3 ? "ACTIVE" : "BLOCKED",
    }));

    const start = (page - 1) * limit;
    const paginated = mock.slice(start, start + limit);

    return {
      ...config,
      adapter: async () => ({
        data: {
          data: paginated,
          total: mock.length,
          page,
          limit,
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      }),
    };
  }
  return config;
});

