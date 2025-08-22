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

  // ألوان مسبقة
  const presetColors = ['#000000','#FF0000','#00FF00','#0000FF','#FFFF00','#FF00FF','#00FFFF','#FFFFFF','#FFA500','#800080'];

  // تحميل بيانات الغرفة
  const fetchRoomData = async () => {
    if (!roomCode) return;

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
    setLoading(false);
  };

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }
    fetchRoomData();

    const subscription = supabase
      .channel('youtube_drawing_room_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'youtube_drawing_rooms', filter: `id=eq.${roomCode}` }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setRoomData(payload.new as YoutubeDrawingRoom);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomCode, navigate]);

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
      await supabase.from('youtube_drawing_rooms').update({ drawing_data: dataUrl }).eq('id', roomCode);
    }
  };

  // الرسم
  const startDrawing = (e: React.MouseEvent) => {
    if (!context) return;
    const { offsetX, offsetY } = e.nativeEvent;

    if (tool === 'brush' || tool === 'eraser') {
      context.beginPath();
      context.moveTo(offsetX, offsetY);
      setIsPainting(true);
    } else if (tool === 'rectangle' || tool === 'circle') {
      setStartPos({ x: offsetX, y: offsetY });
      setIsPainting(true);
    } else if (tool === 'text') {
      setTextPosition({ x: offsetX, y: offsetY });
      setShowTextInput(true);
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!isPainting || !context) return;
    const { offsetX, offsetY } = e.nativeEvent;

    if (tool === 'brush') {
      context.strokeStyle = color;
      context.lineTo(offsetX, offsetY);
      context.stroke();
    } else if (tool === 'eraser') {
      context.strokeStyle = '#FFFFFF';
      context.lineTo(offsetX, offsetY);
      context.stroke();
    }
  };

  const stopDrawing = (e?: React.MouseEvent) => {
    if (!context || !isPainting) return;
    const { offsetX, offsetY } = e?.nativeEvent || { offsetX: startPos.x, offsetY: startPos.y };

    if (tool === 'rectangle') {
      const width = offsetX - startPos.x;
      const height = offsetY - startPos.y;
      context.strokeStyle = color;
      context.strokeRect(startPos.x, startPos.y, width, height);
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(offsetX - startPos.x, 2) + Math.pow(offsetY - startPos.y, 2));
      context.beginPath();
      context.strokeStyle = color;
      context.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      context.stroke();
    }
    context.closePath();
    setIsPainting(false);
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
      .is('current_drawer', null) // يتأكد إن مافيه رسام موجود
      .select();

    if (error || !data || data.length === 0) {
      toast({ title: "🚫 الرسام موجود بالفعل", description: "لا يمكن دخول رسام آخر", variant: "destructive" });
      return;
    }

    toast({ title: "✅ انضممت كرسام", description: "ابدأ بالرسم!" });
    fetchRoomData();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">⏳ جاري التحميل...</div>;

  // إذا رسام جديد يحاول يدخل وفيه رسام غيره
  if (isDrawerMode && roomData?.current_drawer && roomData.current_drawer_session_id !== sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardHeader>
            <CardTitle>🚫 رسام موجود بالفعل</CardTitle>
            <CardDescription>لا يمكنك دخول اللوحة الآن</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')}>العودة للرئيسية</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // إذا هو رسام بس لسه ما سجل اسمه
  if (isDrawerMode && !roomData?.current_drawer) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>✏️ دخول كرسام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="أدخل اسمك" />
            <Button className="w-full" disabled={!playerName.trim()} onClick={joinAsDrawer}>انضم</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* باقي الكود نفس السابق لكن مع إظهار اسم الرسام للهوست */}
      {isHost && roomData?.current_drawer_name && (
        <div className="p-3 bg-blue-100 rounded mb-4">
          👨‍🎨 الرسام الحالي: <b>{roomData.current_drawer_name}</b>
        </div>
      )}

      {isDrawerMode && (
        <div>
          {/* أدوات الرسم */}
          <div className="mb-2 flex gap-2">
            <Button onClick={() => setTool('brush')}>🖌</Button>
            <Button onClick={() => setTool('eraser')}>🩹</Button>
            <Button onClick={() => setTool('rectangle')}>▭</Button>
            <Button onClick={() => setTool('circle')}>⚪</Button>
            <Button onClick={() => setTool('text')}>T</Button>
          </div>
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="border bg-white"
          />
          {showTextInput && (
            <div className="mt-2 flex gap-2">
              <Input value={textInput} onChange={(e) => setTextInput(e.target.value)} />
              <Button onClick={addText}>إضافة</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default YoutubeDrawingGame;
