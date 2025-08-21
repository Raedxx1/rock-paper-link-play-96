import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Gamepad2, Users, Crown, Sparkles, Zap, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { YouTubeStats } from '@/components/YouTubeStats';

// استيراد الصور
const gamingBg = 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/gaming-bg.jpg';

// إنشاء مصفوفات للصور (سنستخدم روابط من Unsplash للتمثيل)
const memes = [
  { id: 1, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/Memes1.jpg', name: 'ميمز 1' },
  { id: 2, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/Memes2.jpg', name: 'ميمز 2' },
  { id: 3, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/Memes3.jpg', name: 'ميمز 3' },
  { id: 4, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/Memes4.jpg', name: 'ميمز 4' },
  { id: 5, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/Memes5.jpg', name: 'ميمز 5' },
  { id: 6, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/Memes6.jpg', name: 'ميمز 6' },
  { id: 7, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/Memes7.jpg', name: 'ميمز 7' },
  { id: 8, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/Memes8.jpg', name: 'ميمز 8' },
];

const drawings = [
  { id: 1, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/drawing1.jpg', name: 'رسمة 1' },
  { id: 2, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/drawing2.jpg', name: 'رسمة 2' },
  { id: 3, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/drawing3.jpg', name: 'رسمة 3' },
  { id: 4, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/drawing4.jpg', name: 'رسمة 4' },
  { id: 5, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/drawing5.jpg', name: 'رسمة 5' },
  { id: 6, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/drawing6.jpg', name: 'رسمة 6' },
  { id: 7, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/drawing7.jpg', name: 'رسمة 7' },
  { id: 8, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/drawing8.jpg', name: 'رسمة 8' },
];

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

      {/* معرض الميمز على اليمين */}
      <div className="absolute right-4 top-0 h-full w-32 hidden lg:block overflow-hidden">
        <div className="h-full animate-vertical-scroll">
          {[...memes, ...memes].map((meme, index) => (
            <div key={`${meme.id}-${index}`} className="mb-6 last:mb-0">
              <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-yellow-400 shadow-lg bg-gray-800">
                <img 
                  src={meme.image} 
                  alt={meme.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* معرض الرسمات على اليسار */}
      <div className="absolute left-4 top-0 h-full w-32 hidden lg:block overflow-hidden">
        <div className="h-full animate-vertical-scroll-reverse">
          {[...drawings, ...drawings].map((drawing, index) => (
            <div key={`${drawing.id}-${index}`} className="mb-6 last:mb-0">
              <div className="w-32 h-32 rounded-lg overflow-hidden border-2 border-blue-400 shadow-lg bg-gray-800">
                <img 
                  src={drawing.image} 
                  alt={drawing.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>
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
              العاب XDreemB52
            </h1>
          </div>
          <p className="text-xl text-white/90 drop-shadow-md">موقع العاب وفعاليات اكس دريم - العب مع أصدقائك أونلاين!</p>
        </div>

        {/* معلومات المطور وإحصائيات اليوتيوب */}
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center bg-blue-900/50 p-4 rounded-lg border border-blue-500/30">
            <div>
              <p className="flex items-center gap-2 font-semibold text-blue-300">
                <Crown className="h-5 w-5" fill="currentColor" />
                المطور: شاورما جيمر
              </p>
              <p className="mt-1 text-sm text-blue-200">مخصص لمجتمع اكس دريم</p>
            </div>
            <ThemeToggle />
          </div>

          {/* إحصائيات اليوتيوب - محسنة للحجم والوضوح */}
          <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-4 rounded-lg border border-purple-400/30">
            <YouTubeStats />
          </div>
        </div>

        {/* ألعاب - مرتبة عموديا */}
        <div className="space-y-6">
          {/* كارد حجرة ورقة مقص */}
          <Card className="bg-gradient-to-r from-blue-900/80 to-cyan-800/80 backdrop-blur-md border-blue-400/30">
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-2">
                <div className="bg-blue-500/20 p-3 rounded-full">
                  <span className="text-2xl">🪨📄✂️</span>
                </div>
              </div>
              <CardTitle className="text-white">حجرة ورقة مقص</CardTitle>
              <CardDescription className="text-blue-200/80">
                أنشئ غرفة جديدة وشارك الرابط
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => createNewGame('rps')} 
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-blue-500/30 transition-all duration-300"
              >
                <Plus className="ml-2 h-5 w-5" />
                إنشاء لعبة
              </Button>
            </CardContent>
          </Card>

          {/* كارد لعبة إكس أو */}
          <Card className="bg-gradient-to-r from-green-900/80 to-emerald-800/80 backdrop-blur-md border-green-400/30">
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-2">
                <div className="bg-green-500/20 p-3 rounded-full">
                  <span className="text-2xl">❌⭕</span>
                </div>
              </div>
              <CardTitle className="text-white">لعبة إكس أو</CardTitle>
              <CardDescription className="text-green-200/80">
                تحدى صديقك وجرب من يفوز
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => createNewGame('xo')}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white border-0 shadow-lg hover:shadow-green-500/30 transition-all duration-300"
              >
                <Gamepad2 className="ml-2 h-5 w-5" />
                إنشاء لعبة
              </Button>
            </CardContent>
          </Card>

          {/* كارد لعبة السلم والثعبان */}
          <Card className="bg-gradient-to-r from-orange-900/80 to-red-800/80 backdrop-blur-md border-orange-400/30">
            <CardHeader className="text-center pb-3">
              <div className="flex justify-center mb-2">
                <div className="bg-orange-500/20 p-3 rounded-full">
                  <span className="text-2xl">🐍🪜</span>
                </div>
              </div>
              <CardTitle className="text-white">السلم والثعبان</CardTitle>
              <CardDescription className="text-orange-200/80">
                العب مع أصدقائك (حتى 4 لاعبين)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => createNewGame('snakes')}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white border-0 shadow-lg hover:shadow-orange-500/30 transition-all duration-300"
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

      {/* إضافة أنميشن للجسيمات والصور */}
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
          
          @keyframes vertical-scroll {
            0% {
              transform: translateY(0);
            }
            100% {
              transform: translateY(-50%);
            }
          }
          
          @keyframes vertical-scroll-reverse {
            0% {
              transform: translateY(-50%);
            }
            100% {
              transform: translateY(0);
            }
          }
          
          .animate-float {
            animation: float linear infinite;
          }
          
          .animate-vertical-scroll {
            animation: vertical-scroll 30s linear infinite;
          }
          
          .animate-vertical-scroll-reverse {
            animation: vertical-scroll-reverse 30s linear infinite;
          }
          
          .animate-vertical-scroll:hover,
          .animate-vertical-scroll-reverse:hover {
            animation-play-state: paused;
          }
        `}
      </style>
    </div>
  );
};

export default Index;
