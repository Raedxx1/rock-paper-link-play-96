import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Plus } from 'lucide-react';

// توليد رمز غرفة فريد
const generateRoomCode = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'ttt-';
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
    const roomCode = generateRoomCode();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('tic_tac_toe_rooms')
        .insert({
          id: roomCode,
          board: JSON.stringify(Array(9).fill('')), // مصفوفة فارغة
          current_player: 'X',
          winner: null,
          game_status: 'waiting',  // حالة اللعبة
          player1_name: "مضيف XO",  // اسم اللاعب الأول
        }).single();  // تأكد من إدخال صف واحد فقط

      if (error) {
        console.error('Error creating room:', error.message);
        toast({
          title: '❌ خطأ في إنشاء الغرفة',
          description: `تفاصيل الخطأ: ${error.message}`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // التوجيه إلى صفحة اللعبة مع رمز الغرفة
      const roomLink = `/tic-tac-toe?r=${roomCode}&host=true`;
      console.log('تم إنشاء الغرفة بنجاح، التوجيه إلى: ', roomLink);
      navigate(roomLink);  // التوجيه إلى صفحة اللعبة مع الرابط الجديد
    } catch (error) {
      console.error('Error in connection:', error);
      toast({
        title: '❌ خطأ في الاتصال',
        description: 'تأكد من اتصالك بالإنترنت',
        variant: 'destructive',
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
              {loading ? 'جارٍ إنشاء الغرفة...' : 'إنشاء غرفة جديدة'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Home;
