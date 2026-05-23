import { api, parseApiError } from "./client";
import type { AddAddressRequest, AddressDto, UpdateAddressRequest } from "../types/contracts";

function toAddressDto(row: any): AddressDto {
  return {
    id: String(row?.id ?? row?.addressUuid ?? row?.uuid ?? ""),
    label: String(row?.label ?? row?.type ?? row?.customLabel ?? "HOME"),
    line1: String(row?.line1 ?? row?.addressLine ?? row?.flatNo ?? ""),
    city: String(row?.city ?? ""),
    isDefault: typeof row?.isDefault === "boolean" ? row.isDefault : undefined,
  };
}

function pickAddressRows(payload: any): any[] {
  if (Array.isArray(payload?.data?.content)) return payload.data.content;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  return [];
}

export async function addAddress(payload: AddAddressRequest): Promise<AddressDto> {
  const requestBody = {
    type: payload.label || "HOME",
    customLabel: payload.label,
    addressLine: payload.line1,
    area: payload.line1,
    city: payload.city,
  };
  try {
    const { data } = await api.post("/api/v1/customer/location/save-address", requestBody);
    const source = data?.data ?? data;
    return toAddressDto(source);
  } catch (e) {
    try {
      const { data } = await api.post("/api/address/add", payload);
      return toAddressDto(data?.data ?? data);
    } catch (fallbackError) {
      throw new Error(parseApiError(fallbackError, "Add address failed"));
    }
  }
}

export async function getAddressList(): Promise<AddressDto[]> {
  try {
    const { data } = await api.get("/api/v1/customer/location/all", { params: { page: 0, size: 50 } });
    return pickAddressRows(data).map(toAddressDto).filter((row) => row.id.length > 0);
  } catch (e) {
    try {
      const { data } = await api.get("/api/address/list");
      return pickAddressRows(data).map(toAddressDto).filter((row) => row.id.length > 0);
    } catch (fallbackError) {
      throw new Error(parseApiError(fallbackError, "Address list failed"));
    }
  }
}

export async function updateAddress(payload: UpdateAddressRequest): Promise<AddressDto> {
  const requestBody = {
    customLabel: payload.label,
    addressLine: payload.line1,
    area: payload.line1,
    city: payload.city,
  };
  try {
    const { data } = await api.put(`/api/v1/customer/location/address/${encodeURIComponent(payload.id)}`, requestBody);
    return toAddressDto(data?.data ?? data);
  } catch (e) {
    try {
      const { data } = await api.put("/api/address/update", payload);
      return toAddressDto(data?.data ?? data);
    } catch (fallbackError) {
      throw new Error(parseApiError(fallbackError, "Update address failed"));
    }
  }
}

export async function deleteAddress(id: string) {
  try {
    const { data } = await api.delete(`/api/v1/customer/location/${encodeURIComponent(id)}`);
    return data;
  } catch (e) {
    try {
      const { data } = await api.delete("/api/address/delete", { data: { id } });
      return data;
    } catch (fallbackError) {
      throw new Error(parseApiError(fallbackError, "Delete address failed"));
    }
  }
}

export async function setDefaultAddress(id: string) {
  try {
    const { data } = await api.patch(`/api/v1/customer/location/default/${encodeURIComponent(id)}`);
    return data;
  } catch (e) {
    try {
      const { data } = await api.put("/api/address/default", { id });
      return data;
    } catch (fallbackError) {
      throw new Error(parseApiError(fallbackError, "Set default address failed"));
    }
  }
}
