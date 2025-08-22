import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ArrowLeft, Youtube, Crown, RefreshCw, Eye, EyeOff, Brush } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface YoutubeDrawingRoom {
  id: string;
  youtube_url: string;
  youtube_video_id: string;
  current_word: string;
  correct_answers: string[];
  winners: string[];
  host_name: string;
  current_drawer: string;
  game_status: 'waiting' | 'drawing' | 'guessing' | 'completed';
  last_checked: string;
  drawing_data: string;
}

const YoutubeDrawingGame = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get('r');
  const isHost = searchParams.get('host') === 'true';
  const isDrawer = searchParams.get('drawer') === 'true';

  const [roomData, setRoomData] = useState<YoutubeDrawingRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showWord, setShowWord] = useState(false);

  // مفتاح API مباشر
  const YOUTUBE_API_KEY = "AIzaSyBIuk3jEwfWwGpV6G3mY8jx2Otwbptj00A";

  // قائمة الكلمات العشوائية
  const randomWords = [
    'تفاحة', 'قلم', 'كتاب', 'شمس', 'قمر', 'سيارة', 'منزل', 'شجرة', 
    'زهرة', 'قطة', 'كلب', 'طائر', 'سمكة', 'نظارة', 'هاتف', 'كمبيوتر',
    'بحر', 'جبل', 'نهر', 'وردة', 'فراشة', 'نجمة', 'سحابة', 'طائرة',
    'ساعة', 'باب', 'نافذة', 'سرير', 'كرسي', 'طاولة', 'زجاجة', 'كوب',
    'قبعة', 'حذاء', 'جورب', 'قميص', 'سروال', 'فستان', 'عصا', 'كرة',
    'سيف', 'درع', 'تاج', 'مفتاح', 'قفل', 'سلة', 'ورق', 'مقص',
    'غيمة', 'قوس قزح', 'ثعبان', 'أسد', 'فيل', 'زرافة', 'قرد', 'بطريق'
  ];

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    fetchRoomData();

    const subscription = supabase
      .channel('youtube_drawing_room_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'youtube_drawing_rooms',
          filter: `id=eq.${roomCode}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setRoomData(payload.new as YoutubeDrawingRoom);
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
      .from('youtube_drawing_rooms')
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

    setRoomData(data as YoutubeDrawingRoom);
    setLoading(false);
  };

  // دالة تجيب liveChatId من videoId
  const getLiveChatId = async (videoId: string): Promise<string | null> => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
      );
      const data = await res.json();
      return data.items?.[0]?.liveStreamingDetails?.activeLiveChatId || null;
    } catch (error) {
      console.error("Error getting live chat ID:", error);
      return null;
    }
  };

  // دالة تجيب رسائل الشات المباشر
  const getLiveChatMessages = async (liveChatId: string, pageToken?: string) => {
    try {
      let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${YOUTUBE_API_KEY}&maxResults=2000`;
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
      return data;
    } catch (error) {
      console.error("Error getting live chat messages:", error);
      return { items: [], nextPageToken: null };
    }
  };

  // التحقق من رسائل الشات
  const checkYouTubeComments = async () => {
    if (!roomData || roomData.winners.length >= 3) return;

    setChecking(true);
    try {
      const liveChatId = await getLiveChatId(roomData.youtube_video_id);
      if (!liveChatId) {
        toast({
          title: "❌ البث غير نشط",
          description: "تأكد أن الرابط لبث مباشر نشط حالياً",
          variant: "destructive"
        });
        return;
      }

      let allMessages: any[] = [];
      let nextPageToken = undefined;
      
      // جلب كل الرسائل المتاحة
      do {
        const data = await getLiveChatMessages(liveChatId, nextPageToken);
        allMessages = [...allMessages, ...(data.items || [])];
        nextPageToken = data.nextPageToken;
        
        // للتجنب من طلبات كثيرة جداً
        if (allMessages.length > 500) break;
      } while (nextPageToken);

      if (allMessages.length === 0) {
        toast({
          title: "⚠️ لا توجد رسائل",
          description: "لم يتم العثور على أي رسائل جديدة في الشات",
        });
        return;
      }

      const newWinners = [...roomData.winners];
      let winnersAdded = 0;

      for (const msg of allMessages) {
        const author = msg.authorDetails.displayName;
        const text = msg.snippet.displayMessage;
        const publishedAt = new Date(msg.snippet.publishedAt);

        // تجاهل الرسائل الأقدم من آخر تحقق
        if (roomData.last_checked) {
          const lastCheckedDate = new Date(roomData.last_checked);
          if (publishedAt <= lastCheckedDate) continue;
        }

        // التحقق من صحة الإجابة
        const isCorrect = roomData.correct_answers.some(answer =>
          answer.trim() !== '' && text.toLowerCase().includes(answer.toLowerCase())
        );

        if (isCorrect && !newWinners.includes(author) && newWinners.length < 3) {
          newWinners.push(author);
          winnersAdded++;
          
          toast({
            title: "🎉 فائز جديد!",
            description: `${author} أجاب إجابة صحيحة!`
          });
        }

        if (newWinners.length >= 3) break;
      }

      if (winnersAdded > 0 || allMessages.length > 0) {
        await supabase
          .from('youtube_drawing_rooms')
          .update({
            winners: newWinners,
            last_checked: new Date().toISOString()
          })
          .eq('id', roomCode);
      }

    } catch (err: any) {
      console.error("Error fetching live chat:", err);
      toast({
        title: "❌ خطأ في جلب الشات",
        description: err.message || "تأكد أن البث شغال ومفتاح API صحيح",
        variant: "destructive"
      });
    } finally {
      setChecking(false);
    }
  };

  const shareRoom = async () => {
    const link = `${window.location.origin}/youtube-drawing?r=${roomCode}`;
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

  const shareDrawerLink = async () => {
    if (!roomCode) return;
    
    const drawerLink = `${window.location.origin}/youtube-drawing?r=${roomCode}&drawer=true`;
    try {
      await navigator.clipboard.writeText(drawerLink);
      toast({
        title: "✅ تم نسخ رابط الرسم!",
        description: "شارك هذا الرابط مع الشخص الذي تريد منه الرسم",
      });
    } catch (err) {
      toast({
        title: "❌ فشل في نسخ الرابط",
        description: "حاول نسخه يدوياً",
        variant: "destructive"
      });
    }
  };

  const setRandomWord = async () => {
    if (!roomCode) return;
    
    const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
    
    const { error } = await supabase
      .from('youtube_drawing_rooms')
      .update({ 
        current_word: randomWord,
        game_status: 'drawing',
        correct_answers: [randomWord]
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في تعيين الكلمة",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "✅ تم تعيين كلمة جديدة",
        description: `الكلمة: ${randomWord}`,
      });
    }
  };

  const setCustomWord = async () => {
    if (!roomCode) return;
    
    const word = prompt('أدخل الكلمة المطلوب رسمها:');
    if (!word) return;
    
    const { error } = await supabase
      .from('youtube_drawing_rooms')
      .update({ 
        current_word: word,
        game_status: 'drawing',
        correct_answers: [word]
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في تعيين الكلمة",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "✅ تم تعيين كلمة جديدة",
        description: `الكلمة: ${word}`,
      });
    }
  };

  const resetGame = async () => {
    if (!roomCode) return;
    
    const { error } = await supabase
      .from('youtube_drawing_rooms')
      .update({ 
        winners: [],
        game_status: 'waiting',
        last_checked: new Date().toISOString()
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في إعادة اللعبة",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "✅ تم إعادة اللعبة",
        description: "يمكنك بدء جولة جديدة",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* شريط التنقل */}
        <div className="flex justify-between items-center">
          <Button onClick={() => navigate('/')} variant="outline" size="sm">
            <ArrowLeft className="ml-2 h-4 w-4" />
            الرئيسية
          </Button>

          <div className="flex gap-2">
            <Button onClick={shareRoom} variant="outline" size="sm">
              <Copy className="ml-2 h-4 w-4" />
              مشاركة الرابط
            </Button>
            
            {isHost && (
              <Button onClick={shareDrawerLink} variant="outline" size="sm">
                <Brush className="ml-2 h-4 w-4" />
                رابط للرسم
              </Button>
            )}
          </div>
        </div>

        {/* معلومات الغرفة */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Youtube className="h-6 w-6 text-red-500" />
              لعبة الرسم والتخمين (بث مباشر)
            </CardTitle>
            <CardDescription>أول 3 يكتبون الإجابة الصحيحة في شات البث المباشر يفوزون!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video mb-4">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${roomData.youtube_video_id}?autoplay=1&rel=0`}
                title="YouTube live stream"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>

            <div className="text-center text-sm text-gray-600 mb-4">
              البث المباشر بواسطة: {roomData.host_name}
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-2">كيفية اللعب:</h3>
              <ol className="list-decimal list-inside text-yellow-700 space-y-1 text-sm">
                <li>اذهب إلى البث المباشر أعلاه</li>
                <li>شاهد الرسم الذي ينفذه المضيف أو الرسام المختار</li>
                <li>اكتب الإجابة الصحيحة في شات البث المباشر</li>
                <li>أول 3 أشخاص يكتبون الإجابة الصحيحة سيظهرون هنا كفائزين</li>
                {isDrawer && (
                  <li>أنت الرسام: اضغط على زر "كلمة عشوائية" لبدء الرسم</li>
                )}
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* إدارة المضيف والرسام */}
        {(isHost || isDrawer) && (
          <Card>
            <CardHeader>
              <CardTitle>إدارة اللعبة ({isHost ? 'المضيف' : 'الرسام'})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={setRandomWord} className="flex-1">
                  كلمة عشوائية
                </Button>
                <Button onClick={setCustomWord} variant="outline" className="flex-1">
                  كلمة مخصصة
                </Button>
              </div>
              
              {roomData.current_word && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="font-medium text-blue-800">الكلمة الحالية:</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xl">{showWord ? roomData.current_word : '••••••'}</p>
                    <Button 
                      onClick={() => setShowWord(!showWord)} 
                      variant="outline" 
                      size="sm"
                    >
                      {showWord ? <EyeOff className="ml-2 h-4 w-4" /> : <Eye className="ml-2 h-4 w-4" />}
                      {showWord ? 'إخفاء' : 'إظهار'}
                    </Button>
                  </div>
                </div>
              )}
              
              <Button
                onClick={checkYouTubeComments}
                disabled={checking}
                className="w-full"
              >
                <RefreshCw className={`ml-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'جاري التحقق من التعليقات...' : 'تحقق من التعليقات الجديدة'}
              </Button>
              
              <Button onClick={resetGame} variant="outline" className="w-full">
                إعادة اللعبة
              </Button>
              
              {roomData.last_checked && (
                <p className="text-sm text-gray-500 text-center">
                  آخر تحقق: {new Date(roomData.last_checked).toLocaleString('ar-SA')}
                </p>
              )}
            </CardContent>
          </Card>
        )}

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
                    <span className="text-sm text-gray-500">(من شات البث)</span>
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

export default YoutubeDrawingGame;
