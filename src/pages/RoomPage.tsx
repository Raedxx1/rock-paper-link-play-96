// RoomPage.tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function RoomPage() {
  const [params] = useSearchParams();
  const roomId = params.get("r");
  const [room, setRoom] = useState<any>(null);

  useEffect(() => {
    const fetchRoom = async () => {
      const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      setRoom(data);
    };
    fetchRoom();

    const channel = supabase
      .channel("room-updates")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => {
        setRoom(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  if (!room) return <p>جاري تحميل...</p>;

  return (
    <div className="p-4 space-y-4">
      <h2>🎨 الرسم</h2>
      <img src={room.drawing_data} alt="الرسم" className="border max-w-lg" />
      <h3>🏆 الفائزين</h3>
      <ul>
        {room.winners?.map((w: string, i: number) => (
          <li key={i}>{w}</li>
        ))}
      </ul>
    </div>
  );
}
