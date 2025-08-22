// DrawPage.tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams } from "react-router-dom";

export default function DrawPage() {
  const [params] = useSearchParams();
  const roomId = params.get("r");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [room, setRoom] = useState<any>(null);
  const [painting, setPainting] = useState(false);

  useEffect(() => {
    const fetchRoom = async () => {
      const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      setRoom(data);
    };
    fetchRoom();
  }, [roomId]);

  useEffect(() => {
    if (canvasRef.current) {
      const c = canvasRef.current.getContext("2d");
      if (c) setCtx(c);
    }
  }, []);

  const start = (e: any) => {
    setPainting(true);
    draw(e);
  };
  const stop = async () => {
    setPainting(false);
    ctx?.beginPath();
    if (canvasRef.current) {
      const url = canvasRef.current.toDataURL();
      await supabase.from("rooms").update({ drawing_data: url }).eq("id", roomId);
    }
  };
  const draw = (e: any) => {
    if (!painting || !ctx) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  if (!room) return <p>جاري تحميل الغرفة...</p>;

  return (
    <div className="p-4">
      <h2>✏️ الكلمة: {room.current_word}</h2>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        onMouseDown={start}
        onMouseUp={stop}
        onMouseMove={draw}
        onMouseLeave={stop}
        className="border"
      />
    </div>
  );
}
