import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// توليد رمز غرفة فريد
const generateRoomCode = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "ttt-";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // إنشاء غرفة جديدة
  const createNewGame = async () => {
    const roomCode = generateRoomCode(); // توليد رمز فريد للغرفة
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('tic_tac_toe_rooms')
        .insert({
          id: roomCode,
          board: JSON.stringify(Array(9).fill('')), // مصفوفة فارغة للوحة
          current_player: 'X',  // اللاعب الأول
          winner: null,  // لا يوجد فائز بعد
          game_status: 'waiting',  // حالة اللعبة
          player1_name: "مضيف XO",  // اسم اللاعب الأول
        });

      if (error) {
        toast({
          title: "❌ خطأ في إنشاء الغرفة",
          description: `تفاصيل الخطأ: ${error.message}`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // بعد إنشاء الغرفة بنجاح، قم بتوجيه المستخدم إلى صفحة اللعبة مع رمز الغرفة
      const roomLink = `/tic-tac-toe?r=${roomCode}&host=true`;
      navigate(roomLink);
    } catch (error) {
      console.error('Error in connection:', error);
      toast({
        title: "❌ فشل في الاتصال",
        description: 'تأكد من اتصالك بالإنترنت',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4">
        <Button onClick={createNewGame} disabled={loading}>
          {loading ? 'جارٍ إنشاء الغرفة...' : 'إنشاء غرفة جديدة'}
        </Button>
      </div>
    </div>
  );
};

export default Home;
