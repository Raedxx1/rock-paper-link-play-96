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
      .from("tictactoe_rooms")
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      .from("tictactoe_rooms")
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
      .from("tictactoe_rooms")
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
      .from("tictactoe_rooms")
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

  // واجهة بدون كود غرفة: أنشئ غرفة
  if (!roomCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>❌⭕ لعبة XO</CardTitle>
            <ThemeToggle />
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">اضغط لإنشاء غرفة جديدة ومشاركة الرابط مع صديقك.</p>
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
        <div className="text-center">⏳ جارٍ التحميل...</div>
      </div>
    );
  }

  // الغرفة غير موجودة
  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="text-4xl mb-2">❌</div>
          <p>الغرفة غير موجودة</p>
          <Button onClick={() => navigate('/')} className="mt-4">الرجوع للرئيسية</Button>
        </div>
      </div>
    );
  }

  // لو أنت مو المضيف ولسه اللاعب الثاني ما سجل اسمه
  const needsJoin = !isHost && !room.player2_name;

  return (
    <div className="min-h-screen p-4 flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-md space-y-4">
        {/* الهيدر */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate('/')}>&larr; الرئيسية</Button>
          <ThemeToggle />
        </div>

        {/* الانضمام كلاعب ثاني */}
        {needsJoin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> انضمام للعبة
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="اسمك (لاعب O)"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && joinAsPlayer2()}
                className="text-right"
              />
              <Button className="w-full" disabled={!playerName.trim()} onClick={joinAsPlayer2}>
                انضم الآن
              </Button>
            </CardContent>
          </Card>
        )}

        {/* معلومات الغرفة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>❌⭕ XO — {room.id}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyLink}>
                  <Copy className="h-4 w-4 ml-1" /> نسخ الرابط
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(`${window.location.origin}/tic-tac-toe?r=${roomCode}`, "_blank")}>
                  <Share2 className="h-4 w-4 ml-1" /> فتح بالرابط
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-gray-600">
              <div>👤 X: {room.player1_name || "مضيف XO"} {isHost && "(أنت)"}</div>
              <div>👤 O: {room.player2_name || "بإنتظار الانضمام"} {iAmO && "(أنت)"}</div>
            </div>

            <div className="text-center font-semibold">
              {room.winner
                ? (room.winner === "tie" ? "🤝 تعادل" : `🥳 الفائز: ${room.winner}`)
                : (room.current_player === "X" ? "دور X" : "دور O")}
              {myMark && !room.winner && (
                <div className="text-xs text-gray-500 mt-1">دورك؟ {room.current_player === myMark ? "نعم" : "لا"}</div>
              )}
            </div>

            {/* اللوح */}
            <div className="grid grid-cols-3 gap-2 select-none">
              {board.map((cell, i) => (
                <button
                  key={i}
                  onClick={() => playAt(i)}
                  className="h-20 rounded-xl border border-gray-300 dark:border-gray-700
                             bg-white dark:bg-gray-900 text-3xl font-bold
                             flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  {cell}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" variant="secondary" onClick={copyLink}>
                <Copy className="h-4 w-4 ml-1" /> مشاركة الرابط
              </Button>
              <Button className="flex-1" variant="outline" onClick={resetBoard} disabled={!room.winner && board.some(c => !c) }>
                <RotateCcw className="h-4 w-4 ml-1" /> إعادة الجولة
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicTacToeRoom;
    
