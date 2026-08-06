import { renderHook } from "@testing-library/react-native";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const mockUseDispatch = jest.fn();
const mockUseSelector = jest.fn();

jest.mock("react-redux", () => ({
  useDispatch: jest.fn(() => mockUseDispatch()),
  useSelector: jest.fn((selector) => mockUseSelector(selector)),
}));

import { useAppDispatch, useAppSelector } from "./useRedux";

describe("useRedux hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDispatch.mockReturnValue("dispatch-fn");
    mockUseSelector.mockImplementation((selector) => selector({ partner: { online: true }, calls: { current: null } }));
  });

  it("returns the wrapped redux dispatch", async () => {
    const { result } = await renderHook(() => useAppDispatch());

    expect(result.current).toBe("dispatch-fn");
    expect(mockUseDispatch).toHaveBeenCalledTimes(1);
  });

  it("delegates selectors and returns selected state across rerenders", async () => {
    const selectOnline = jest.fn((state: any) => state.partner.online);
    const { result, rerender } = await renderHook(() => useAppSelector(selectOnline));

    expect(result.current).toBe(true);
    expect(selectOnline).toHaveBeenCalledWith({ partner: { online: true }, calls: { current: null } });

    mockUseSelector.mockImplementationOnce((selector) => selector({ partner: { online: false }, calls: { current: { id: 1 } } }));
    await rerender(undefined);

    expect(result.current).toBe(false);
  });
});
