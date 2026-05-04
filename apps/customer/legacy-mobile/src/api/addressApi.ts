import { api, parseApiError } from "./client";
import type { AddAddressRequest, AddressDto, UpdateAddressRequest } from "../types/contracts";

export async function addAddress(payload: AddAddressRequest): Promise<AddressDto> { try { const { data } = await api.post('/api/address/add', payload); return data as AddressDto; } catch (e) { throw new Error(parseApiError(e, 'Add address failed')); } }
export async function getAddressList(): Promise<AddressDto[]> { try { const { data } = await api.get('/api/address/list'); return (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []) as AddressDto[]; } catch (e) { throw new Error(parseApiError(e, 'Address list failed')); } }
export async function updateAddress(payload: UpdateAddressRequest): Promise<AddressDto> { try { const { data } = await api.put('/api/address/update', payload); return data as AddressDto; } catch (e) { throw new Error(parseApiError(e, 'Update address failed')); } }
export async function deleteAddress(id: string) { try { const { data } = await api.delete('/api/address/delete', { data: { id } }); return data; } catch (e) { throw new Error(parseApiError(e, 'Delete address failed')); } }
export async function setDefaultAddress(id: string) { try { const { data } = await api.put('/api/address/default', { id }); return data; } catch (e) { throw new Error(parseApiError(e, 'Set default address failed')); } }
