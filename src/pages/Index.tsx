import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Plus, Gamepad2, Users, Crown, Sparkles, Zap, Star } from 'lucide-react';
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
      className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden" 
      dir="rtl"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9)), url(${gamingBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* تأثيرات الجمالية */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-purple-900/30 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-blue-900/30 to-transparent"></div>
      
      {/* جسيمات متحركة */}
      <div className="absolute inset-0 overflow-hidden">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}
          >
            <Sparkles size={16} className="text-yellow-400/40" />
          </div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-2xl space-y-8">
        {/* الهيدر */}
        <div className="text-center space-y-4 mb-6">
          <div className="flex items-center justify-center gap-3">
            <div className="relative">
              <Zap className="h-10 w-10 text-yellow-400 animate-pulse" fill="currentColor" />
              <Star className="absolute -top-1 -right-2 h-5 w-5 text-blue-400" fill="currentColor" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent drop-shadow-lg">
              شاورما جيمر
            </h1>
          </div>
          <p className="text-xl text-white/90 drop-shadow-md">منصة الألعاب العربية - العب مع أصدقائك أونلاين!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* معلومات المطور */}
          <Card className="bg-gradient-to-br from-blue-900/70 to-purple-900/70 backdrop-blur-md border-blue-500/30 text-white">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="flex items-center gap-2 font-semibold text-blue-300">
                    <Crown className="h-5 w-5" fill="currentColor" />
                    المطور: شاورما جيمر
                  </p>
                  <p className="mt-2 text-sm text-blue-200">مخصص لمجتمع اكس دريم</p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          {/* إحصائيات اليوتيوب - محفوظة كما هي */}
          <YouTubeStats />
        </div>

        {/* ألعاب */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* كارد حجرة ورقة مقص */}
          <Card className="group bg-gradient-to-br from-blue-900/80 to-cyan-800/80 backdrop-blur-md border-blue-400/30 hover:border-blue-400/60 transition-all duration-500 hover:scale-105">
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-2">
                <div className="bg-blue-500/20 p-3 rounded-full">
                  <span className="text-2xl">🪨📄✂️</span>
                </div>
              </div>
              <CardTitle className="text-white group-hover:text-blue-300 transition-colors">حجرة ورقة مقص</CardTitle>
              <CardDescription className="text-blue-200/80">
                أنشئ غرفة جديدة وشارك الرابط
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => createNewGame('rps')} 
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-blue-500/30 transition-all duration-300 group-hover:shadow-blue-500/50"
              >
                <Plus className="ml-2 h-5 w-5" />
                إنشاء لعبة
              </Button>
            </CardContent>
          </Card>

          {/* كارد لعبة إكس أو */}
          <Card className="group bg-gradient-to-br from-green-900/80 to-emerald-800/80 backdrop-blur-md border-green-400/30 hover:border-green-400/60 transition-all duration-500 hover:scale-105">
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-2">
                <div className="bg-green-500/20 p-3 rounded-full">
                  <span className="text-2xl">❌⭕</span>
                </div>
              </div>
              <CardTitle className="text-white group-hover:text-green-300 transition-colors">لعبة إكس أو</CardTitle>
              <CardDescription className="text-green-200/80">
                تحدى صديقك وجرب من يفوز
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => createNewGame('xo')}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-green-500/30 transition-all duration-300 group-hover:shadow-green-500/50"
              >
                <Gamepad2 className="ml-2 h-5 w-5" />
                إنشاء لعبة
              </Button>
            </CardContent>
          </Card>

          {/* كارد لعبة السلم والثعبان */}
          <Card className="group bg-gradient-to-br from-orange-900/80 to-red-800/80 backdrop-blur-md border-orange-400/30 hover:border-orange-400/60 transition-all duration-500 hover:scale-105">
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-2">
                <div className="bg-orange-500/20 p-3 rounded-full">
                  <span className="text-2xl">🐍🪜</span>
                </div>
              </div>
              <CardTitle className="text-white group-hover:text-orange-300 transition-colors">السلم والثعبان</CardTitle>
              <CardDescription className="text-orange-200/80">
                العب مع أصدقائك (حتى 4 لاعبين)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => createNewGame('snakes')}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border-0 shadow-lg hover:shadow-orange-500/30 transition-all duration-300 group-hover:shadow-orange-500/50"
              >
                <Users className="ml-2 h-5 w-5" />
                إنشاء لعبة
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* الفوتر */}
        <div className="text-center text-sm text-white/70 border-t border-white/20 pt-6 mt-6">
          <p className="flex items-center justify-center gap-2">
            <span>© 2024 شاورما جيمر - جميع الحقوق محفوظة</span>
            <Sparkles className="h-4 w-4 text-yellow-400" />
          </p>
          <p>مطورة خصيصاً لمجتمع اكس دريم</p>
        </div>
      </div>

      {/* إضافة أنميشن للجسيمات */}
      <style>
        {`
          @keyframes float {
            0% {
              transform: translateY(0) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(-100vh) rotate(360deg);
              opacity: 0;
            }
          }
          .animate-float {
            animation: float linear infinite;
          }
        `}
      </style>
    </div>
  );
};

export default Index;
