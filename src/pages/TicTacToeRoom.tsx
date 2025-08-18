import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

const TicTacToeRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get('r'); // الحصول على رمز الغرفة من الرابط
  const isHost = searchParams.get('host') === 'true'; // التأكد إذا كنت المضيف

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

        if (error) {
          toast({
            title: '❌ فشل في تحميل الغرفة',
            description: `الخطأ: ${error.message}`,
            variant: 'destructive',
          });
          setLoading(false); // إيقاف التحميل عند فشل الجلب
          return;
        }

        setRoom(data);
        setLoading(false);  // بعد تحميل البيانات، نقوم بتغيير حالة التحميل
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
              onClick={() => playAt(index)} // هنا يمكن استدعاء دالة اللعب
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
