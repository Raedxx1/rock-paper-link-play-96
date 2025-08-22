import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Copy,
  ArrowLeft,
  Youtube,
  Crown,
  RefreshCw,
  Eye,
  EyeOff,
  Brush,
  RotateCcw,
  Eraser,
  Type,
  Square,
  Circle,
} from 'lucide-react';
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
  current_drawer: string | null;
  current_drawer_name: string | null;
  current_drawer_session_id: string | null;
  game_status: 'waiting' | 'drawing' | 'guessing' | 'completed';
  last_checked: string | null;
  drawing_data: string | null;
}

const YoutubeDrawingGame = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get('r');
  const isHost = searchParams.get('host') === 'true';
  const isDrawerMode = searchParams.get('drawer') === 'true';

  const [roomData, setRoomData] = useState<YoutubeDrawingRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showWord, setShowWord] = useState(false);

  // الرسم
  const [isPainting, setIsPainting] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'brush' | 'eraser' | 'text' | 'rectangle' | 'circle'>('brush');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });

  const [playerName, setPlayerName] = useState('');
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // throttle للحفظ اللحظي
  const lastSaveRef = useRef<number>(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // مفتاح API مباشر (تأكد إنه صالح)
  const YOUTUBE_API_KEY = "AIzaSyAmghODZ2TZaDr3MPTBPmpKKMSOmO3EEyQ";

  // قائمة الكلمات العشوائية (قصّرتها؛ تقدر ترجع قائمتك الطويلة)
  const randomWords = [
    'تفاحة', 'قلم', 'كتاب', 'شمس', 'قمر', 'سيارة', 'منزل', 'شجرة',
    'زهرة', 'قطة', 'كلب', 'طائر', 'سمكة', 'نظارة', 'هاتف', 'كمبيوتر'
  ];

  // ألوان مسبقة
  const presetColors = ['#000000','#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF','#00FFFF','#FFFFFF','#FFA500','#800080'];

  // تحميل بيانات الغرفة
  const fetchRoomData = async () => {
    if (!roomCode) return;
    try {
      const { data, error } = await supabase
        .from('youtube_drawing_rooms')
        .select('*')
        .eq('id', roomCode)
        .single();

      if (error) {
        console.error('Error fetching room data:', error);
        toast({ title: "❌ الغرفة غير موجودة", description: "تأكد من صحة الرابط", variant: "destructive" });
        navigate('/');
        return;
      }

      setRoomData(data as YoutubeDrawingRoom);
    } catch (error) {
      console.error('Error in fetchRoomData:', error);
      toast({ title: "❌ خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    fetchRoomData();

    const subscription = supabase
      .channel('youtube_drawing_room_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'youtube_drawing_rooms',
        filter: `id=eq.${roomCode}`,
      }, (payload) => {
        // أي تحديث مباشر من القاعدة
        if (payload.eventType === 'UPDATE') {
          setRoomData(payload.new as YoutubeDrawingRoom);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomCode, navigate]);

  // تهيئة اللوحة مرة واحدة
  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    setContext(ctx);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;

    // خلفية بيضاء مبدئيًا
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // لو فيه رسم محفوظ
    if (roomData?.drawing_data) {
      loadDrawing(roomData.drawing_data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasRef]); // مره واحدة

  // تحديث خصائص القلم بدون مسح اللوحة
  useEffect(() => {
    if (!context) return;
    context.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
    context.lineWidth = brushSize;
  }, [context, color, brushSize, tool]);

  // إذا تحديث الرسم من القاعدة (للمشاهدين أو للمضيف)، ما نلمس لوحة الرسام
  useEffect(() => {
    if (!roomData?.drawing_data) return;
    // إذا مو في وضع الرسام، ما عندنا canvas (نستخدم <img>).
    // لو حاب تخلي الرسام يتزامن مع السيرفر (مو ضروري)، ممكن تشغل هذا:
    // if (!isDrawerMode && context && canvasRef.current) loadDrawing(roomData.drawing_data);
  }, [roomData?.drawing_data, isDrawerMode, context]);

  const loadDrawing = (dataUrl: string) => {
    if (!context || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      context.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      // خلفية بيضاء
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      context.drawImage(img, 0, 0);
    };
    img.src = dataUrl;
  };

  const saveDrawingNow = async () => {
    if (!canvasRef.current || !roomCode) return;
    try {
      const dataUrl = canvasRef.current.toDataURL();
      await supabase
        .from('youtube_drawing_rooms')
        .update({ drawing_data: dataUrl })
        .eq('id', roomCode);
    } catch (e) {
      console.error('Error saving drawing:', e);
    }
  };

  const saveDrawingThrottled = () => {
    const now = Date.now();
    const minInterval = 250; // حددنا 250ms للتخفيف على القاعدة

    if (now - lastSaveRef.current >= minInterval) {
      lastSaveRef.current = now;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      void saveDrawingNow();
    } else {
      if (!saveTimeoutRef.current) {
        const delay = minInterval - (now - lastSaveRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          lastSaveRef.current = Date.now();
          saveTimeoutRef.current = null;
          void saveDrawingNow();
        }, delay);
      }
    }
  };

  const saveDrawing = () => {
    // حفظ فوري (عند الانتهاء/مسح/نص)
    void saveDrawingNow();
  };

  // إحداثيات موحدة (ماوس/لمس)
  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    if ('nativeEvent' in e) {
      const me = (e as React.MouseEvent).nativeEvent as MouseEvent & { offsetX: number; offsetY: number; };
      // offsetX/Y ممتازة للماوس
      return { x: me.offsetX, y: me.offsetY };
    } else {
      const te = e as React.TouchEvent;
      const touch = te.touches[0] || te.changedTouches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
  };

  const preventTouchScroll = (e: React.TouchEvent) => {
    // لمنع تحريك الصفحة أثناء الرسم
    e.preventDefault();
  };

  // الرسم
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!context || !canvasRef.current) return;
    if ('preventDefault' in e) (e as any).preventDefault?.();

    const { x, y } = getCoords(e);

    if (tool === 'brush' || tool === 'eraser') {
      context.beginPath();
      context.moveTo(x, y);
      setIsPainting(true);
    } else if (tool === 'rectangle' || tool === 'circle') {
      setStartPos({ x, y });
      lastPosRef.current = { x, y };
      setIsPainting(true);
    } else if (tool === 'text') {
      setTextPosition({ x, y });
      setShowTextInput(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPainting || !context) return;
    if ('preventDefault' in e) (e as any).preventDefault?.();

    const { x, y } = getCoords(e);

    // تحديث خصائص القلم
    context.lineWidth = brushSize;
    context.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;

    if (tool === 'brush' || tool === 'eraser') {
      context.lineTo(x, y);
      context.stroke();
      saveDrawingThrottled(); // تحديث لحظي مع throttle
    } else if (tool === 'rectangle' || tool === 'circle') {
      // فقط نخزن آخر نقطة؛ الرسم الفعلي عند التوقف
      lastPosRef.current = { x, y };
    }
  };

  const stopDrawing = (e?: React.MouseEvent | React.TouchEvent) => {
    if (!context) return;

    if (isPainting && (tool === 'rectangle' || tool === 'circle')) {
      const end = e ? getCoords(e) : lastPosRef.current || startPos;
      const x = Math.min(startPos.x, end.x);
      const y = Math.min(startPos.y, end.y);
      const w = Math.abs(end.x - startPos.x);
      const h = Math.abs(end.y - startPos.y);

      context.beginPath();
      context.strokeStyle = color;
      context.lineWidth = brushSize;

      if (tool === 'rectangle') {
        context.strokeRect(x, y, w, h);
      } else if (tool === 'circle') {
        // دائرة تحيط بالمستطيل المرسوم
        const radius = Math.sqrt((w * w + h * h)) / 2;
        const cx = x + w / 2;
        const cy = y + h / 2;
        context.arc(cx, cy, radius, 0, Math.PI * 2);
        context.stroke();
      }
    }

    context.closePath();
    setIsPainting(false);
    saveDrawing(); // حفظ فوري بعد الانتهاء
  };

  const addText = () => {
    if (!context || !textInput) return;
    context.font = `${brushSize * 5}px Arial`;
    context.fillStyle = color;
    context.fillText(textInput, textPosition.x, textPosition.y);
    setShowTextInput(false);
    setTextInput('');
    saveDrawing();
  };

  const clearCanvas = () => {
    if (context && canvasRef.current) {
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      saveDrawing();
    }
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

  // التحقق من رسائل الشات (تلقائي + يدوي)
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
      let nextPageToken = undefined as string | undefined;

      // جلب كل الرسائل المتاحة (حد أعلى بسيط)
      do {
        const data = await getLiveChatMessages(liveChatId, nextPageToken);
        allMessages = [...allMessages, ...(data.items || [])];
        nextPageToken = data.nextPageToken;
        if (allMessages.length > 500) break;
      } while (nextPageToken);

      if (allMessages.length === 0) {
        // ما في توست مزعج كل مرة تلقائيًا؛ نخليها صامتة
        return;
      }

      const newWinners = [...roomData.winners];
      let winnersAdded = 0;

      for (const msg of allMessages) {
        const author = msg.authorDetails.displayName as string;
        const text = msg.snippet.displayMessage as string;
        const publishedAt = new Date(msg.snippet.publishedAt as string);

        if (roomData.last_checked) {
          const lastCheckedDate = new Date(roomData.last_checked);
          if (publishedAt <= lastCheckedDate) continue;
        }

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

  // تحقق تلقائي كل 3 ثواني: فقط للمضيف + عند وجود كلمة + إذا لسه ما كملنا 3 فائزين
  useEffect(() => {
    if (!isHost || !roomData) return;
    if (!roomData.current_word) return;
    if (roomData.winners.length >= 3) return;

    const interval = setInterval(() => {
      checkYouTubeComments();
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, roomData?.current_word, roomData?.winners?.length]);

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

  // انضمام كرسام
  const joinAsDrawer = async () => {
    if (!playerName.trim() || !roomCode) return;

    const { data, error } = await supabase
      .from('youtube_drawing_rooms')
      .update({
        current_drawer: playerName.trim(),
        current_drawer_name: playerName.trim(),
        current_drawer_session_id: sessionId,
      })
      .eq('id', roomCode)
      .is('current_drawer', null)
      .select();

    if (error || !data || data.length === 0) {
      toast({ title: "🚫 الرسام موجود بالفعل", description: "لا يمكن دخول رسام آخر", variant: "destructive" });
      return;
    }

    toast({ title: "✅ انضممت كرسام", description: "ابدأ بالرسم!" });
    fetchRoomData();
  };

  const setRandomWord = async () => {
    if (!roomCode) return;

    const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];

    const { error } = await supabase
      .from('youtube_drawing_rooms')
      .update({
        current_word: randomWord,
        game_status: 'drawing',
        correct_answers: [randomWord],
        winners: [],
        last_checked: new Date().toISOString()
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
        correct_answers: [word],
        winners: [],
        last_checked: new Date().toISOString()
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
        last_checked: new Date().toISOString(),
        drawing_data: null,
        current_drawer: null,
        current_drawer_name: null,
        current_drawer_session_id: null,
        current_word: '',
        correct_answers: []
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في إعادة اللعبة",
        description: error.message,
        variant: "destructive"
      });
    } else {
      // مسح اللوحة محلياً أيضاً
      if (context && canvasRef.current) {
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      toast({
        title: "✅ تم إعادة اللعبة",
        description: "يمكنك بدء جولة جديدة",
      });
    }
  };

  // شاشات الحالة
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

  // إذا رسام جديد يحاول يدخل وفيه رسام غيره
  if (isDrawerMode && roomData.current_drawer && roomData.current_drawer_session_id !== sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>🚫 رسام موجود بالفعل</CardTitle>
            <CardDescription>لا يمكنك دخول اللوحة الآن</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/youtube-drawing?r=${roomCode}`)}>العودة للمشاهدة</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // إذا هو رسام بس لسه ما سجل اسمه
  if (isDrawerMode && !roomData.current_drawer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>✏️ دخول كرسام</CardTitle>
            <CardDescription>أدخل اسمك للبدء في الرسم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="أدخل اسمك"
              className="text-center"
            />
            <Button className="w-full" disabled={!playerName.trim()} onClick={joinAsDrawer}>
              انضم كرسام
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate(`/youtube-drawing?r=${roomCode}`)}>
              العودة للمشاهدة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
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

            <div className="text-center text-sm text-gray-600 dark:text-gray-300 mb-4">
              البث المباشر بواسطة: {roomData.host_name}
            </div>

            {isDrawerMode && roomData.current_drawer_name && (
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg mb-4">
                <p className="font-medium text-green-800 dark:text-green-200">
                  👨‍🎨 أنت الرسام: <span className="font-bold">{roomData.current_drawer_name}</span>
                </p>
              </div>
            )}

            {isHost && roomData.current_drawer_name && (
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg mb-4">
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  👨‍🎨 الرسام الحالي: <span className="font-bold">{roomData.current_drawer_name}</span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* لوحة الرسم للرسام */}
        {isDrawerMode && (
          <Card>
            <CardHeader>
              <CardTitle>لوحة الرسم</CardTitle>
              <CardDescription>ارسم الكلمة المطلوبة هنا وسيظهر رسمك للمشاهدين</CardDescription>
            </CardHeader>
            <CardContent>
              {/* الكلمة للرسام فقط */}
              {roomData.current_word && (
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg mb-4 text-center">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    📝 الكلمة: <span className="font-bold">{roomData.current_word}</span>
                  </p>
                </div>
              )}

              {/* أدوات الرسم */}
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Button
                    variant={tool === 'brush' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTool('brush')}
                  >
                    <Brush size={16} />
                  </Button>
                  <Button
                    variant={tool === 'eraser' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTool('eraser')}
                  >
                    <Eraser size={16} />
                  </Button>
                  <Button
                    variant={tool === 'text' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTool('text')}
                  >
                    <Type size={16} />
                  </Button>
                  <Button
                    variant={tool === 'rectangle' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTool('rectangle')}
                  >
                    <Square size={16} />
                  </Button>
                  <Button
                    variant={tool === 'circle' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTool('circle')}
                  >
                    <Circle size={16} />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm dark:text-white">الحجم:</span>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm dark:text-white">{brushSize}</span>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-sm dark:text-white">اللون:</span>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 cursor-pointer"
                  />
                  <div className="flex gap-1">
                    {presetColors.map((presetColor, index) => (
                      <div
                        key={index}
                        className="w-6 h-6 rounded cursor-pointer border"
                        style={{ backgroundColor: presetColor }}
                        onClick={() => setColor(presetColor)}
                      />
                    ))}
                  </div>
                </div>

                <Button onClick={clearCanvas} variant="outline" size="sm">
                  <RotateCcw className="ml-2 h-4 w-4" />
                  مسح اللوحة
                </Button>
              </div>

              {/* إدخال النص */}
              {showTextInput && (
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="اكتب النص هنا..."
                    className="px-3 py-2 border rounded-lg mr-2"
                  />
                  <Button onClick={addText} size="sm" className="mr-2">
                    إضافة
                  </Button>
                  <Button onClick={() => setShowTextInput(false)} variant="outline" size="sm">
                    إلغاء
                  </Button>
                </div>
              )}

              {/* لوحة الرسم */}
              <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={(e) => stopDrawing(e)}
                  onMouseLeave={() => stopDrawing()}
                  onTouchStart={(e) => { preventTouchScroll(e); startDrawing(e); }}
                  onTouchMove={(e) => { preventTouchScroll(e); draw(e); }}
                  onTouchEnd={(e) => { preventTouchScroll(e); stopDrawing(e); }}
                  className="w-full h-auto cursor-crosshair touch-none bg-white"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* عرض الرسم للمشاهدين والمضيف */}
        {!isDrawerMode && roomData.drawing_data && (
          <Card>
            <CardHeader>
              <CardTitle>الرسم الحالي</CardTitle>
              <CardDescription>شاهد ما يرسمه الرسام حالياً</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden">
                <img
                  src={roomData.drawing_data}
                  alt="الرسم الحالي"
                  className="w-full h-auto"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* إدارة المضيف */}
        {isHost && (
          <Card>
            <CardHeader>
              <CardTitle>إدارة اللعبة (المضيف فقط)</CardTitle>
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
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                  <p className="font-medium text-blue-800 dark:text-blue-200">الكلمة الحالية:</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xl dark:text-white">{showWord ? roomData.current_word : '••••••'}</p>
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
                {checking ? 'جاري التحقق من التعليقات...' : 'تحقق من التعليقات الآن'}
              </Button>

              <Button onClick={resetGame} variant="outline" className="w-full">
                إعادة اللعبة
              </Button>

              {roomData.last_checked && (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
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
              <p className="text-center text-gray-500 dark:text-gray-400">لا يوجد فائزون حتى الآن</p>
            ) : (
              <div className="space-y-2">
                {roomData.winners.map((winner, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-lg">
                    <div className="w-8 h-8 flex items-center justify-center bg-yellow-500 text-white rounded-full">
                      {index + 1}
                    </div>
                    <span className="font-medium dark:text-white">{winner}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">(من شات البث)</span>
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
