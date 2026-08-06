const mockReactRedux = {
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
};

jest.mock("react-redux", () => ({
  useDispatch: (...args: any[]) => mockReactRedux.useDispatch(...args),
  useSelector: (...args: any[]) => mockReactRedux.useSelector(...args),
}));

import addressReducer, { fetchAddresses } from "../src/redux/addressSlice";
import authReducer, { clearSessionState, setHydrated, setSession } from "../src/redux/authSlice";
import { store } from "../src/redux/store";
import { useAppDispatch, useAppSelector } from "../src/redux/hooks";

describe("Redux store and typed hooks", () => {
  beforeEach(() => jest.clearAllMocks());

  it("configures every application reducer and accepts normal actions", () => {
    expect(Object.keys(store.getState())).toEqual([
      "auth",
      "home",
      "booking",
      "address",
      "cart",
      "favorites",
      "service",
      "location",
      "customerProfile",
    ]);
    store.dispatch(setHydrated(true));
    expect(store.getState().auth.hydrated).toBe(true);
  });

  it("delegates typed hooks to react-redux", () => {
    const dispatch = jest.fn();
    mockReactRedux.useDispatch.mockReturnValue(dispatch);
    mockReactRedux.useSelector.mockReturnValue("selected");
    const selector = (state: any) => state.auth;
    expect(useAppDispatch()).toBe(dispatch);
    expect(useAppSelector(selector)).toBe("selected");
    expect(mockReactRedux.useSelector).toHaveBeenCalledWith(selector);
  });

  it("covers auth optional payloads, clearing, and hydration", () => {
    let state = authReducer(undefined, setSession({ token: "token" }));
    expect(state).toMatchObject({ token: "token", refreshToken: null, user: null });
    state = authReducer(state, setSession({ token: "next", refreshToken: "refresh", user: { id: "1" } }));
    expect(state.user?.id).toBe("1");
    state = authReducer(state, clearSessionState());
    expect(state).toMatchObject({ token: null, refreshToken: null, user: null });
    expect(authReducer(state, setHydrated(true)).hydrated).toBe(true);
  });

  it("uses the address reducer fallback error message", () => {
    const state = addressReducer(undefined, { type: fetchAddresses.rejected.type, error: {} });
    expect(state).toEqual({ list: [], loading: false, error: "Address load failed" });
  });
});
