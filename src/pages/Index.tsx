
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
      {/* Overlay للون مع تحسين للثيم الفاتح */}
      <div className="absolute inset-0 bg-black/50 dark:bg-black/60"></div>
      
      {/* المحتوى */}
      <div className="relative z-10 w-full max-w-md space-y-6">
        {/* شريط التنقل العلوي */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-white drop-shadow-lg">
            <p>💻 مبرمج من قبل: <span className="font-semibold text-cyan-200">شاورما جيمر</span></p>
            <p>🎮 مخصص لـ: <span className="font-semibold text-pink-200">اكس دريم</span></p>
          </div>
          <ThemeToggle />
        </div>

        {/* إحصائيات اليوتيوب */}
        <YouTubeStats />

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white drop-shadow-xl">🪨📄✂️</h1>
          <h2 className="text-2xl font-bold text-white drop-shadow-xl">حجرة ورقة مقص</h2>
          <p className="text-white drop-shadow-lg font-medium">العب مع أصدقائك أونلاين!</p>
        </div>

        <Card className="w-full bg-white/98 dark:bg-black/85 backdrop-blur-md border-white/30 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-card-foreground">إنشاء لعبة جديدة</CardTitle>
            <CardDescription className="text-muted-foreground">
              أنشئ غرفة جديدة وشارك الرابط مع صديقك
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={createNewGame} 
              className="w-full text-lg py-6 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-primary-foreground border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02]"
              size="lg"
            >
              <Plus className="ml-2 h-5 w-5" />
              🆕 إنشاء لعبة جديدة
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-white space-y-1 drop-shadow-lg font-medium">
          <p>💡 نصيحة: شارك الرابط مع صديقك لبدء اللعب</p>
          <p>🎮 يمكن لشخصين فقط اللعب في كل غرفة</p>
        </div>

        {/* معلومات المطور */}
        <div className="text-center text-xs text-white border-t border-white/30 pt-4 drop-shadow-lg font-medium">
          <p>© 2024 شاورما جيمر - جميع الحقوق محفوظة</p>
          <p>مطورة خصيصاً لمجتمع اكس دريم</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
