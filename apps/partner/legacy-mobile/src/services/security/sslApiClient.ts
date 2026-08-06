import axios from "axios";

import { API_BASE_URL } from "../api";

export async function createSslPinnedClient() {
  try {
    require("react-native-ssl-pinning");
    return axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });
  } catch {
    return axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });
  }
}

