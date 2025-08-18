import { useState, useEffect, useMemo } from "react";
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

interface TicTacToeRoom {
  id: string;
  board: string; // مصفوفة اللوحة
  current_player: "X" | "O";
  winner: Winner;
  player1_name: string | null;
  player2_name: string | null;
  player2_session_id: string | null;
  created_at: string;
}

const emptyBoardJson = JSON.stringify(["", "", "", "", "", "", "", "", ""]);

function checkWinner(board: Mark[]): Winner {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],           // diags
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a] as Winner;
  }

  if (board.every(cell => cell)) return "tie"; // إذا امتلأت الخلايا كلها

  return null; // لا يوجد فائز
}

const TicTacToeRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get("r");
  const isHost = searchParams.get("host") === "true";

  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [playerName, setPlayerName] = useState("");
  const [roomData, setRoomData] = useState<TicTacToeRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const board: Mark[] = useMemo(() => roomData ? JSON.parse(roomData.board) as Mark[] : Array(9).fill(""), [roomData]);

  // جلب بيانات الغرفة
  const fetchRoomData = async () => {
    if (!roomCode) return;

    const { data, error } = await supabase
      .from("tic_tac_toe_rooms")
      .select("*")
      .eq("id", roomCode)
      .single();

    if (error) {
      toast({
        title: "❌ الغرفة غير موجودة",
        description: "تأكد من صحة الرابط",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setRoomData(data as TicTacToeRoom);
    setLoading(false);
  };

  // الاشتراك في التحديثات الفورية للغرفة
  useEffect(() => {
    if (!roomCode) return;
    fetchRoomData();

    const subscription = supabase
      .channel(`ttt-${roomCode}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "tic_tac_toe_rooms",
        filter: `id=eq.${roomCode}`,
      }, (payload) => {
        setRoomData(payload.new as TicTacToeRoom);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomCode, navigate]);

  // انضمام اللاعب الثاني
  const joinAsPlayer2 = async () => {
    if (!playerName.trim() || !roomCode) return;

    const { data: updateResult, error } = await supabase
      .from("tic_tac_toe_rooms")
      .update({
        player2_name: playerName.trim(),
        player2_session_id: sessionId,
        game_status: "playing",
      })
      .eq("id", roomCode)
      .is("player2_name", null) // التأكد من أن الغرفة فارغة
      .select();

    if (error || !updateResult || updateResult.length === 0) {
      toast({
        title: "❌ الغرفة ممتلئة",
        description: "لقد انضم لاعب آخر بالفعل",
        variant: "destructive",
      });
      fetchRoomData();
      return;
    }

    toast({
      title: "✅ تم الانضمام بنجاح!",
      description: "مرحباً بك في اللعبة",
    });
  };

  // تنفيذ حركة
  const playAt = async (index: number) => {
    if (!roomData || !roomCode) return;
    if (roomData.winner) return; // إذا كان هناك فائز، لا يمكن اللعب
    const mark = isHost ? "X" : "O";
    if (roomData.current_player !== mark) return; // تأكد من أن الدور هو للاعب الحالي
    const b = [...board];
    if (b[index]) return; // الخلية مشغولة

    b[index] = mark;
    const winner = checkWinner(b);
    const nextPlayer = mark === "X" ? "O" : "X";

    const { error } = await supabase
      .from("tic_tac_toe_rooms")
      .update({
        board: JSON.stringify(b),
        current_player: winner ? roomData.current_player : nextPlayer,
        winner: winner,
      })
      .eq("id", roomCode);

    if (error) {
      toast({
        title: "❌ فشل حفظ الحركة",
        description: "حاول مجددًا",
        variant: "destructive",
      });
    }
  };

  // إعادة ضبط اللعبة
  const resetBoard = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from("tic_tac_toe_rooms")
      .update({
        board: emptyBoardJson,
        current_player: "X",
        winner: null,
      })
      .eq("id", roomCode);

    if (error) {
      toast({
        title: "❌ فشل إعادة الضبط",
        description: "حاول مجددًا",
        variant: "destructive",
      });
    }
  };

  // نسخ رابط الغرفة
  const shareRoom = async () => {
    const link = `${window.location.origin}/tic-tac-toe?r=${roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "✅ تم نسخ الرابط!",
        description: "شارك الرابط مع صديقك",
      });
    } catch (err) {
      toast({
        title: "❌ فشل في نسخ الرابط",
        description: "حاول نسخه يدوياً",
        variant: "destructive",
      });
    }
  };

  if (!roomCode) {
    return <div>رمز الغرفة مطلوب</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="text-center">⏳ جارٍ تحميل الغرفة...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-md space-y-4">
        {/* شريط التنقل */}
        <div className="flex items-center justify-between">
          <Button onClick={() => navigate("/")}>&larr; العودة للرئيسية</Button>
          <ThemeToggle />
        </div>

        {/* الانضمام كلاعب ثاني */}
        {!roomData?.player2_name && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" /> انضمام للعبة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="اسمك (لاعب O)"
                onKeyDown={(e) => e.key === "Enter" && joinAsPlayer2()}
              />
              <Button onClick={joinAsPlayer2} disabled={!playerName.trim()}>
                انضم الآن
              </Button>
            </CardContent>
          </Card>
        )}

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
              <Button onClick={resetBoard}>إعادة الضبط</Button>
              <Button onClick={shareRoom}>مشاركة الرابط</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicTacToeRoom;
