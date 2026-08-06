import { useEffect } from "react";
import { AppState } from "react-native";
import { useAppDispatch, useAppSelector } from "../../../hooks/useRedux";
import { callActions } from "../store/callSlice";

export function useCallLifecycle() {
  const dispatch = useAppDispatch();
  const status = useAppSelector(state => state.calling.current?.status);
  useEffect(() => {
    if (status !== "connected") return;
    const timer = setInterval(() => dispatch(callActions.tick()), 1000);
    return () => clearInterval(timer);
  }, [dispatch, status]);
  useEffect(() => AppState.addEventListener("change", next => {
    if (next === "active" && status === "reconnecting") dispatch(callActions.setStatus("reconnecting"));
  }).remove, [dispatch, status]);
}
