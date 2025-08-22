// HostPage.tsx
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function HostPage() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [word, setWord] = useState("");
  const [roomId, setRoomId] = useState<string | null>(null);

  const createRoom = async () => {
    const videoId = new URL(youtubeUrl).searchParams.get("v");
    if (!videoId) return alert("رابط يوتيوب غير صحيح");

    const { data, error } = await supabase
      .from("rooms")
      .insert({ youtube_video_id: videoId, current_word: word })
      .select()
      .single();

    if (error) return alert("خطأ في إنشاء الغرفة");

    setRoomId(data.id);
  };

  return (
    <div className="p-4 space-y-4">
      {!roomId ? (
        <>
          <input
            placeholder="رابط البث"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            className="border p-2 w-full"
          />
          <input
            placeholder="الكلمة المطلوبة"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            className="border p-2 w-full"
          />
          <button onClick={createRoom} className="bg-blue-500 text-white p-2">
            إنشاء غرفة
          </button>
        </>
      ) : (
        <div>
          <p>✅ تم إنشاء الغرفة</p>
          <p>رابط الرسام: {window.location.origin}/draw?r={roomId}</p>
          <p>رابط العرض: {window.location.origin}/room?r={roomId}</p>
        </div>
      )}
    </div>
  );
}
