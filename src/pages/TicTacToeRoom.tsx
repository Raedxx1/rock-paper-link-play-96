import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';

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

const TicTacToeRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get('r');
  const isHost = searchParams.get('host') === 'true';

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const board = useMemo(() => room ? JSON.parse(room.board) : Array(9).fill(''), [room]);

  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomCode) return;

      setLoading(true);
      const { data, error } = await supabase
        .from('tic_tac_toe_rooms')
        .select('*')
        .eq('id', roomCode)
        .single();

      if (error || !data) {
        toast({
          title: '❌ الغرفة غير موجودة',
          description: 'تأكد من الرابط',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
      setRoom(data);
      setLoading(false);
    };

    if (roomCode) fetchRoomData();
  }, [roomCode]);

  const playAt = async (index: number) => {
    if (!room || room.winner || room.current_player !== (isHost ? 'X' : 'O')) return;

    const newBoard = [...board];
    if (newBoard[index]) return;

    newBoard[index] = room.current_player;
    const winner = checkWinner(newBoard);
    const nextPlayer = room.current_player === 'X' ? 'O' : 'X';

    const { error } = await supabase
      .from('tic_tac_toe_rooms')
      .update({
        board: JSON.stringify(newBoard),
        current_player: winner ? room.current_player : nextPlayer,
        winner,
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: '❌ فشل حفظ الحركة',
        description: 'حاول مجدداً',
        variant: 'destructive',
      });
    }
  };

  const resetRound = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from('tic_tac_toe_rooms')
      .update({ board: JSON.stringify(Array(9).fill('')), current_player: 'X', winner: null })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: '❌ فشل في إعادة الجولة',
        description: 'حاول مجدداً',
        variant: 'destructive',
      });
    }
  };

  const resetGame = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from('tic_tac_toe_rooms')
      .update({
        board: JSON.stringify(Array(9).fill('')),
        player1_score: 0,
        player2_score: 0,
        current_round: 1,
        winner: null,
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: '❌ فشل في إعادة اللعبة',
        description: 'حاول مجدداً',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">⏳ جارٍ التحميل...</div>;
  }

  if (!roomCode) {
    return <div>رمز الغرفة مطلوب</div>;
  }

  return (
    <div className="min-h-screen p-4 flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <Button onClick={() => navigate('/')}>← العودة للرئيسية</Button>
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {board.map((cell, index) => (
            <Button
              key={index}
              onClick={() => playAt(index)}
              className="w-full h-20 text-3xl border border-gray-300"
              style={{ backgroundColor: cell ? (cell === 'X' ? '#FF5733' : '#33FF57') : 'white' }}
            >
              {cell}
            </Button>
          ))}
        </div>

        <div className="text-center">
          <Button onClick={resetRound} className="mx-2 mt-4">
            <RotateCcw className="w-6 h-6" />
            إعادة الجولة
          </Button>

          <Button onClick={resetGame} className="mx-2 mt-4">
            إعادة اللعبة
          </Button>
        </div>

        {room?.winner && (
          <div className="text-center text-xl font-bold mt-4">
            {room.winner === 'tie' ? 'تعادل' : `الفائز: ${room.winner}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicTacToeRoom;
