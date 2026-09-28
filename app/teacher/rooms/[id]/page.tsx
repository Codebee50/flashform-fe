import type { Metadata } from "next";
import { RoomView } from "@/components/teacher/room-view";

export const metadata: Metadata = { title: "Room" };

export default async function RoomPage({ params }: PageProps<"/teacher/rooms/[id]">) {
  const { id } = await params;
  // Rooms load in the browser: the teacher's tokens live in localStorage.
  return <RoomView key={id} id={id} />;
}
