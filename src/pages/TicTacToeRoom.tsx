import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, RotateCcw, Share2, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

type Mark = "X" | "O" | "";
type Winner = "X" | "O" | "tie" | null;

interface TttRoom {
  id: string;
  board: string; // JSON string for ["","","",...]
  current_player: "X" | "O";
  winner: Winner;
  player1_name: string | null;
  player2_name: string | null;
  player2_session_id: string | null;
  created_at: string;
}

const emptyBoardJson = JSON.stringify(["","","","","","","","",""]);

function checkWinner(b: Mark[]): Winner {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8], // rows
    [0,3,6],[1,4,7],[2,5,8], // cols
    [0,4,8],[2,4,6]          // diags
  ];
  for (const [a,b_,c] of lines) {
    if (b[a] && b[a] === b[b_] && b[a] === b[c]) return b[a] as Winner;
  }
  if (b.every(x => x)) return "tie";
  return null;
}

const TicTacToeRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const roomCode = searchParams.get("r");
  const isHost = searchParams.get("host") === "true";

  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).slice(2,9)}`);
  const [playerName, setPlayerName] = useState("");
  const [room, setRoom] = useState<TttRoom | null>(null);
  const [loading, setLoading] = useState(!!roomCode);

  const board: Mark[] = useMemo(() => room ? JSON.parse(room.board) as Mark[] : Array(9).fill("") , [room]);

  // توليد كود غرفة
  const generateRoomCode = () => {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "ttt-";
    for (let i=0;i<5;i++) result += chars[Math.floor(Math.random()*chars.length)];
    return result;
  };

  // إنشاء غرفة جديدة
  const createRoom = async () => {
    const id = generateRoomCode();
    const { error } = await supabase
      .from("tic_tac_toe_rooms")
      .insert({
        id,
        board: emptyBoardJson,
        current_player: "X",
        winner: null,
        player1_name: "مضيف XO",
      });

    if (error) {
      toast({ title: "❌ خطأ في إنشاء الغرفة", description: "حاول مرة أخرى", variant: "destructive" });
      return;
    }
    navigate(`/tic-tac-toe?r=${id}&host=true`);
  };

  // جلب بيانات الغرفة
  const fetchRoom = async () => {
    if (!roomCode) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("tic_tac_toe_rooms")
      .select("*")
      .eq("id", roomCode)
      .single();

    if (error || !data) {
      toast({ title: "❌ الغرفة غير موجودة", description: "تأكد من الرابط", variant: "destructive" });
      setLoading(false);
      return;
    }
    setRoom(data as TttRoom);
    setLoading(false);
  };

  // اشتراك Realtime
  useEffect(() => {
    if (!roomCode) return;
    fetchRoom();

    const ch = supabase
      .channel(`ttt-${roomCode}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "tictactoe_rooms",
        filter: `id=eq.${roomCode}`
      }, (payload) => {
        setRoom(payload.new as TttRoom);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomCode]);

  // انضمام كلاعب ثاني
  const joinAsPlayer2 = async () => {
    if (!roomCode || !playerName.trim()) return;
    if (!room) return;

    // التأكد أنها فاضية
    if (room.player2_name && room.player2_session_id && room.player2_session_id !== sessionId) {
      toast({ title: "🚫 الغرفة ممتلئة", description: "انضم لاعب آخر بالفعل", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("tic_tac_toe_rooms")
      .update({
        player2_name: playerName.trim(),
        player2_session_id: sessionId
      })
      .eq("id", roomCode);

    if (error) {
      toast({ title: "❌ فشل الانضمام", description: "حاول مرة أخرى", variant: "destructive" });
      return;
    }

    toast({ title: "✅ أهلاً!", description: "تم الانضمام كلاعب O" });
  };

  // صلاحية اللعب
  const iAmX = isHost;
  const iAmO = !isHost && !!room?.player2_session_id && room.player2_session_id === sessionId;
  const myMark: "X" | "O" | null = iAmX ? "X" : iAmO ? "O" : null;

  // تنفيذ حركة
  const playAt = async (index: number) => {
    if (!room || !roomCode) return;
    if (room.winner) return;
    if (!myMark) {
      toast({ title: "🚫 غير مسموح", description: "هذه الغرفة مخصصة للاعبين فقط", variant: "destructive" });
      return;
    }
    if (room.current_player !== myMark) return; // مو دورك
    const b = [...board];
    if (b[index]) return; // خلية مشغولة

    b[index] = myMark;
    const w = checkWinner(b);
    const next = myMark === "X" ? "O" : "X";

    const { error } = await supabase
      .from("tic_tac_toe_rooms")
      .update({
        board: JSON.stringify(b),
        current_player: w ? room.current_player : next,
        winner: w
      })
      .eq("id", roomCode);

    if (error) {
      toast({ title: "❌ فشل حفظ الحركة", description: "حاول مجدداً", variant: "destructive" });
    }
  };

  // إعادة ضبط اللوح
  const resetBoard = async () => {
    if (!roomCode) return;
    const { error } = await supabase
      .from("tic_tac_toe_rooms")
      .update({
        board: emptyBoardJson,
        current_player: "X",
        winner: null
      })
      .eq("id", roomCode);

    if (error) {
      toast({ title: "❌ فشل إعادة الضبط", description: "حاول مجدداً", variant: "destructive" });
    }
  };

  // مشاركة الرابط
  const copyLink = async () => {
    const link = `${window.location.origin}/tic-tac-toe?r=${roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "✅ تم نسخ الرابط", description: "أرسله لصديقك للانضمام" });
    } catch {
      toast({ title: "❌ فشل النسخ", description: "انسخه يدوياً", variant: "destructive" });
    }
  };

  if (!roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>❌⭕ لعبة XO</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={createRoom} className="w-full py-6 text-lg">
              إنشاء غرفة جديدة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // شاشة تحميل
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div>⏳ جارٍ التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <Button onClick={() => navigate('/')}>&larr; العودة للرئيسية</Button>
          <ThemeToggle />
        </div>
        
        {/* اللوحة */}
        <Card>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {board.map((cell, index) => (
                <button
                  key={index}
                  onClick={() => playAt(index)}
                  className="h-20 rounded-xl border bg-gray-700 text-3xl font-bold flex items-center justify-center"
                >
                  {cell}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={resetBoard} disabled={!room.winner && board.every(c => !!c)}>
                إعادة الضبط
              </Button>
              <Button onClick={copyLink}>نسخ الرابط</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicTacToeRoom;
      
