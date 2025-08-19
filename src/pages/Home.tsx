import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// توليد رمز غرفة فريد
const generateRoomCode = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "ttt-";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [joinRoomCode, setJoinRoomCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

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
          player2_session_id: null, // ✅ جديد
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
      navigator.clipboard.writeText(roomLink);

      toast({
        title: "✅ تم نسخ رابط الغرفة",
        description: "شارك الرابط مع صديقك للانضمام",
      });

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

  // الانضمام إلى غرفة موجودة
  const joinGame = async () => {
    if (!joinRoomCode.trim()) {
      toast({
        title: "❌ رمز الغرفة مطلوب",
        variant: 'destructive',
      });
      return;
    }

    setJoinLoading(true);

    try {
      const { data, error } = await supabase
        .from('tic_tac_toe_rooms')
        .select('id, game_status')
        .eq('id', joinRoomCode.trim())
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

      navigate(`/tic-tac-toe?r=${joinRoomCode.trim()}&host=false`);
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl text-primary">لعبة XO</CardTitle>
          <CardDescription>لعبة الذكاء والتحدي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Button 
              onClick={createNewGame} 
              disabled={loading}
              className="w-full py-6 text-lg"
              size="lg"
            >
              {loading ? 'جارٍ إنشاء الغرفة...' : 'إنشاء غرفة جديدة'}
            </Button>
            
            <div className="relative flex items-center my-4">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-gray-500">أو</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>
            
            <div className="space-y-2">
              <Input
                placeholder="أدخل رمز الغرفة"
                value={joinRoomCode}
                onChange={(e) => setJoinRoomCode(e.target.value)}
                className="text-center py-3 text-lg"
                dir="ltr"
              />
              <Button 
                onClick={joinGame} 
                disabled={joinLoading || !joinRoomCode.trim()}
                variant="outline"
                className="w-full py-5"
              >
                {joinLoading ? 'جارٍ الانضمام...' : 'الانضمام إلى غرفة'}
              </Button>
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            <p>شارك الرابط مع صديقك للعب معًا</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Home;
