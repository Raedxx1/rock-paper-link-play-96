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

  // قائمة الكلمات
  const randomWords = [
    'تفاحة','قلم','كتاب','شمس','قمر','سيارة','منزل','شجرة',
    'زهرة','قطة','كلب','طائر','سمكة','نظارة','هاتف','كمبيوتر',
    'بحر','جبل','نهر','وردة','فراشة','نجمة','سحابة','طائرة',
    'ساعة','باب','نافذة','سرير','كرسي','طاولة','زجاجة','كوب',
    'قبعة','حذاء','جورب','قميص','سروال','فستان','عصا','كرة',
    'سيف','درع','تاج','مفتاح','قفل','سلة','ورق','مقص',
    'غيمة','قوس قزح','ثعبان','أسد','فيل','زرافة','قرد','بطريق'
  ];

  // ألوان
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
        if (payload.eventType === 'UPDATE') {
          setRoomData(payload.new as YoutubeDrawingRoom);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [roomCode, navigate]);

  // تشييك تلقائي للتعليقات
  useEffect(() => {
    if (isHost) {
      const interval = setInterval(() => {
        checkYouTubeComments();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isHost, roomData]);

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

  const getTouchPos = (e: React.TouchEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const touch = e.touches[0];
    return { offsetX: touch.clientX - rect.left, offsetY: touch.clientY - rect.top };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!context) return;
    let pos;
    if ('nativeEvent' in e) {
      const { offsetX, offsetY } = (e as React.MouseEvent).nativeEvent;
      pos = { offsetX, offsetY };
    } else { pos = getTouchPos(e as React.TouchEvent); }
    if (tool === 'brush' || tool === 'eraser') {
      context.beginPath(); context.moveTo(pos.offsetX, pos.offsetY); setIsPainting(true);
    } else if (tool === 'rectangle' || tool === 'circle') {
      setStartPos({ x: pos.offsetX, y: pos.offsetY }); setIsPainting(true);
    } else if (tool === 'text') {
      setTextPosition({ x: pos.offsetX, y: pos.offsetY }); setShowTextInput(true);
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isPainting || !context || !canvasRef.current) return;
    let pos;
    if ('nativeEvent' in e) {
      const { offsetX, offsetY } = (e as React.MouseEvent).nativeEvent;
      pos = { offsetX, offsetY };
    } else { pos = getTouchPos(e as React.TouchEvent); }
    if (tool === 'brush') {
      context.strokeStyle = color; context.lineTo(pos.offsetX, pos.offsetY); context.stroke();
    } else if (tool === 'eraser') {
      context.strokeStyle = '#FFFFFF'; context.lineTo(pos.offsetX, pos.offsetY); context.stroke();
    }
    saveDrawing();
  };

  const stopDrawing = () => {
    if (!context || !isPainting) return;
    if (tool === 'rectangle') {
      context.strokeStyle = color; context.strokeRect(startPos.x, startPos.y, context.canvas.width - startPos.x, context.canvas.height - startPos.y);
    } else if (tool === 'circle') {
      const radius = Math.sqrt(Math.pow(context.canvas.width - startPos.x, 2) + Math.pow(context.canvas.height - startPos.y, 2));
      context.beginPath(); context.strokeStyle = color; context.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI); context.stroke();
    }
    context.closePath(); setIsPainting(false); saveDrawing();
  };

  const addText = () => {
    if (!context || !textInput) return;
    context.font = `${brushSize * 5}px Arial`;
    context.fillStyle = color;
    context.fillText(textInput, textPosition.x, textPosition.y);
    setShowTextInput(false); setTextInput('');
    saveDrawing();
  };

  const clearCanvas = () => {
    if (context && canvasRef.current) {
      context.fillStyle = '#FFFFFF'; context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      saveDrawing();
    }
  };

  // تعليقات اليوتيوب
  const checkYouTubeComments = async () => {
    if (!roomData?.youtube_video_id || !roomData?.current_word) return;
    setChecking(true);
    try {
      const res = await fetch(`https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${roomData.youtube_video_id}&key=${YOUTUBE_API_KEY}&maxResults=20`);
      const data = await res.json();
      if (data.items) {
        const newCorrectAnswers: string[] = [];
        const newWinners: string[] = [...roomData.winners];
        for (const item of data.items) {
          const comment = item.snippet.topLevelComment.snippet.textDisplay;
          const author = item.snippet.topLevelComment.snippet.authorDisplayName;
          if (comment.trim().toLowerCase() === roomData.current_word.trim().toLowerCase()) {
            if (!roomData.correct_answers.includes(author)) {
              newCorrectAnswers.push(author);
              if (!newWinners.includes(author)) { newWinners.push(author); }
            }
          }
        }
        if (newCorrectAnswers.length > 0) {
          await supabase.from('youtube_drawing_rooms').update({ correct_answers: [...roomData.correct_answers, ...newCorrectAnswers], winners: newWinners }).eq('id', roomCode);
          toast({ title: "🎉 فائز جديد!", description: newCorrectAnswers.join(', ') });
        }
      }
    } catch (error) {
      console.error('Error checking comments:', error);
    } finally { setChecking(false); }
  };

  const shareRoom = async () => {
    const url = `${window.location.origin}/youtube-drawing?r=${roomCode}`;
    await navigator.clipboard.writeText(url);
    toast({ title: "✅ تم نسخ الرابط" });
  };

  const joinAsDrawer = async () => {
    if (!playerName) {
      toast({ title: "⚠️ اكتب اسمك أولا", variant: "destructive" });
      return;
    }
    await supabase.from('youtube_drawing_rooms').update({ current_drawer: playerName, current_drawer_name: playerName, current_drawer_session_id: sessionId }).eq('id', roomCode);
    navigate(`/youtube-drawing?r=${roomCode}&drawer=true`);
  };

  const setRandomWord = async () => {
    const randomWord = randomWords[Math.floor(Math.random() * randomWords.length)];
    await supabase.from('youtube_drawing_rooms').update({ current_word: randomWord, correct_answers: [] }).eq('id', roomCode);
    toast({ title: "📌 تم اختيار كلمة عشوائية" });
  };

  const resetGame = async () => {
    await supabase.from('youtube_drawing_rooms').update({ current_word: '', correct_answers: [], winners: [], drawing_data: '' }).eq('id', roomCode);
    if (context && canvasRef.current) {
      context.fillStyle = '#FFFFFF'; context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    toast({ title: "🔄 تم إعادة ضبط اللعبة" });
  };

  if (loading) return <div className="flex items-center justify-center h-screen">جاري التحميل...</div>;

  return (
    <div className="container mx-auto p-4">
      <Button variant="ghost" onClick={() => navigate('/')} className="mb-4"><ArrowLeft className="w-4 h-4 mr-2" />رجوع</Button>
      <Card>
        <CardHeader>
          <CardTitle>لعبة الرسم المباشر 🎨</CardTitle>
          <CardDescription>كود الغرفة: {roomCode}</CardDescription>
        </CardHeader>
        <CardContent>
          {roomData?.youtube_url && (
            <div className="mb-4">
              <a href={roomData.youtube_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-blue-500">
                <Youtube className="w-5 h-5 mr-2" />رابط البث المباشر
              </a>
            </div>
          )}
          {isHost && (
            <div className="flex flex-wrap gap-2 mb-4">
              <Button onClick={shareRoom}><Copy className="w-4 h-4 mr-2" />نسخ الرابط</Button>
              <Button onClick={checkYouTubeComments} disabled={checking}><RefreshCw className={`w-4 h-4 mr-2 ${checking ? 'animate-spin' : ''}`} />تشييك التعليقات</Button>
              <Button onClick={setRandomWord}>📌 اختيار كلمة عشوائية</Button>
              <Button onClick={resetGame} variant="destructive"><RotateCcw className="w-4 h-4 mr-2" />إعادة اللعبة</Button>
            </div>
          )}
          {!isDrawerMode && (
            <div className="mb-4">
              <Input placeholder="اكتب اسمك للانضمام كرسام..." value={playerName} onChange={(e) => setPlayerName(e.target.value)} className="mb-2" />
              <Button onClick={joinAsDrawer}>🎨 انضم كرسام</Button>
            </div>
          )}
          {isDrawerMode && (
            <div>
              {roomData?.current_word && (
                <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <p className="font-bold text-lg text-center">الكلمة: {roomData.current_word}</p>
                </div>
              )}
              <div className="flex gap-2 mb-4">
                <Button variant={tool === 'brush' ? 'default' : 'outline'} onClick={() => setTool('brush')}><Brush className="w-4 h-4" /></Button>
                <Button variant={tool === 'eraser' ? 'default' : 'outline'} onClick={() => setTool('eraser')}><Eraser className="w-4 h-4" /></Button>
                <Button variant={tool === 'text' ? 'default' : 'outline'} onClick={() => setTool('text')}><Type className="w-4 h-4" /></Button>
                <Button variant={tool === 'rectangle' ? 'default' : 'outline'} onClick={() => setTool('rectangle')}><Square className="w-4 h-4" /></Button>
                <Button variant={tool === 'circle' ? 'default' : 'outline'} onClick={() => setTool('circle')}><Circle className="w-4 h-4" /></Button>
                <Button onClick={clearCanvas} variant="destructive"><RotateCcw className="w-4 h-4" /></Button>
              </div>
              <div className="flex gap-2 mb-4">
                {presetColors.map(c => (
                  <button key={c} style={{ backgroundColor: c }} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-black' : 'border-gray-300'}`} />
                ))}
              </div>
              <input type="range" min="1" max="50" value={brushSize} onChange={(e) => setBrushSize(Number(e.target.value))} className="w-full mb-4" />
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
              {showTextInput && (
                <div className="mt-2 flex gap-2">
                  <Input placeholder="اكتب النص..." value={textInput} onChange={(e) => setTextInput(e.target.value)} />
                  <Button onClick={addText}>إضافة</Button>
                </div>
              )}
            </div>
          )}
          {roomData?.winners?.length > 0 && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <p className="font-bold">🎉 الفائزون:</p>
              <ul className="list-disc list-inside">
                {roomData.winners.map((winner, i) => <li key={i}>{winner}</li>)}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default YoutubeDrawingGame;
