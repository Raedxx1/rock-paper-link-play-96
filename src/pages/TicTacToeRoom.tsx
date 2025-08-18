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
  const roomCode = searchParams.get('r');  // الحصول على رمز الغرفة من الرابط
  const isHost = searchParams.get('host') === 'true';  // التأكد إذا كنت المضيف

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true); // حالة التحميل
  const board = useMemo(() => room ? JSON.parse(room.board) : Array(9).fill(''), [room]);

  // جلب بيانات الغرفة
  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomCode) {
        toast({
          title: '❌ خطأ في الرابط',
          description: 'رمز الغرفة غير موجود',
          variant: 'destructive',
        });
        setLoading(false); // إيقاف التحميل إذا كان الرابط خاطئًا
        return;
      }

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
          setLoading(false); // إيقاف التحميل عند فشل الجلب
          return;
        }

        setRoom(data);
        setLoading(false); // بعد تحميل البيانات، نقوم بتغيير حالة التحميل
      } catch (error) {
        console.error('Error fetching room data:', error);
        toast({
          title: '❌ خطأ في الاتصال',
          description: 'فشل في تحميل البيانات من السيرفر',
          variant: 'destructive',
        });
        setLoading(false); // إيقاف التحميل إذا حدث خطأ في الاتصال
      }
    };

    fetchRoomData();  // جلب البيانات عند تحميل الصفحة
  }, [roomCode]);

  // دالة إعادة تعيين الجولة
  const resetRound = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from('tic_tac_toe_rooms')
      .update({
        player1_choice: null,
        player2_choice: null,
        round_winner: null,
        current_round: (room?.current_round || 1) + 1,
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
        player1_choice: null,
        player2_choice: null,
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
        </div>

        <div className="grid grid-cols-3 gap-2">
          {board.map((cell, index) => (
            <Button
              key={index}
              className="w-full h-20 text-3xl border border-gray-300"
              style={{ backgroundColor: cell ? (cell === 'X' ? '#FF5733' : '#33FF57') : 'white' }}
            >
              {cell}
            </Button>
          ))}
        </div>

        <div className="text-center">
          <Button onClick={resetRound} className="mx-2 mt-4">
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
