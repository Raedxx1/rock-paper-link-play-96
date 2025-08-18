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

export default Home;
