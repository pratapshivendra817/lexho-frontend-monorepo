import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { __resetApiCacheForTests } from "../api";

afterEach(() => {
  cleanup();
  __resetApiCacheForTests();
  vi.restoreAllMocks();
});
