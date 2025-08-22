import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, ArrowLeft, Youtube, Crown, RefreshCw, Eye, EyeOff, Brush, RotateCcw, Eraser, Type, Square, Circle } from 'lucide-react';
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
  last_checked: string;
  drawing_data: string;
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

  // مفتاح API مباشر
  const YOUTUBE_API_KEY = "AIzaSyAmghODZ2TZaDr3MPTBPmpKKMSOmO3EEyQ";

  // قائمة الكلمات العشوائية
  const randomWords = ['تفاحة', 'قلم', 'كتاب', 'شمس', 'قمر', 'سيارة', 'منزل', 'شجرة'];

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
        toast({ title: "❌ الغرفة غير موجودة", description: "تأكد من صحة الرابط", variant: "destructive" });
        navigate('/');
        return;
      }
      setRoomData(data as YoutubeDrawingRoom);
    } catch (error) {
      toast({ title: "❌ خطأ في تحميل البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // متابعة تحديثات الغرفة
  useEffect(() => {
    if (!roomCode) return;
    fetchRoomData();
    const subscription = supabase
      .channel('youtube_drawing_room_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'youtube_drawing_rooms', 
        filter: `id=eq.${roomCode}` 
      }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setRoomData(payload.new as YoutubeDrawingRoom);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomCode, navigate]);

  // ضبط اللوحة
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        setContext(ctx);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (roomData?.drawing_data) {
          loadDrawing(roomData.drawing_data);
        }
      }
    }
  }, [color, brushSize, roomData]);

  const loadDrawing = (dataUrl: string) => {
    if (context && canvasRef.current) {
      const img = new Image();
      img.onload = () => {
        context.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        context.drawImage(img, 0, 0);
      };
      img.src = dataUrl;
    }
  };

  const saveDrawing = async () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      await supabase.from('youtube_drawing_rooms')
        .update({ drawing_data: dataUrl })
        .eq('id', roomCode);
    }
  };

  // 🖊️ دعم الماوس + التتش
  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    if ('nativeEvent' in e) {
      const { offsetX, offsetY } = (e as React.MouseEvent).nativeEvent;
      return { x: offsetX, y: offsetY };
    } else {
      const touch = (e as React.TouchEvent).touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      return { 
        x: touch.clientX - (rect?.left || 0), 
        y: touch.clientY - (rect?.top || 0) 
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!context) return;
    const { x, y } = getCoords(e);

    if (tool === 'brush' || tool === 'eraser') {
      context.beginPath();
      context.moveTo(x, y);
      setIsPainting(true);
    } else if (tool === 'rectangle' || tool === 'circle') {
      setStartPos({ x, y });
      setIsPainting(true);
    } else if (tool === 'text') {
      setTextPosition({ x, y });
      setShowTextInput(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPainting || !context) return;
    const { x, y } = getCoords(e);

    if (tool === 'brush') {
      context.strokeStyle = color;
      context.lineTo(x, y);
      context.stroke();
    } else if (tool === 'eraser') {
      context.strokeStyle = '#FFFFFF';
      context.lineTo(x, y);
      context.stroke();
    }

    // تحديث مباشر
    saveDrawing();
  };

  const stopDrawing = () => {
    if (!context) return;
    setIsPainting(false);
    context.closePath();
    saveDrawing();
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

  // ✅ تحقق تلقائي من الشات للمضيف
  useEffect(() => {
    if (!isHost || !roomData) return;
    const interval = setInterval(() => {
      checkYouTubeComments();
    }, 3000);
    return () => clearInterval(interval);
  }, [isHost, roomData]);

  // 🔥 باقي الكود تبع التحقق والشير والفائزين نفسه بدون تغيير...
  // (ما غيرته لأنه سليم)

  // (باقي الكود هنا هو نفسه عندك، بس عدلت الجزئيات اللي فوق)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* 🎨 لوحة الرسم للرسام */}
        {isDrawerMode && (
          <Card>
            <CardHeader>
              <CardTitle>لوحة الرسم</CardTitle>
              <CardDescription>ارسم الكلمة المطلوبة</CardDescription>
            </CardHeader>
            <CardContent>

              {/* 👀 عرض الكلمة للرسام */}
              {roomData?.current_word && (
                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg mb-4 text-center">
                  📝 الكلمة: <span className="font-bold">{roomData.current_word}</span>
                </div>
              )}

              {/* أدوات + لوحة */}
              <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={480}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-auto cursor-crosshair touch-none bg-white"
                />
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
};

export default YoutubeDrawingGame;
