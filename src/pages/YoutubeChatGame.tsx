import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, ArrowLeft, Youtube, Crown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface YoutubeChatRoom {
  id: string;
  youtube_url: string;
  correct_answers: string[];
  game_status: 'waiting' | 'playing' | 'completed';
  winners: string[];
  player1_name: string;
}

const YoutubeChatGame = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get('r');
  const isHost = searchParams.get('host') === 'true';
  
  const [roomData, setRoomData] = useState<YoutubeChatRoom | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  
  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    fetchRoomData();

    const subscription = supabase
      .channel('youtube_chat_room_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'youtube_chat_rooms',
          filter: `id=eq.${roomCode}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setRoomData(payload.new as YoutubeChatRoom);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomCode, navigate]);

  const fetchRoomData = async () => {
    if (!roomCode) return;

    const { data, error } = await supabase
      .from('youtube_chat_rooms')
      .select('*')
      .eq('id', roomCode)
      .single();

    if (error) {
      toast({
        title: "❌ الغرفة غير موجودة",
        description: "تأكد من صحة الرابط",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    setRoomData(data as YoutubeChatRoom);
    setLoading(false);
  };

  const joinGame = async () => {
    if (!playerName.trim()) {
      toast({
        title: "❌ يرجى إدخال اسمك",
        variant: "destructive"
      });
      return;
    }

    setJoined(true);
    toast({
      title: "✅ تم الانضمام بنجاح",
      description: "يمكنك الآن المشاركة في اللعبة"
    });
  };

  const submitAnswer = async () => {
    if (!roomData || !answer.trim() || !joined) return;

    // التحقق من الإجابة
    const isCorrect = roomData.correct_answers.some(correctAnswer => 
      answer.trim().toLowerCase() === correctAnswer.toLowerCase()
    );

    if (isCorrect) {
      // إذا كانت الإجابة صحيحة، نضيف اللاعب إلى قائمة الفائزين
      const newWinners = [...roomData.winners, playerName];
      
      const { error } = await supabase
        .from('youtube_chat_rooms')
        .update({ winners: newWinners })
        .eq('id', roomCode);

      if (error) {
        toast({
          title: "❌ خطأ في إرسال الإجابة",
          variant: "destructive"
        });
      } else {
        toast({
          title: "🎉 إجابة صحيحة!",
          description: `أنت الفائز رقم ${newWinners.length}`,
        });
      }
    } else {
      toast({
        title: "❌ إجابة خاطئة",
        description: "حاول مرة أخرى",
        variant: "destructive"
      });
    }

    setAnswer('');
  };

  const shareRoom = async () => {
    const link = `${window.location.origin}/youtube-chat?r=${roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "✅ تم نسخ الرابط!",
        description: "شارك الرابط مع أصدقائك",
      });
    } catch (err) {
      toast({
        title: "❌ فشل في نسخ الرابط",
        description: "حاول نسخه يدوياً",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-lg text-gray-600">جارٍ تحميل الغرفة...</p>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-lg text-gray-600">الغرفة غير موجودة</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            العودة للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Youtube className="h-6 w-6 text-red-500" />
              انضمام إلى لعبة شات يوتيوب
            </CardTitle>
            <CardDescription>ادخل اسمك للانضمام إلى اللعبة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>اسمك</Label>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="أدخل اسمك هنا"
                onKeyPress={(e) => e.key === 'Enter' && joinGame()}
              />
            </div>
            <Button onClick={joinGame} className="w-full">انضم الآن</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* شريط التنقل */}
        <div className="flex justify-between items-center">
          <Button 
            onClick={() => navigate('/')} 
            variant="outline" 
            size="sm"
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            الرئيسية
          </Button>
          
          <Button onClick={shareRoom} variant="outline" size="sm">
            <Copy className="ml-2 h-4 w-4" />
            مشاركة الرابط
          </Button>
        </div>

        {/* معلومات الغرفة */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Youtube className="h-6 w-6 text-red-500" />
              لعبة شات يوتيوب
            </CardTitle>
            <CardDescription>أول 3 يجيبون الإجابة الصحيحة يفوزون!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video mb-4">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${getYouTubeId(roomData.youtube_url)}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            
            <div className="text-center text-sm text-gray-600">
              البث المباشر hosted by: {roomData.player1_name}
            </div>
          </CardContent>
        </Card>

        {/* إدخال الإجابة */}
        <Card>
          <CardHeader>
            <CardTitle>أدخل إجابتك</CardTitle>
            <CardDescription>اكتب الإجابة التي تظهر في شات اليوتيوب</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="أدخل إجابتك هنا..."
                onKeyPress={(e) => e.key === 'Enter' && submitAnswer()}
              />
              <Button onClick={submitAnswer}>إرسال</Button>
            </div>
          </CardContent>
        </Card>

        {/* الفائزون */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              الفائزون
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roomData.winners.length === 0 ? (
              <p className="text-center text-gray-500">لا يوجد فائزون حتى الآن</p>
            ) : (
              <div className="space-y-2">
                {roomData.winners.map((winner, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-lg">
                    <div className="w-8 h-8 flex items-center justify-center bg-yellow-500 text-white rounded-full">
                      {index + 1}
                    </div>
                    <span className="font-medium">{winner}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// دالة مساعدة لاستخراج معرف الفيديو من رابط اليوتيوب
function getYouTubeId(url: string) {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

export default YoutubeChatGame;
