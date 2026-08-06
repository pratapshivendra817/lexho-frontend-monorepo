import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AdminThemeProvider } from "./context/AdminThemeProvider";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminThemeProvider>
      <App />
    </AdminThemeProvider>
  </StrictMode>,
);
