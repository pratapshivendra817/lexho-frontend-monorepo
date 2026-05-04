import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

type RenderWithProvidersOptions = {
  route?: string;
  path?: string;
};

export function renderWithProviders(ui: ReactNode, options?: RenderWithProvidersOptions) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const route = options?.route ?? "/";

  if (options?.path) {
    return render(
      <MemoryRouter initialEntries={[route]}>
        <QueryClientProvider client={queryClient}>
          <Routes>
            <Route path={options.path} element={<>{ui}</>} />
          </Routes>
        </QueryClientProvider>
      </MemoryRouter>,
    );
  }

  return render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}
