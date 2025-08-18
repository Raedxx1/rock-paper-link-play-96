import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, RotateCcw, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

// توليد كود غرفة فريد
const generateRoomCode = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "ttt-";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// التحقق من الفائز
function checkWinner(board: string[]): string | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],           // diags
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  if (board.every(cell => cell)) return "tie"; // If all cells are filled

  return null;
}

const Home = () => {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // إنشاء غرفة جديدة
  const createNewGame = async () => {
    const code = generateRoomCode();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("tic_tac_toe_rooms")
        .insert({
          id: code,
          board: JSON.stringify(Array(9).fill("")),
          current_player: "X",
          winner: null,
          player1_name: "مضيف XO",
        });

      if (error) {
        toast({
          title: "❌ خطأ في إنشاء الغرفة",
          description: "حاول مرة أخرى",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      navigate(`/tic-tac-toe?r=${code}&host=true`);
    } catch (error) {
      toast({
        title: "❌ خطأ في الاتصال",
        description: "تأكد من اتصالك بالإنترنت",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>إكس-أو</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={createNewGame}
              className="w-full py-6 text-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-lg"
              disabled={loading}
            >
              {loading ? "جارٍ إنشاء الغرفة..." : "إنشاء غرفة جديدة"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const TicTacToeRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get("r");
  const isHost = searchParams.get("host") === "true";

  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [playerName, setPlayerName] = useState("");
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const board = useMemo(() => room ? JSON.parse(room.board) : Array(9).fill(""), [room]);

  // جلب بيانات الغرفة
  const fetchRoomData = async () => {
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
    setRoom(data);
    setLoading(false);
  };

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
        setRoom(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomCode]);

  // انضمام كلاعب 2
  const joinAsPlayer2 = async () => {
    if (!roomCode || !playerName.trim()) return;

    const { error } = await supabase
      .from("tic_tac_toe_rooms")
      .update({ player2_name: playerName.trim(), player2_session_id: sessionId })
      .eq("id", roomCode);

    if (error) {
      toast({ title: "❌ فشل الانضمام", description: "حاول مرة أخرى", variant: "destructive" });
      return;
    }
    toast({ title: "✅ تم الانضمام بنجاح!", description: "مرحباً بك في اللعبة" });
  };

  // تنفيذ الحركة
  const playAt = async (index: number) => {
    if (!room || room.winner || room.current_player !== (isHost ? "X" : "O")) return;

    const newBoard = [...board];
    if (newBoard[index]) return;

    newBoard[index] = room.current_player;
    const winner = checkWinner(newBoard);
    const nextPlayer = room.current_player === "X" ? "O" : "X";

    const { error } = await supabase
      .from("tic_tac_toe_rooms")
      .update({
        board: JSON.stringify(newBoard),
        current_player: winner ? room.current_player : nextPlayer,
        winner,
      })
      .eq("id", roomCode);

    if (error) {
      toast({ title: "❌ فشل حفظ الحركة", description: "حاول مجدداً", variant: "destructive" });
    }
  };

  const resetRound = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from("tic_tac_toe_rooms")
      .update({ board: JSON.stringify(Array(9).fill("")), current_player: "X", winner: null })
      .eq("id", roomCode);

    if (error) {
      toast({ title: "❌ فشل في إعادة الجولة", description: "حاول مجدداً", variant: "destructive" });
    }
  };

  const resetGame = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from("tic_tac_toe_rooms")
      .update({ board: JSON.stringify(Array(9).fill("")), player1_score: 0, player2_score: 0, current_round: 1, winner: null })
      .eq("id", roomCode);

    if (error) {
      toast({ title: "❌ فشل في إعادة اللعبة", description: "حاول مجدداً", variant: "destructive" });
    }
  };

  const shareRoom = async () => {
    const link = `${window.location.origin}/tic-tac-toe?r=${roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({ title: "✅ تم نسخ الرابط", description: "أرسله لصديقك للانضمام" });
    } catch {
      toast({ title: "❌ فشل النسخ", description: "انسخه يدوياً", variant: "destructive" });
    }
  };

  if (!roomCode) {
    return <div>رمز الغرفة مطلوب</div>;
  }

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
          <Button onClick={() => navigate("/")}>← العودة للرئيسية</Button>
          <ThemeToggle />
        </div>

        <Card>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {board.map((cell, i) => (
                <button
                  key={i}
                  onClick={() => playAt(i)}
                  className="h-20 rounded-xl border bg-gray-700 text-3xl font-bold flex items-center justify-center"
                >
                  {cell}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button className="w-full" onClick={resetGame}>
            <RotateCcw className="h-4 w-4" /> إعادة اللعبة
          </Button>
          <Button className="w-full" onClick={resetRound}>
            <RotateCcw className="h-4 w-4" /> إعادة الجولة
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TicTacToeRoom;
