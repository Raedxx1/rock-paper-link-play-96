
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        {/* شريط التنقل العلوي */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>💻 مبرمج من قبل: <span className="font-semibold text-blue-600 dark:text-blue-400">شاورما جيمر</span></p>
            <p>🎮 مخصص لـ: <span className="font-semibold text-purple-600 dark:text-purple-400">اكس دريم</span></p>
          </div>
          <ThemeToggle />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">🪨📄✂️</h1>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">حجرة ورقة مقص</h2>
          <p className="text-gray-600 dark:text-gray-400">العب مع أصدقائك أونلاين!</p>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle>إنشاء لعبة جديدة</CardTitle>
            <CardDescription>
              أنشئ غرفة جديدة وشارك الرابط مع صديقك
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={createNewGame} 
              className="w-full text-lg py-6"
              size="lg"
            >
              <Plus className="ml-2 h-5 w-5" />
              🆕 إنشاء لعبة جديدة
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p>💡 نصيحة: شارك الرابط مع صديقك لبدء اللعب</p>
          <p>🎮 يمكن لشخصين فقط اللعب في كل غرفة</p>
        </div>

        {/* معلومات المطور */}
        <div className="text-center text-xs text-gray-400 dark:text-gray-500 border-t pt-4">
          <p>© 2024 شاورما جيمر - جميع الحقوق محفوظة</p>
          <p>مطورة خصيصاً لمجتمع اكس دريم</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
