// src/pages/YouTubeDrawing.tsx
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const YOUTUBE_API_KEY = "AIzaSyAmghODZ2TZaDr3MPTBPmpKKMSOmO3EEyQ"; // 🔑 ضع مفتاح YouTube API

export default function YouTubeDrawing() {
  const [params] = useSearchParams();
  const roomId = params.get("r");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [room, setRoom] = useState<any>(null);

  // ⬇️ جلب بيانات الغرفة ومتابعتها مباشرة
  useEffect(() => {
    const fetchRoom = async () => {
      const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      setRoom(data);
    };
    fetchRoom();

    const channel = supabase
      .channel("room-updates")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          setRoom(payload.new);
          if (payload.new.drawing_data) {
            loadDrawing(payload.new.drawing_data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // ⬇️ تحميل الرسم على الكانفس إذا موجود
  const loadDrawing = (imgData: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.src = imgData;
  };

  // ⬇️ حفظ الرسم في supabase
  const saveDrawing = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    await supabase.from("rooms").update({ drawing_data: dataUrl }).eq("id", roomId);
  };

  // ⬇️ نظام الرسم بالماوس/التاتش
  const startDrawing = (e: any) => {
    setIsDrawing(true);
    draw(e);
  };
  const endDrawing = () => {
    setIsDrawing(false);
    saveDrawing();
  };
  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    const rect = canvas.getBoundingClientRect();
    const x = e.touches ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = e.touches ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  // ⬇️ فحص تعليقات يوتيوب لاستخراج الفائزين
  useEffect(() => {
    if (!room) return;
    if (room.winners && room.winners.length >= 3) return;

    const interval = setInterval(() => {
      checkYouTubeComments();
    }, 4000);

    return () => clearInterval(interval);
  }, [room]);

  const normalize = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[\u064B-\u065F]/g, "") // حذف التشكيل
      .replace(/[أإآا]/g, "ا") // توحيد الألف
      .replace(/ة/g, "ه") // توحيد التاء المربوطة
      .trim();
  };

  const checkYouTubeComments = async () => {
    if (!room) return;

    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${room.youtube_video_id}&key=${YOUTUBE_API_KEY}&maxResults=20&order=time`
    );
    const data = await res.json();
    if (!data.items) return;

    let winners = room.winners || [];
    const answer = normalize(room.current_word);

    for (const item of data.items) {
      const text = normalize(item.snippet.topLevelComment.snippet.textDisplay);
      const author = item.snippet.topLevelComment.snippet.authorDisplayName;

      if (text.includes(answer) && !winners.includes(author)) {
        winners.push(author);
        await supabase.from("rooms").update({ winners }).eq("id", roomId);
        if (winners.length >= 3) break;
      }
    }
  };

  if (!room) return <p className="p-4">⏳ جاري تحميل الغرفة...</p>;

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <h2 className="text-xl font-bold">🎨 لعبة الرسم مع يوتيوب</h2>

      <canvas
        ref={canvasRef}
        width={500}
        height={400}
        className="border bg-white"
        onMouseDown={startDrawing}
        onMouseUp={endDrawing}
        onMouseMove={draw}
        onMouseLeave={endDrawing}
        onTouchStart={startDrawing}
        onTouchEnd={endDrawing}
        onTouchMove={draw}
      />

      <Button onClick={saveDrawing}>💾 حفظ الرسم</Button>

      <div className="mt-4 w-full max-w-md">
        <h3 className="font-semibold">🏆 الفائزين:</h3>
        <ul className="list-disc ml-6">
          {room.winners?.map((w: string, i: number) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
