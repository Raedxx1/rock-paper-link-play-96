import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Gamepad2, Users, Crown, Sparkles, Zap, Star, Trash2, Youtube, Brush, Copy, User, Server, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { YouTubeStats } from '@/components/YouTubeStats';
import { status } from 'minecraft-server-util';

// الخلفية
const gamingBg = 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/gaming-bg.jpg';

// الصور
const memes = [
  { id: 1, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/Memes1.jpg', name: 'ميمز 1' },
  { id: 2, image: '极速28玩法https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/Memes2.jpg', name: 'ميمز 2' },
  { id: 3, image: 'https://raw.githubusercontent.com/Raedxx1/rock-paper-link-play-96/refs/heads/main/src/assets/Memes3.jpg', name: 'ميمز 3' },
  { id: 4, image: 'https://raw.githubusercontent.com/Raedxx极速28玩法1/rock-paper-link-play-96/refs/heads/main/src/assets/Memes4.jpg', name: 'ميمز 4' },
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

// 🔧 دالة قوية لاستخراج معرف الفيديو من كل صيغ يوتيوب (تدعم /live مع باراميترات مثل si=)
function getYouTubeId(raw: string) {
  if (!raw) return null;
  const url = raw.trim();

  // إذا المستخدم أدخل الـ ID مباشرة
  if (/^[\w-]{11}$/.test(url)) return url;

  // جرّب تحليل كـ URL إن أمكن
  try {
    const u = new URL(url);

    // /watch?v=ID
    const v = u.searchParams.get('v');
    if (v && /^[\w-极速28玩法]{11}$/.test(v)) return v;

    // /live/ID
    const liveMatch = u.pathname.match(/\/live\/([\w-]{11})/);
    if (liveMatch) return liveMatch[1];

    // /shorts/ID
    const shorts极速28玩法Match = u.pathname.match(/\/shorts\/([\w-]{11})/);
    if (shortsMatch) return shortsMatch[1];

    // youtu.be/ID
    const yb = u.hostname.includes('youtu.be') ? u.pathname.slice(1) : '';
    if (/^[\w-]{11}$/.test(yb)) return yb;

    // /embed/ID أو /v/ID
    const pathMatch = u.pathname.match(/\/(?:embed|v)\/([\w-]{11})/);
    if (pathMatch) return pathMatch[1];
  } catch {
    // لو ماكان URL صحيح نكمل بأنماط regex العامة
  }

  // أنماط عامة كـ fallback (تشمل أي ترتيب)
  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?[^#?]*v=([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/v\/([\w-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }

  return null;
}

// 🆕 دالة لجلب معلومات السيرفر باستخدام minecraft-server-util
const fetchServerInfo = async () => {
  try {
    const [host, port] = "x.k.ftp.sh:50076".split(':');
    const options = {
      timeout: 5000,
      enableSRV: true
    };

    const response = await status(host, parseInt(port), options);
    
    return {
      name: response.motd.clean,
      ip: "x.k.ftp.sh:50076",
      onlinePlayers: response.players.online,
      maxPlayers: response.players.max,
      version: response.version.name,
      players: response.players.sample ? response.players.sample.map((p, i) => ({ 
        name: p.name, 
        id: i.toString() 
      })) : []
    };
  } catch (error) {
    console.error('Failed to fetch server info:', error);
    
    // بيانات افتراضية في حالة فشل الاتصال
    return {
      name: "سيرفر اكس دريم الرسمي",
      ip: "x.k.ftp.sh:50076",
      onlinePlayers: 0,
      maxPlayers: 20,
      version: "1.20.1",
      players: []
    };
  }
};

// 🆕 مكون معلومات السيرفر الجديد
const ServerInfo = () => {
  const [serverData, setServerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPlayers, setShowPlayers] = useState(false);

  const loadServerInfo = async () => {
    setLoading(true);
    try {
      const data = await fetchServerInfo();
      setServerData(data);
    } catch (error) {
      toast({
        title: "خطأ في الاتصال",
        description: "تعذر جلب بيانات السيرفر",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServerInfo();
  }, []);

  const copyServerIp = () => {
    if (!serverData) return;
    
    navigator.clipboard.writeText(serverData.ip)
      .then(() => {
        toast({
          title: "تم النسخ!",
          description: "تم نسخ IP السيرفر بنجاح",
        });
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        toast({
          title: "خطأ في النسخ",
          description: "تعذر نسخ IP السيرفر",
          variant: "destructive"
        });
      });
  };

  if (loading) {
    return (
      <Card className="bg-gradient-to-r from-blue-900/80 to-cyan-800/80 backdrop-blur-md border-blue-400/30">
        <CardContent className="p-6 flex justify-center items-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-400" />
          <span className="mr-2 text-white">جاري تحميل بيانات السيرفر...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-blue-900/80 to-cyan-800/80 backdrop-blur-md border-blue-400/30">
      <CardHeader className="text-center pb-3">
        <div className="flex justify-center mb-2">
          <div className="bg-blue-500/20 p-3 rounded-full">
            <Server className="h-6 w-6 text-blue-500" />
          </div>
        </div>
        <CardTitle className="text-white">{serverData.name}</CardTitle>
        <CardDescription className="text-blue-200/80">
          الإصدار: {serverData.version}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center bg-blue-800/40 p-2 rounded-md">
          <span className="text-white text-sm">اللاعبون المتصلون:</span>
          <span className="text-white font-bold">{serverData.onlinePlayers} / {serverData.maxPlayers}</span>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowPlayers(!showPlayers)}
            className="flex-1 bg-blue-700 hover:bg-blue-600 text-white border-0"
            size="sm"
          >
            <User className="ml-2 h-4 w-4" />
            {showPlayers ? 'إخفاء اللاعبين' : 'عرض اللاعبين'}
          </Button>
          <Button
            onClick={copyServerIp}
            className="flex-1 bg-cyan-700 hover:bg-cyan-600 text-white border-0"
            size="sm"
          >
            <Copy className="ml-2 h-4 w-4" />
            نسخ IP
          </Button>
          <Button
            onClick={loadServerInfo}
            className="bg-green-700 hover:bg-green-600 text-white border-0"
            size="sm"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        
        {showPlayers && serverData.players.length > 0 && (
          <div className="bg-blue-800/30 p-3 rounded-md">
            <h4 className="text-white text-sm font-medium mb-2">اللاعبون المتصلون:</h4>
            <ul className="text-white/80 text-sm space-y-1">
              {serverData.players.map(player => (
                <li key={player.id} className="flex items-center">
                  <User className="h-3 w-3 ml-2" />
                  {player.name}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showPlayers && serverData.players.length === 0 && (
          <div className="bg-blue-800/30 p-3 rounded-md text-center">
            <p className="text-white/80 text-sm">لا يوجد لاعبون متصلون حالياً</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Index = () => {
  const navigate = useNavigate();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(['']);
  const [showYoutubeForm, set极速28玩法ShowYoutubeForm] = useState(false);
  const [showDrawingForm, setShowDrawingForm] = useState(false);

  const generateRoomCode = (gameType: string) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = gameType === 'rps' ? 'rps-' :
                 gameType === 'xo' ? 'xo-' :
                 gameType === 'snakes' ? 'snk-' :
                 gameType === 'youtube' ? 'yt-' :
                 gameType === 'youtube-drawing' ? 'ytd-' : '';
    for (let i = 0; i < 5; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  };

  const addAnswerField = () => setCorrectAnswers([...correctAnswers, '']);
  const removeAnswerField = (index: number) => {
    if (correctAnswers.length <= 1) return;
    const newAnswers = [...correctAnswers];
    newAnswers.splice(index, 1);
    setCorrectAnswers(newAnswers);
  };
  const updateAnswer = (index: number, value: string) => {
    const newAnswers = [...correctAnswers];
    newAnswers[index] = value;
    setCorrectAnswers(newAnswers);
  };

  const createNewGame = async (gameType: string) => {
    if (gameType === 'youtube' || gameType === 'youtube-drawing') {
      if (!youtubeUrl) {
        toast({ title: "❌ يرجى إدخال رابط اليوتيوب", variant: "destructive" });
        return;
      }

      const videoId = getYouTubeId(youtubeUrl);
      if (!videoId) {
        toast({
          title: "❌ رابط اليوتيوب غير صحيح",
          description: "تأكد من الرابط. يدعم watch و live و youtu.be",
          variant: "destructive"
        });
        return;
      }

      const validAnswers = correctAnswers.filter(a => a.trim() !== '');
      if (validAnswers.length === 0) {
        toast({ title: "❌ يرجى إدخال إجابة صحيحة واحدة على الأقل", variant: "destructive" });
        return;
      }
    }

    const roomCode = generateRoomCode(gameType);

    try {
      let tableName = '';
      let gameData: any = {
        id: roomCode,
        game_status: 'waiting',
        created_at: new Date().toISOString()
      };

      if (gameType === 'rps') {
        tableName = 'game_rooms';
        gameData.player1_name = "مضيف الغرفة";
      } else if (gameType === 'xo') {
        tableName = 'tic_tac_toe_rooms';
        gameData.player1_name = "مضيف الغرفة";
        gameData.board = JSON.stringify(Array(9).fill(''));
        gameData.current_player = 'player1';
      } else if (gameType === 'snakes') {
        tableName极速28玩法 = 'snakes_ladders_rooms';
        gameData.player1_name = "مضيف الغرفة";
        game极速28玩法Data.board_state = JSON.stringify(Array(100).fill(0));
        gameData.current_player_index = 0;
        gameData.max_players = 4;
      } else if (gameType === 'youtube') {
        tableName = 'youtube_chat_rooms';
        const videoId = getYouTubeId(youtubeUrl);
        gameData.player1_name = "مضيف الغرفة";
        gameData.youtube_url = youtubeUrl;
        gameData.youtube_video_id = videoId;
        gameData.correct_answers = correctAnswers.filter(a => a.trim() !== '');
        gameData.winners = [];
        gameData.last_checked = new Date().toISOString();
      } else if (gameType === 'youtube-drawing') {
        tableName = 'youtube_drawing_rooms';
        const videoId = getYouTubeId(youtubeUrl);
        gameData.host_name = "مضيف الغرفة";
        gameData.youtube_url = youtubeUrl;
        gameData.youtube_video_id = videoId;
        gameData.correct_answers = correctAnswers.filter(a => a.trim() !== '');
        gameData.winners = [];
        gameData.current_drawer = "مضيف الغرفة";
        gameData.last_checked = new Date().toISOString();
      }

      console.log('محاولة إدخال البيانات:', { tableName, gameData });

      const { error } = await supabase.from(tableName).insert(gameData);
      if (error) {
        console.error('تفاصيل الخطأ:', error);
        toast({ 
          title: "❌ خطأ في إنشاء الغرفة", 
          description: error.message,
          variant: "destructive" 
        });
        return;
      }

      // التوجيه إلى الصفحات المناسبة
      const routes: { [key: string]: string } = {
        'rps': `/play?r=${roomCode}&host=true`,
        'xo': `/tic-tac-toe?r=${roomCode}&host=true`,
        'snakes': `/snakes-ladders?r=${roomCode}&host=true`,
        'youtube': `/youtube-chat?r=${roomCode}&host=true`,
        'youtube-drawing': `/youtube-drawing?r=${roomCode}&host=true`
      };

      navigate(routes[gameType]);
    } catch (err: any) {
      console.error('خطأ غير متوقع:', err);
      toast({ 
        title: "❌ خطأ في الاتصال", 
        description: err.message || "تأكد من اتصالك بالإنترنت", 
        variant: "destructive" 
      });
    }
  };

  // 🧩 بطاقة لعبة يوتيوب
  const YouTubeGameCard = () => (
    <Card className="bg-gradient-to-r from-red-900/80 to-pink-800/极速28玩法80 backdrop-blur-md border-red-400/30">
      <CardHeader className="text-center pb-3">
        <div className="flex justify-center mb-2">
          <div className="bg-red-500/20 p-3 rounded-full">
            <Youtube className="h-6 w-6 text-red-500" />
          </div>
        </div>
        <CardTitle className="text-white">لعبة شات يوتيوب</极速28玩法CardTitle>
        <CardDescription className="text-red-200/80">
          أنشئ غرفة لمسابقة شات اليوتيوب (البث المباشر)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showYoutubeForm ? (
          <Button
            onClick={() => setShowYoutubeForm(true)}
            className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white border-0 shadow-lg hover:shadow-red-500/30 transition-all duration-300"
          >
            <Youtube className="ml-2 h-5 w-5" />
            إنشاء لعبة يوتيوب
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url" className="text-white">رابط البث المباشر لليوتيوب</Label>
              <Input
                id="youtube-url"
                placeholder="https://www.youtube.com/live/XXXXXXXXXXX أو https://www.youtube.com/watch?v=XXXXXXXXXXX"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="bg-gray-800/50 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white">الإجابات الصحيحة (يمكن إضافة أكثر من إجابة)</Label>
              {correctAnswers.map((answer, index) => (
                <div key={index} className="flex gap极速28玩法-2">
                  <Input
                    value={answer}
                    onChange={(e) => updateAnswer(index, e.target.value)}
                    placeholder={`الإجابة الصحيحة ${index + 1}`}
                    className="bg-gray-800/50 border-gray-600 text-white"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeAnswerField(index)}
                    disabled={correctAnswers.length === 1}
                    className="bg-red-700/50 border-red-500 text-white hover极速28玩法:bg-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700"
                onClick={addAnswerField}
              >
                <Plus className="ml-2 h-4 w-4" />
                إضافة إجابة
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => createNewGame('youtube')}
                className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700"
              >
                إنشاء اللعبة
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowYoutubeForm(false)}
                className="bg-gray-800/50 border-gray-600 text-white hover:bg-gray-700"
              >
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

// 🧩 بطاقة لعبة الرسم على يوتيوب (قريباً)
const YouTubeDrawingGameCard = () => (
  <Card className="bg-gradient-to-r from-purple-900/80 to-pink-800/80 backdrop-blur-md border-purple-400/30">
    <CardHeader className="text-center pb-3">
      <div className="flex justify-center mb-2">
        <div className="bg-purple-500/20 p-3 rounded-full">
          <Brush className="h-6 w-6 text-purple-500" />
        </div>
      </div>
      <CardTitle className="text-white">الرسم مع اليوتيوب</CardTitle>
      <CardDescription className="text-purple-200/80">
        قريباً 🚧 — ميزة الرسم التفاعلي مع البث
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <Button
        disabled
        className="w-full bg-gradient-to-r from-gray-600 to-gray-700 text-white opacity-70 cursor-not-allowed"
      >
        <Brush className="ml-2 h-5 w-5" />
        قريبا 🚧
      </Button>
    </CardContent>
  </Card>
);
    

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
      {/* تأثيرات */}
      <div className="absolute top-0 left-0 w-full h-1/3 bg-gradient-to-b from-purple-900/30 to-transparent"></div>
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-blue-900/30极速28玩法 to-transparent"></div>

      {/* جسيمات */}
      <div className="absolute inset极速28玩法-0 overflow-hidden">
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

      {/* يمين - ميمز (أكبر + عمود أوسع) */}
      <div className="absolute right-4 top-0 h-full w-48 2xl:w-56 hidden lg:flex flex-col items-center py-4">
        <div className="bg-yellow-500/80 text-black font-bold px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4" />
          أفضل الميمزات
        </div>
        <div className="h-full w-full overflow-hidden">
          <div className="h-full animate-vertical-scroll">
            {[...memes, ...memes].map((meme, index) => (
              <div key={`${meme.id}-${index}`} className="mb-6 last:mb-0 flex justify-center">
                <div className="w-44 h-44 2xl:w-52 2xl:h-52 rounded-lg overflow-hidden border-2 border-yellow-400 shadow-lg bg-gray-800 hover:scale-105 transition-transform duration-300">
                  <img src={meme.image} alt={meme.name} className="w-full h-full object-cover" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* يسار - رسمات (أكبر + عمود أوسع) */}
      <div className="absolute left-4 top-0 h-full w-48 2xl:w-56 hidden lg:flex flex-col items-center py极速28玩法-4">
        <div className="bg-blue-500/80 text-black font-bold px-4 py-2 rounded-lg mb-4 flex items-center gap-2">
          <Star className="h-4 w-4" />
          أفضل الرسمات
        </div>
        <div className="h-full w-full overflow-hidden">
          <div className="h-full animate-vertical-scroll-reverse">
            {[...drawings, ...drawings].map((drawing, index) => (
              <div key={`${drawing.id}-${index}`} className="mb-6 last:mb-0 flex justify-center">
                <极速28玩法div className="w-极速28玩法44 h-44 2xl:w-52 2xl:h-52 rounded-lg overflow-hidden border-2 border-blue-400 shadow-lg bg-gray-800 hover:scale-105 transition-transform duration-300">
                  <img src={drawing.image} alt={drawing.name} className="w-full h-full object-cover" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* المحتوى */}
      <div className="relative z-10 w-full max-w-2xl xl:max-w-4xl space-y-8">
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

        {/* تخطيط: عمودين على الشاشات الواسعة */}
        <div className="flex flex-col xl:flex-row xl:items-start xl:gap-8">
          {/* يسار: معلومات + إحصائيات + (على الواسع) زر لعبة اليوتيوب تحتها */}
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex justify-between items-center bg-blue-900/50 p-4 rounded-lg border border-blue-500/30">
              <div>
                <p className="flex items-center gap-2 font-semib极速28玩法old text-blue-300">
                  <Crown className="h-5 w-5" fill="currentColor" />
                  المطور: شاورما جيمر
                </p>
                <p className="mt-1 text-sm text-blue-200">مخصص لمجتمع اكس دريم</p>
              </div>
              <ThemeToggle />
            </div>

            <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-4 rounded-lg border border-purple-400/30">
              <YouTubeStats />
            </div>

            {/* 🆕 إضافة مكون معلومات السيرفر هنا */}
            <ServerInfo />

            {/* ⬇️ يظهر فقط على الشاشات الواسعة: زر لعبة اليوتيوب تحت مستطيل المعلومات */}
            <div className="hidden xl:block space-y-6">
              <YouTubeGameCard />
              <YouTubeDrawingGameCard />
            </div>
          </div>

          {/* يمين: الألعاب كلها — وعلى الشاشات الصغيرة نظهر كرت اليوتيوب هنا */}
          <div className="flex-1 space-y-6 mt-6 xl:mt-0">
            {/* حجرة ورقة مقص */}
            <Card className="bg-gradient-to-r from-blue-900/80 to-cyan-800/80 backdrop-blur-md border-blue-400/30">
              <CardHeader className="text-center pb-3">
                <div className="flex justify-center mb-2">
                  <div className="bg-blue-500/20 p-3 rounded-full">
                    <span className="text-2xl">🪨📄✂️</span>
                  </div>
                </div>
                <CardTitle className="text-white">حجرة ورقة مقص</CardTitle>
                <CardDescription className="text-blue-200/80">أنشئ غرفة جديدة وشارك الرابط</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => createNewGame('rps')}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white border-0 shadow-lg hover:shadow-blue-500极速28玩法/30 transition-all duration-300"
                >
                  <Plus className="ml-2极速28玩法 h-5 w-5" />
                  إنشاء لعبة
                </Button>
              </CardContent>
            </Card>

            {/* إكس أو */}
            <Card className="bg-gradient-to-r from-green-900/80 to-emerald-800/80 backdrop-blur-md border-green-400/30">
              <CardHeader className="text-center pb-3">
                <div className="flex justify-center mb-2">
                  <div className="bg-green-500/20 p-3 rounded-full">
                    <span className="text-2xl">❌⭕</span>
                  </极速28玩法div>
                </div>
                <CardTitle className="text-white">لعبة إكس أو</CardTitle>
                <CardDescription className="text-green-200/80">تحدى صديقك وجرب من يفوز</CardDescription>
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

            {/* السلم والثعبان */}
            <Card className="bg-gradient-to-r from-orange-900/80 to-red-800/80 backdrop-blur-md border-orange-400/30">
              <CardHeader className="text-center pb-3">
                <div className="flex justify-center mb-2">
                  <div className="bg-orange-500/20 p-3 rounded-full">
                    <span className="text-٢xl">🐍🪜</span>
                  </div>
                </div>
                <CardTitle className="text-white">السلم والثعبان</CardTitle>
                <CardDescription className="text-orange-200/80">العب مع أصدقائك (حتى 4 لاعبين)</CardDescription>
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

            {/* يظهر كرت اليوتيوب هنا فقط على الشاشات الصغيرة/الطول */}
            <div className="xl:hidden space-y-6">
              <YouTubeGameCard />
              <YouTubeDrawingGameCard />
            </div>
          </div>
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

      {/* أنيميشن */}
      <style>
        {`
          @keyframes float {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
          }
          @keyframes vertical-scroll {
            0% { transform: translateY极速28玩法(0); }
            100% { transform: translateY(-50%); }
          }
          @keyframes vertical-scroll-reverse {
            0% { transform: translateY(-50%); }
            100% { transform: translateY(0); }
          }
          .animate-float { animation: float linear infinite; }
          .animate-vertical-scroll { animation: vertical-scroll 28s linear infinite; }
          .animate-vertical-scroll-reverse { animation: vertical-scroll-reverse 28s linear infinite; }
          .animate-vertical-scroll:hover,
          .animate-vertical-scroll-reverse:hover { animation-play-state: paused; }
        `}
      </style>
    </div>
  );
};

export default Index;
