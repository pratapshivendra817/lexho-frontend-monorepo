import { api, parseApiError } from "./client";
import type { AddFavoriteRequest, FavoriteDto } from "../types/contracts";

export async function addFavorite(payload: AddFavoriteRequest) { try { const { data } = await api.post('/api/favorites/add', payload); return data as FavoriteDto; } catch (e) { throw new Error(parseApiError(e, 'Add favorite failed')); } }
export async function getFavorites(): Promise<FavoriteDto[]> { try { const { data } = await api.get('/api/favorites/list'); return (Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []) as FavoriteDto[]; } catch (e) { throw new Error(parseApiError(e, 'Favorite list failed')); } }
export async function removeFavorite(id: string) { try { const { data } = await api.delete('/api/favorites/remove', { data: { id } }); return data; } catch (e) { throw new Error(parseApiError(e, 'Remove favorite failed')); } }
