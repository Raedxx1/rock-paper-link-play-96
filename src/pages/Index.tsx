
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { YouTubeStats } from '@/components/YouTubeStats';
import gamingBg from '@/assets/gaming-bg.jpg';

const Index = () => {
  const navigate = useNavigate();
  const [roomLink, setRoomLink] = useState<string>('');

  const generateRoomCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'rps-';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createNewGame = async () => {
    const roomCode = generateRoomCode();
    
    try {
      // إنشاء غرفة جديدة في قاعدة البيانات
      const { error } = await supabase
        .from('game_rooms')
        .insert({
          id: roomCode,
          player1_name: "مضيف الغرفة",
          game_status: 'waiting'
        });

      if (error) {
        toast({
          title: "❌ خطأ في إنشاء الغرفة",
          description: "حاول مرة أخرى",
          variant: "destructive"
        });
        return;
      }

      // الانتقال مباشرة للغرفة مع تمييز أنه مضيف الغرفة
      navigate(`/play?r=${roomCode}&host=true`);
    } catch (error) {
      toast({
        title: "❌ خطأ في الاتصال",
        description: "تأكد من اتصالك بالإنترنت",
        variant: "destructive"
      });
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      toast({
        title: "✅ تم نسخ الرابط!",
        description: "يمكنك الآن مشاركته مع أصدقائك",
      });
    } catch (err) {
      toast({
        title: "❌ فشل في نسخ الرابط",
        description: "حاول نسخه يدوياً",
        variant: "destructive"
      });
    }
  };

  const joinGame = () => {
    if (roomLink) {
      window.open(roomLink, '_blank');
    }
  };

  return (
    <div 
      className="min-h-screen relative flex items-center justify-center p-4" 
      dir="rtl"
      style={{
        backgroundImage: `url(${gamingBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay للون */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60"></div>
      
      {/* المحتوى */}
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* شريط التنقل العلوي */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-white/90">
            <p>💻 مبرمج من قبل: <span className="font-semibold text-blue-300">شاورما جيمر</span></p>
            <p>🎮 مخصص لـ: <span className="font-semibold text-purple-300">اكس دريم</span></p>
          </div>
          <ThemeToggle />
        </div>

        {/* إحصائيات اليوتيوب */}
        <YouTubeStats />

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">🪨📄✂️</h1>
          <h2 className="text-2xl font-bold text-white drop-shadow-lg">حجرة ورقة مقص</h2>
          <p className="text-white/90 drop-shadow">العب مع أصدقائك أونلاين!</p>
        </div>

        <Card className="w-full bg-white/95 dark:bg-black/80 backdrop-blur-sm border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-gray-900 dark:text-white">إنشاء لعبة جديدة</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              أنشئ غرفة جديدة وشارك الرابط مع صديقك
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={createNewGame} 
              className="w-full text-lg py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            >
              <Plus className="ml-2 h-5 w-5" />
              🆕 إنشاء لعبة جديدة
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-white/80 space-y-1 drop-shadow">
          <p>💡 نصيحة: شارك الرابط مع صديقك لبدء اللعب</p>
          <p>🎮 يمكن لشخصين فقط اللعب في كل غرفة</p>
        </div>

        {/* معلومات المطور */}
        <div className="text-center text-xs text-white/70 border-t border-white/20 pt-4 drop-shadow">
          <p>© 2024 شاورما جيمر - جميع الحقوق محفوظة</p>
          <p>مطورة خصيصاً لمجتمع اكس دريم</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
