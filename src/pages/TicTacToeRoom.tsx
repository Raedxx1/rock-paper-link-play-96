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
type Choice = "rock" | "paper" | "scissors" | null;

interface GameRoom {
  id: string;
  game_type: "rock_paper_scissors" | "tic_tac_toe"; // تحديد نوع اللعبة
  board: string; // للـ "إكس-أو" (JSON)
  current_player: "X" | "O";
  winner: Winner;
  player1_name: string | null;
  player2_name: string | null;
  player2_session_id: string | null;
  player1_choice: Choice | null; // للـ "حجرة ورقة مقص"
  player2_choice: Choice | null; // للـ "حجرة ورقة مقص"
  player1_score: number;
  player2_score: number;
  current_round: number;
  game_status: "waiting" | "playing" | "round_complete" | "game_complete";
  round_winner: "player1" | "player2" | "tie" | null;
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
  
  const board: Mark[] = useMemo(() => roomData?.game_type === "tic_tac_toe" ? JSON.parse(roomData.board) : Array(9).fill(""), [roomData]);

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

  const makeChoice = async (choice: Choice) => {
    if (!roomData || !roomCode) return;

    if (!isHost && isPlayer2 && roomData.player2_session_id !== sessionId) {
      toast({
        title: "❌ غير مسموح",
        description: "هذا الحساب مخصص للاعب آخر",
        variant: "destructive",
      });
      fetchRoomData();
      return;
    }

    const updateField = isHost || !isPlayer2 ? "player1_choice" : "player2_choice";

    const { error } = await supabase
      .from("game_rooms")
      .update({ [updateField]: choice })
      .eq("id", roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في الاختيار",
        description: "حاول مرة أخرى",
        variant: "destructive",
      });
    }
  };

  const determineRoundWinner = (p1Choice: Choice, p2Choice: Choice): "player1" | "player2" | "tie" => {
    if (!p1Choice || !p2Choice) return "tie";
    if (p1Choice === p2Choice) return "tie";

    const winConditions = {
      rock: "scissors",
      paper: "rock",
      scissors: "paper",
    };

    return winConditions[p1Choice] === p2Choice ? "player1" : "player2";
  };

  useEffect(() => {
    if (!roomData || !roomCode) return;

    if (roomData.player1_choice && roomData.player2_choice && roomData.game_status === "playing") {
      const roundWinner = determineRoundWinner(roomData.player1_choice, roomData.player2_choice);

      let newPlayer1Score = roomData.player1_score;
      let newPlayer2Score = roomData.player2_score;

      if (roundWinner === "player1") newPlayer1Score++;
      else if (roundWinner === "player2") newPlayer2Score++;

      const gameWinner = newPlayer1Score >= 3 ? "player1" : newPlayer2Score >= 3 ? "player2" : null;

      const newGameStatus = gameWinner ? "game_complete" : "round_complete";

      const updateRound = async () => {
        const { error } = await supabase
          .from("game_rooms")
          .update({
            round_winner: roundWinner,
            player1_score: newPlayer1Score,
            player2_score: newPlayer2Score,
            winner: gameWinner,
            game_status: newGameStatus,
          })
          .eq("id", roomCode);

        if (error) {
          toast({
            title: "❌ خطأ في حفظ النتيجة",
            description: "حاول إعادة تحميل الصفحة",
            variant: "destructive",
          });
        }
      };

      updateRound();
    }
  }, [roomData?.player1_choice, roomData?.player2_choice, roomData?.game_status, roomCode]);

  const resetRound = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from("game_rooms")
      .update({
        player1_choice: null,
        player2_choice: null,
        round_winner: null,
        current_round: (roomData?.current_round || 1) + 1,
        game_status: "playing",
      })
      .eq("id", roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في إعادة الجولة",
        description: "حاول مرة أخرى",
        variant: "destructive",
      });
    }
  };

  const resetGame = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from("game_rooms")
      .update({
        player1_choice: null,
        player2_choice: null,
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
        title: "❌ خطأ في إعادة اللعبة",
        description: "حاول مرة أخرى",
        variant: "destructive",
      });
    }
  };

  const shareRoom = async () => {
    const link = `${window.location.origin}/play?r=${roomCode}`;
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

        <Card>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {board.map((cell, i) => (
                <button
                  key={i}
                  onClick={() => makeChoice(i === 0 ? "rock" : "paper")}
                  className="h-20 rounded-xl border bg-gray-700 text-3xl font-bold flex items-center justify-center"
                >
                  {cell}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TicTacToeRoom;
