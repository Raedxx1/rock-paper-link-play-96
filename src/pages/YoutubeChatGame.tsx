import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ArrowLeft, Youtube, Crown, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface YoutubeChatRoom {
  id: string;
  youtube_url: string;
  youtube_video_id: string;
  correct_answers: string[];
  winners: string[];
  player1_name: string;
  game_status: 'waiting' | 'playing' | 'completed';
  last_checked: string;
}

const YoutubeChatGame = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get('r');
  const isHost = searchParams.get('host') === 'true';
  
  const [roomData, setRoomData] = useState<YoutubeChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  // استخدام مفتاح YouTube API الجديد
  const YOUTUBE_API_KEY = 'AIzaSyBIuk3jEwfWwGpV6G3mY8jx2Otwbptj00A';

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

  // دالة للتأخير
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const checkYouTubeComments = async () => {
    if (!roomData || roomData.winners.length >= 3) return;
    
    setChecking(true);
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${roomData.youtube_video_id}&key=${YOUTUBE_API_KEY}&maxResults=100`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `خطأ في API: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const newWinners = [...roomData.winners];
        let winnersAdded = 0;
        
        // التحقق من كل تعليق
        for (const item of data.items) {
          const comment = item.snippet.topLevelComment.snippet;
          const author = comment.authorDisplayName;
          const text = comment.textDisplay;
          
          // تخطي التعليقات القديمة إذا كانت آخر مرة تحقق فيها محددة
          if (roomData.last_checked) {
            const commentDate = new Date(comment.publishedAt);
            const lastCheckedDate = new Date(roomData.last_checked);
            if (commentDate <= lastCheckedDate) continue;
          }
          
          // التحقق إذا كانت الإجابة صحيحة
          const isCorrect = roomData.correct_answers.some(answer => 
            answer.trim() !== '' && text.toLowerCase().includes(answer.toLowerCase())
          );
          
          // إذا كانت الإجابة صحيحة ولم يكن اللاعب فائزاً بعد
          if (isCorrect && !newWinners.includes(author) && newWinners.length < 3) {
            newWinners.push(author);
            winnersAdded++;
            
            toast({
              title: "🎉 فائز جديد!",
              description: `${author} أجاب إجابة صحيحة!`
            });
          }
          
          // إذا وصلنا إلى 3 فائزين، نتوقف
          if (newWinners.length >= 3) break;
        }
        
        // تحديث قاعدة البيانات بالفائزين الجدد
        if (winnersAdded > 0) {
          const { error } = await supabase
            .from('youtube_chat_rooms')
            .update({ 
              winners: newWinners,
              last_checked: new Date().toISOString()
            })
            .eq('id', roomCode);
            
          if (error) {
            console.error('Error updating winners:', error);
            toast({
              title: "❌ خطأ في حفظ الفائزين",
              description: "حاول مرة أخرى",
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "⚠️ لا يوجد فائزون جدد",
            description: "لم يتم العثور على إجابات صحيحة جديدة",
          });
        }
      } else {
        toast({
          title: "⚠️ لا توجد تعليقات",
          description: "لم يتم العثور على أي تعليقات في هذا الفيديو",
        });
      }
    } catch (error) {
      console.error('Error checking YouTube comments:', error);
      
      if (error.message.includes('quota')) {
        toast({
          title: "❌ تجاوز الحد المسموح",
          description: "تم تجاوز عدد الطلبات المسموحة لليوم، حاول غداً",
          variant: "destructive"
        });
      } else if (error.message.includes('API key')) {
        toast({
          title: "❌ مفتاح API غير صالح",
          description: "يجب تحديث مفتاح YouTube API",
          variant: "destructive"
        });
      } else if (error.message.includes('disabled')) {
        toast({
          title: "❌ API غير مفعل",
          description: "يجب تفعيل YouTube Data API",
          variant: "destructive"
        });
      } else {
        toast({
          title: "❌ خطأ في جلب التعليقات",
          description: error.message || "تأكد من صحة رابط الفيديو",
          variant: "destructive"
        });
      }
    } finally {
      setChecking(false);
      // إضافة تأخير لتجنب تجاوز حصص API
      await delay(1000);
    }
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
            <CardDescription>أول 3 يكتبون الإجابة الصحيحة في تعليقات اليوتيوب يفوزون!</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-video mb-4">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${roomData.youtube_video_id}?autoplay=1&rel=0`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onError={(e) => {
                  console.error("Error loading YouTube video:", e);
                  toast({
                    title: "❌ خطأ في تحميل الفيديو",
                    description: "قد يكون الفيديو غير متاح في منطقتك",
                    variant: "destructive"
                  });
                }}
              ></iframe>
            </div>
            
            <div className="text-center text-sm text-gray-600 mb-4">
              البث المباشر hosted by: {roomData.player1_name}
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="font-semibold text-yellow-800 mb-2">كيفية اللعب:</h3>
              <ol className="list-decimal list-inside text-yellow-700 space-y-1 text-sm">
                <li>اذهب إلى فيديو اليوتيوب أعلاه</li>
                <li>اكتب الإجابة الصحيحة في قسم التعليقات</li>
                <li>أول 3 أشخاص يكتبون الإجابة الصحيحة سيظهرون هنا كفائزين</li>
                <li>الإجابات الصحيحة المقبولة: {roomData.correct_answers.join(' أو ')}</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* التحقق من التعليقات */}
        {isHost && (
          <Card>
            <CardHeader>
              <CardTitle>إدارة اللعبة (المضيف فقط)</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={checkYouTubeComments} 
                disabled={checking || roomData.winners.length >= 3}
                className="w-full"
              >
                <RefreshCw className={`ml-2 h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
                {checking ? 'جاري التحقق من التعليقات...' : 'تحقق من التعليقات الجديدة'}
              </Button>
              {roomData.last_checked && (
                <p className="text-sm text-gray-500 mt-2">
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
                    <span className="text-sm text-gray-500">(من يوتيوب)</span>
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

export default YoutubeChatGame;
