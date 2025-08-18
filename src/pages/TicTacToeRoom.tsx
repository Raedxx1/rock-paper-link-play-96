import { useState, useEffect, useMemo } from "react"; // تأكد من استيراد useMemo هنا
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, RotateCcw, Share2, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

// تعريف الأنواع
type Mark = "X" | "O" | "";
type Winner = "X" | "O" | "tie" | null;

interface GameRoom {
  id: string;
  game_type: "tic_tac_toe";
  board: string; // JSON string
  current_player: "X" | "O";
  winner: Winner;
  player1_name: string | null;
  player2_name: string | null;
  player2_session_id: string | null;
  player1_choice: string | null;
  player2_choice: string | null;
  player1_score: number;
  player2_score: number;
  current_round: number;
  game_status: "waiting" | "playing" | "round_complete" | "game_complete";
  round_winner: Winner;
  created_at: string;
}

// تعريف اللوحة الفارغة
const emptyBoardJson = JSON.stringify(["", "", "", "", "", "", "", "", ""]);

// التحقق من الفائز
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

  return null;
}

const TicTacToeRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get("r");
  const isHost = searchParams.get("host") === "true";

  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [playerName, setPlayerName] = useState("");
  const [roomData, setRoomData] = useState<GameRoom | null>(null);
  const [loading, setLoading] = useState(true);

  // استخدام useMemo لحفظ بيانات اللوحة
  const board: Mark[] = useMemo(() => roomData ? JSON.parse(roomData.board) : Array(9).fill(""), [roomData]);

  const fetchRoomData = async () => {
    if (!roomCode) return;

    const { data, error } = await supabase
      .from("game_rooms")
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

    setRoomData(data as GameRoom);
    setLoading(false);
  };

  useEffect(() => {
    if (!roomCode) return;
    fetchRoomData();

    const subscription = supabase
      .channel(`game_room_changes`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "game_rooms",
        filter: `id=eq.${roomCode}`,
      }, (payload) => {
        setRoomData(payload.new as GameRoom);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomCode, navigate]);

  const joinAsPlayer2 = async () => {
    if (!playerName.trim() || !roomCode) return;

    const { data: updateResult, error } = await supabase
      .from("game_rooms")
      .update({
        player2_name: playerName.trim(),
        player2_session_id: sessionId,
        game_status: "playing",
      })
      .eq("id", roomCode)
      .is("player2_name", null)
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

  const makeChoice = async (index: number) => {
    if (!roomData || !roomCode) return;

    const { current_player } = roomData;

    if (roomData.winner) return; // Game is over
    if (current_player !== (isHost ? "X" : "O")) return; // Not your turn

    const newBoard = [...board];
    if (newBoard[index]) return; // Cell is already taken

    newBoard[index] = current_player;
    const winner = checkWinner(newBoard);

    const nextPlayer = current_player === "X" ? "O" : "X";
    const { error } = await supabase
      .from("game_rooms")
      .update({
        board: JSON.stringify(newBoard),
        current_player: winner ? current_player : nextPlayer,
        winner,
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

  const resetRound = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from("game_rooms")
      .update({
        board: emptyBoardJson,
        current_player: "X",
        winner: null,
      })
      .eq("id", roomCode);

    if (error) {
      toast({
        title: "❌ فشل في إعادة الجولة",
        description: "حاول مجددًا",
        variant: "destructive",
      });
    }
  };

  const resetGame = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from("game_rooms")
      .update({
        board: emptyBoardJson,
        player1_score: 0,
        player2_score: 0,
        current_round: 1,
        round_winner: null,
        winner: null,
        game_status: "playing",
      })
      .eq("id", roomCode);

    if (error) {
      toast({
        title: "❌ فشل في إعادة اللعبة",
        description: "حاول مجددًا",
        variant: "destructive",
      });
    }
  };

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
        <div>⏳ جارٍ تحميل الغرفة...</div>
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

        {/* لوح اللعب */}
        <Card>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {board.map((cell, i) => (
                <button
                  key={i}
                  onClick={() => makeChoice(i)}
                  className="h-20 rounded-xl border bg-gray-700 text-3xl font-bold flex items-center justify-center"
                >
                  {cell}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* الزر لإعادة اللعبة أو الجولة */}
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
