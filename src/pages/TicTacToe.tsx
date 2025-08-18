import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import gamingBg from '@/assets/gaming-bg.jpg';

// توليد رمز غرفة فريد
const generateRoomCode = (gameType: string) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = `${gameType}-`;
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // إنشاء غرفة جديدة
  const createNewGame = async (gameType: string) => {
    const roomCode = generateRoomCode(gameType); // توليد رمز فريد للغرفة
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from(`${gameType}_rooms`)  // استخدام النوع لتحديد الجدول المناسب
        .insert({
          id: roomCode,
          board: JSON.stringify(Array(9).fill('')), // مصفوفة فارغة للوحة (إذا كانت إكس-أو)
          current_player: 'X',  // اللاعب الأول
          winner: null,  // لا يوجد فائز بعد
          game_status: 'waiting',  // حالة اللعبة
          player1_name: "مضيف اللعبة",  // اسم اللاعب الأول
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
      const roomLink = `/${gameType}?r=${roomCode}&host=true`;
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
    <div 
      className="min-h-screen relative flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${gamingBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60"></div>
      
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex justify-between items-center">
          <ThemeToggle />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">🎮 اختر لعبتك</h1>
          <p className="text-white/90 drop-shadow">العب مع أصدقائك أونلاين!</p>
        </div>

        {/* كارد حجرة ورقة مقص */}
        <div className="w-full bg-white/95 dark:bg-black/80 backdrop-blur-sm border-white/20 p-4 rounded-xl shadow-xl">
          <Button 
            onClick={() => createNewGame('game')} 
            disabled={loading}
            className="w-full text-lg py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            🪨📄✂️ إنشاء لعبة حجرة ورقة مقص
          </Button>
        </div>

        {/* كارد لعبة إكس أو */}
        <div className="w-full bg-white/95 dark:bg-black/80 backdrop-blur-sm border-white/20 p-4 rounded-xl shadow-xl">
          <Button 
            onClick={() => createNewGame('tic_tac_toe')} 
            disabled={loading}
            className="w-full text-lg py-6 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            ❌⭕ إنشاء لعبة إكس أو
          </Button>
        </div>

        <div className="text-center text-xs text-white/70 border-t border-white/20 pt-4 drop-shadow">
          <p>© 2024 شاورما جيمر - جميع الحقوق محفوظة</p>
          <p>مطورة خصيصاً لمجتمع اكس دريم</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
