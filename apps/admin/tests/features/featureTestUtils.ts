import type { Mock } from "vitest";

export function createQueryClientMock() {
  return {
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
    cancelQueries: vi.fn().mockResolvedValue(undefined),
    getQueriesData: vi.fn(),
    setQueryData: vi.fn(),
  };
}

export function asMock<T extends (...args: any[]) => any>(value: T) {
  return value as unknown as Mock<T>;
}
