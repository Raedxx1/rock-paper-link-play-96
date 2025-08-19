import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Plus, Gamepad2, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { YouTubeStats } from '@/components/YouTubeStats';
import gamingBg from '@/assets/gaming-bg.jpg';

const Index = () => {
  const navigate = useNavigate();
  const [roomLink, setRoomLink] = useState<string>('');

  const generateRoomCode = (gameType: string) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    if (gameType === 'rps') {
      result = 'rps-';
    } else if (gameType === 'xo') {
      result = 'xo-';
    } else if (gameType === 'snakes') {
      result = 'snk-';
    }
    
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createNewGame = async (gameType: string) => {
    const roomCode = generateRoomCode(gameType);
    
    try {
      let tableName = '';
      let gameData: any = {
        id: roomCode,
        player1_name: "مضيف الغرفة",
        game_status: 'waiting'
      };

      if (gameType === 'rps') {
        tableName = 'game_rooms';
      } else if (gameType === 'xo') {
        tableName = 'tic_tac_toe_rooms';
        gameData.board = JSON.stringify(Array(9).fill(''));
        gameData.current_player = 'player1';
      } else if (gameType === 'snakes') {
        tableName = 'snakes_ladders_rooms';
        gameData.board_state = JSON.stringify(Array(100).fill(0));
        gameData.current_player_index = 0;
        gameData.max_players = 4;
      }

      const { error } = await supabase
        .from(tableName)
        .insert(gameData);

      if (error) {
        toast({
          title: "❌ خطأ في إنشاء الغرفة",
          description: "حاول مرة أخرى",
          variant: "destructive"
        });
        return;
      }

      if (gameType === 'rps') {
        navigate(`/play?r=${roomCode}&host=true`);
      } else if (gameType === 'xo') {
        navigate(`/tic-tac-toe?r=${roomCode}&host=true`);
      } else if (gameType === 'snakes') {
        navigate(`/snakes-ladders?r=${roomCode}&host=true`);
      }
    } catch (error) {
      toast({
        title: "❌ خطأ في الاتصال",
        description: "تأكد من اتصالك بالإنترنت",
        variant: "destructive"
      });
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
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60"></div>
      
      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-white/90">
            <p>💻 مبرمج من قبل: <span className="font-semibold text-blue-300">شاورما جيمر</span></p>
            <p>🎮 مخصص لـ: <span className="font-semibold text-purple-300">اكس دريم</span></p>
          </div>
          <ThemeToggle />
        </div>

        <YouTubeStats />

        {/* العنوان */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">🎮 اختر لعبتك</h1>
          <p className="text-white/90 drop-shadow">العب مع أصدقائك أونلاين!</p>
        </div>

        {/* كارد حجرة ورقة مقص */}
        <Card className="w-full bg-white/95 dark:bg-black/80 backdrop-blur-sm border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-gray-900 dark:text-white">🪨📄✂️ حجرة ورقة مقص</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              أنشئ غرفة جديدة وشارك الرابط مع صديقك
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => createNewGame('rps')} 
              className="w-full text-lg py-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="ml-2 h-5 w-5" />
              🆕 إنشاء لعبة جديدة
            </Button>
          </CardContent>
        </Card>

        {/* كارد لعبة إكس أو */}
        <Card className="w-full bg-white/95 dark:bg-black/80 backdrop-blur-sm border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-gray-900 dark:text-white">❌⭕ لعبة إكس أو</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              تحدى صديقك وجرب من يفوز
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => createNewGame('xo')}
              className="w-full text-lg py-6 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Gamepad2 className="ml-2 h-5 w-5" />
              🆕 إنشاء لعبة جديدة
            </Button>
          </CardContent>
        </Card>

        {/* كارد لعبة السلم والثعبان */}
        <Card className="w-full bg-white/95 dark:bg-black/80 backdrop-blur-sm border-white/20">
          <CardHeader className="text-center">
            <CardTitle className="text-gray-900 dark:text-white">🐍🪜 السلم والثعبان</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              العب مع أصدقائك (حتى 4 لاعبين)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => createNewGame('snakes')}
              className="w-full text-lg py-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Users className="ml-2 h-5 w-5" />
              🆕 إنشاء لعبة جديدة
            </Button>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-white/70 border-t border-white/20 pt-4 drop-shadow">
          <p>© 2024 شاورما جيمر - جميع الحقوق محفوظة</p>
          <p>مطورة خصيصاً لمجتمع اكس دريم</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
