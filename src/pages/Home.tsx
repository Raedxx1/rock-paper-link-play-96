import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Copy, Users, Sparkles } from 'lucide-react';

// توليد رمز غرفة فريد (أسهل للمشاركة)
const generateRoomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // إزالة الأحرف التي قد تسبب لبسًا
  let result = "";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `XO-${result}`;
};

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // إنشاء غرفة جديدة
  const createNewGame = async () => {
    const roomCode = generateRoomCode();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('tic_tac_toe_rooms')
        .insert({
          id: roomCode,
          board: JSON.stringify(Array(9).fill('')),
          winner: null,
          game_status: 'waiting',
          player1_name: "مضيف XO",
          player1_score: 0,
          player2_score: 0,
          current_round: 1,
          round_winner: null,
          player2_name: null,
          player2_session_id: null,
        })
        .select();

      if (error) {
        toast({
          title: "❌ خطأ في إنشاء الغرفة",
          description: `تفاصيل الخطأ: ${error.message}`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // نسخ الرابط إلى الحافظة
      const roomLink = `${window.location.origin}/tic-tac-toe?r=${roomCode}&host=true`;
      try {
        await navigator.clipboard.writeText(roomLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        
        toast({
          title: "✅ تم نسخ رابط الغرفة",
          description: "شارك الرابط مع صديقك للانضمام",
        });
      } catch (copyError) {
        toast({
          title: "⚠️ تم إنشاء الغرفة",
          description: `انسخ الرابط يدوياً: ${roomLink}`,
        });
      }

      navigate(`/tic-tac-toe?r=${roomCode}&host=true`);
    } catch (error) {
      toast({
        title: "❌ فشل في الاتصال",
        description: 'تأكد من اتصالك بالإنترنت',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  // التحقق من صحة رمز الغرفة
  const isValidRoomCode = (code: string) => {
    return code.length >= 3 && /^[A-Za-z0-9-]+$/.test(code);
  };

  // الانضمام إلى غرفة موجودة
  const joinGame = async () => {
    const trimmedCode = joinRoomCode.trim();
    
    if (!trimmedCode) {
      toast({
        title: "❌ رمز الغرفة مطلوب",
        variant: 'destructive',
      });
      return;
    }

    if (!isValidRoomCode(trimmedCode)) {
      toast({
        title: "❌ رمز غير صالح",
        description: "تأكد من صحة تنسيق رمز الغرفة",
        variant: 'destructive',
      });
      return;
    }

    setJoinLoading(true);

    try {
      const { data, error } = await supabase
        .from('tic_tac_toe_rooms')
        .select('id, game_status, player2_name')
        .eq('id', trimmedCode)
        .single();

      if (error || !data) {
        toast({
          title: "❌ الغرفة غير موجودة",
          description: "تأكد من صحة رمز الغرفة",
          variant: 'destructive',
        });
        setJoinLoading(false);
        return;
      }

      if (data.game_status === 'game_complete') {
        toast({
          title: "❌ اللعبة انتهت",
          description: "هذه الغرفة مغلقة، أنشئ غرفة جديدة",
          variant: 'destructive',
        });
        setJoinLoading(false);
        return;
      }

      if (data.player2_name) {
        toast({
          title: "❌ الغرفة ممتلئة",
          description: "هذه الغرفة تحتوي على لاعبين بالفعل",
          variant: 'destructive',
        });
        setJoinLoading(false);
        return;
      }

      navigate(`/tic-tac-toe?r=${trimmedCode}&host=false`);
    } catch (error) {
      toast({
        title: "❌ فشل في الانضمام",
        description: 'تأكد من اتصالك بالإنترنت',
        variant: 'destructive',
      });
      setJoinLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-gradient-to-r from-blue-500 to-green-500 p-4 rounded-full">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl text-primary flex items-center justify-center gap-2">
            <span className="text-blue-600">X</span>
            <span className="text-gray-500">-</span>
            <span className="text-green-600">O</span>
          </CardTitle>
          <CardDescription className="text-lg">لعبة الذكاء والتحدي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Button 
              onClick={createNewGame} 
              disabled={loading}
              className="w-full py-6 text-lg font-bold relative"
              size="lg"
            >
              {loading ? (
                <>
                  <span className="animate-pulse">⚪</span>
                  <span className="ml-2">جارٍ إنشاء الغرفة...</span>
                </>
              ) : (
                <>
                  <Users className="ml-2 h-5 w-5" />
                  إنشاء غرفة جديدة
                  {copied && <span className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-ping"></span>}
                </>
              )}
            </Button>
            
            <div className="relative flex items-center my-4">
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
              <span className="flex-shrink mx-4 text-gray-500 dark:text-gray-400">أو</span>
              <div className="flex-grow border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            
            <div className="space-y-3">
              <div className="relative">
                <Input
                  placeholder="أدخل رمز الغرفة (مثل: XO-ABCD)"
                  value={joinRoomCode}
                  onChange={(e) => setJoinRoomCode(e.target.value.toUpperCase())}
                  className="text-center py-3 text-lg"
                  dir="ltr"
                  onKeyPress={(e) => e.key === 'Enter' && joinGame()}
                />
                {joinRoomCode && (
                  <button 
                    onClick={() => setJoinRoomCode('')}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              <Button 
                onClick={joinGame} 
                disabled={joinLoading || !joinRoomCode.trim()}
                variant="outline"
                className="w-full py-5 gap-2"
              >
                {joinLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    جارٍ الانضمام...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    الانضمام إلى غرفة
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p>1. أنشئ غرفة جديدة وشارك الرابط مع صديقك</p>
            <p>2. أو انضم بكتابة رمز الغرفة</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
