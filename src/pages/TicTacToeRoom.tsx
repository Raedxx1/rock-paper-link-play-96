import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

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
  const playerSymbol = isHost ? 'X' : 'O'; // تحديد رمز اللاعب

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const board = useMemo(() => room ? JSON.parse(room.board) : Array(9).fill(''), [room]);

  // جلب بيانات الغرفة والاشتراك في التحديثات
  useEffect(() => {
    if (!roomCode) return;

    const fetchRoomData = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('tic_tac_toe_rooms')
          .select('*')
          .eq('id', roomCode)
          .single();

        if (error || !data) {
          toast({
            title: '❌ الغرفة غير موجودة',
            description: 'تأكد من صحة الرابط أو أن الغرفة موجودة',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        setRoom(data);
        setLoading(false);
        
        // تحديد إذا كان دور اللاعب الحالي
        const currentBoard = JSON.parse(data.board);
        const xCount = currentBoard.filter((cell: string) => cell === 'X').length;
        const oCount = currentBoard.filter((cell: string) => cell === 'O').length;
        setIsMyTurn((playerSymbol === 'X' && xCount === oCount) || (playerSymbol === 'O' && xCount > oCount));
      } catch (error) {
        console.error('Error fetching room data:', error);
        toast({
          title: '❌ خطأ في الاتصال',
          description: 'فشل في تحميل البيانات من السيرفر',
          variant: 'destructive',
        });
        setLoading(false);
      }
    };

    fetchRoomData();

    // الاشتراك في التحديثات الفورية للغرفة
    const subscription = supabase
      .channel('tic_tac_toe_changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'tic_tac_toe_rooms',
        filter: `id=eq.${roomCode}`
      }, (payload) => {
        setRoom(payload.new);
        
        // تحديث حالة الدور بعد التحديث
        const updatedBoard = JSON.parse(payload.new.board);
        const xCount = updatedBoard.filter((cell: string) => cell === 'X').length;
        const oCount = updatedBoard.filter((cell: string) => cell === 'O').length;
        setIsMyTurn((playerSymbol === 'X' && xCount === oCount) || (playerSymbol === 'O' && xCount > oCount));
        
        // التحقق من الفائز بعد كل تحديث
        const winner = checkWinner(updatedBoard);
        if (winner && !payload.new.winner) {
          handleGameEnd(winner);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [roomCode, playerSymbol]);

  // التعامل مع النقر على خلية
  const handleCellClick = async (index: number) => {
    if (!room || !isMyTurn || board[index] || room.winner) return;

    const newBoard = [...board];
    newBoard[index] = playerSymbol;
    
    // تحديث اللوحة في قاعدة البيانات
    const { error } = await supabase
      .from('tic_tac_toe_rooms')
      .update({ board: JSON.stringify(newBoard) })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في الحركة",
        description: "حاول مرة أخرى",
        variant: 'destructive'
      });
    }
  };

  // معالجة نهاية اللعبة
  const handleGameEnd = async (winner: string) => {
    if (!roomCode) return;

    const updateData: any = { winner };
    
    // تحديث النتائج
    if (winner !== 'tie') {
      if (winner === 'X') {
        updateData.player1_score = (room?.player1_score || 0) + 1;
      } else {
        updateData.player2_score = (room?.player2_score || 0) + 1;
      }
    }
    
    const { error } = await supabase
      .from('tic_tac_toe_rooms')
      .update(updateData)
      .eq('id', roomCode);

    if (error) {
      console.error('Error updating winner:', error);
    }
  };

  // دالة إعادة تعيين الجولة
  const resetRound = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from('tic_tac_toe_rooms')
      .update({
        board: JSON.stringify(Array(9).fill('')),
        round_winner: null,
        current_round: (room?.current_round || 1) + 1,
        winner: null,
        game_status: 'playing'
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في إعادة الجولة",
        description: "حاول مرة أخرى",
        variant: 'destructive'
      });
    }
  };

  // دالة إعادة تعيين اللعبة
  const resetGame = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from('tic_tac_toe_rooms')
      .update({
        board: JSON.stringify(Array(9).fill('')),
        player1_score: 0,
        player2_score: 0,
        current_round: 1,
        round_winner: null,
        winner: null,
        game_status: 'playing'
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في إعادة اللعبة",
        description: "حاول مرة أخرى",
        variant: 'destructive'
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
          <div className="text-lg font-bold">
            أنت: <span className={playerSymbol === 'X' ? 'text-blue-600' : 'text-red-600'}>{playerSymbol}</span>
          </div>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold">الغرفة: {roomCode}</h2>
          <p className="text-gray-600">
            {isMyTurn ? '🎮 دورك الآن!' : '⏳ انتظر دورك...'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {board.map((cell: string, index: number) => (
            <Button
              key={index}
              className={`w-full h-20 text-3xl border border-gray-300 ${
                cell === 'X' ? 'bg-blue-500 text-white' : 
                cell === 'O' ? 'bg-red-500 text-white' : 'bg-white'
              } ${!cell && isMyTurn && !room.winner ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}`}
              onClick={() => handleCellClick(index)}
              disabled={!isMyTurn || !!cell || !!room.winner}
            >
              {cell}
            </Button>
          ))}
        </div>

        <div className="flex justify-between">
          <div className="text-center">
            <div className="font-bold text-blue-600">X (المضيف)</div>
            <div className="text-2xl">{room?.player1_score || 0}</div>
          </div>
          <div className="text-center">
            <div>الجولة: {room?.current_round || 1}</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-red-600">O (الضيف)</div>
            <div className="text-2xl">{room?.player2_score || 0}</div>
          </div>
        </div>

        <div className="text-center">
          <Button onClick={resetRound} className="mx-2 mt-4" disabled={!isHost}>
            إعادة الجولة
          </Button>

          <Button onClick={resetGame} className="mx-2 mt-4" disabled={!isHost}>
            إعادة اللعبة
          </Button>
        </div>

        {room?.winner && (
          <div className="text-center text-xl font-bold mt-4 p-4 bg-green-100 rounded-lg">
            {room.winner === 'tie' ? '🤝 تعادل!' : `🎉 الفائز: ${room.winner === 'X' ? 'المضيف (X)' : 'الضيف (O)'}`}
          </div>
        )}
      </div>
    </div>
  );
};

export default TicTacToeRoom;
