// Teacher room endpoints (docs/api/rooms.md). Rooms are addressed by numeric id; only the
// student lookup uses the code.
import { api } from "./api";
import type { Room, RoomCreateRequest, RoomUpdateRequest } from "./types";

type Options = { signal?: AbortSignal };

export const roomsApi = {
  list: (options?: Options) => api.get<Room[]>("/rooms", options),
  get: (id: number, options?: Options) => api.get<Room>(`/rooms/${id}`, options),
  create: (body: RoomCreateRequest) => api.post<Room>("/rooms", body),
  /** Rename and lock/unlock. The code can't be changed after creation. */
  update: (id: number, body: RoomUpdateRequest) => api.patch<Room>(`/rooms/${id}`, body),
  remove: (id: number) => api.delete<void>(`/rooms/${id}`),
};
