import React from "react";
import { Text } from "react-native";
export function CallTimer({ seconds }: { seconds: number }) { const m = Math.floor(seconds / 60); const s = seconds % 60; return <Text style={{ color: "#FFFFFF", fontSize: 18 }}>{m}:{String(s).padStart(2, "0")}</Text>; }
