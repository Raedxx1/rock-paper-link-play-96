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
        filter: `id=eq.${roomCode}` 
      }, (payload) => {
        console.log('Room update received:', payload);
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

        // جعل خلفية اللوحة بيضاء
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        // تحميل الرسم الموجود إذا كان هناك واحد
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
      const { error } = await supabase
        .from('youtube_drawing_rooms')
        .update({ drawing_data: dataUrl })
        .eq('id', roomCode);
      
      if (error) {
        console.error('Error saving drawing:', error);
      }
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

  const stopDrawing = () => {
    if (!context || !isPainting) return;

    if (tool === 'rectangle') {
      context.strokeStyle = color;
      context.strokeRect(startPos.x, startPos.y, context.canvas.width - startPos.x, context.canvas.height - startPos.y);
    } else if (tool === 'circle') {
      const radius = Math.sqrt(
        Math.pow(context.canvas.width - startPos.x, 2) + 
        Math.pow(context.canvas.height - startPos.y, 2)
      );
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

  const clearCanvas = () => {
    if (context && canvasRef.current) {
      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      saveDrawing();
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
      .is('current_drawer', null) // يتأكد إن مافيه رسام موجود
      .select();

    if (error || !data || data.length === 0) {
      toast({ title: "🚫 الرسام موجود بالفعل", description: "لا يمكن دخول رسام آخر", variant: "destructive" });
      return;
    }

    toast({ title: "✅ انضممت كرسام", description: "ابدأ بالرسم!" });
    fetchRoomData();
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
            <Button onClick={() => navigator.clipboard.writeText(window.location.href)} variant="outline" size="sm">
              <Copy className="ml-2 h-4 w-4" />
              مشاركة الرابط
            </Button>
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

        {/* لوحة الرسم للمتابع */}
        {isDrawerMode && (
          <Card>
            <CardHeader>
              <CardTitle>لوحة الرسم</CardTitle>
              <CardDescription>ارسم الكلمة المطلوبة هنا وسيظهر رسمك للمشاهدين</CardDescription>
            </CardHeader>
            <CardContent>
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
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
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
