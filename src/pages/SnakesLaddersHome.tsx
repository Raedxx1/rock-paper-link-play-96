import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const SnakesLaddersHome = () => {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'SNK-';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createNewGame = async () => {
    if (!playerName.trim()) {
      toast({
        title: "❌ اسم اللاعب مطلوب",
        description: "يرجى إدخال اسمك",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const newRoomCode = generateRoomCode();
    
    try {
      const { error } = await supabase
        .from('snakes_ladders_rooms')
        .insert({
          id: newRoomCode,
          player1_name: playerName.trim(),
          player_positions: JSON.stringify([0, 0, 0, 0]),
          board_state: JSON.stringify(createInitialBoard()),
          current_player_index: 0,
          game_status: 'waiting',
          max_players: 4
        });

      if (error) {
        toast({
          title: "❌ خطأ في إنشاء الغرفة",
          description: "حاول مرة أخرى",
          variant: "destructive"
        });
        return;
      }

      navigate(`/snakes-ladders?r=${newRoomCode}&host=true`);
    } catch (error) {
      toast({
        title: "❌ خطأ في الاتصال",
        description: "تأكد من اتصالك بالإنترنت",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const joinGame = async () => {
    if (!playerName.trim() || !roomCode.trim()) {
      toast({
        title: "❌ بيانات ناقصة",
        description: "يرجى إدخال اسمك ورمز الغرفة",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      navigate(`/snakes-ladders?r=${roomCode.trim()}`);
    } catch (error) {
      toast({
        title: "❌ خطأ في الاتصال",
        description: "تأكد من اتصالك بالإنترنت",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createInitialBoard = () => {
    // إنشاء لوحة السلم والثعبان (100 خلية)
    const board = Array(100).fill(0);
    
    // إضافة السلالم
    const ladders = {
      4: 25, 13: 46, 33: 49, 42: 63, 50: 69, 62: 81, 74: 92
    };
    
    // إضافة الثعابين
    const snakes = {
      27: 5, 40: 3, 43: 18, 54: 31, 66: 45, 76: 58, 89: 53, 99: 41
    };
    
    // دمج السلالم والثعابين في اللوحة
    Object.entries(ladders).forEach(([start, end]) => {
      board[parseInt(start)] = end;
    });
    
    Object.entries(snakes).forEach(([start, end]) => {
      board[parseInt(start)] = -end;
    });
    
    return board;
  };

  const handleBackToMain = () => {
    navigate('/'); // الانتقال إلى الصفحة الرئيسية
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 relative" dir="rtl">
      {/* زر العودة إلى الرئيسية */}
      <Button 
        onClick={handleBackToMain}
        className="absolute top-6 right-6 bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-full shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2"
        style={{ boxShadow: '0 4px 12px rgba(249, 115, 22, 0.3)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        العودة للرئيسية
      </Button>

      <Card className="w-full max-w-md border-2 border-amber-200 shadow-xl">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-3">
            <div className="relative">
              <span className="text-4xl">🐍</span>
              <span className="text-4xl absolute -right-6 -top-2 transform rotate-45">🪜</span>
            </div>
          </div>
          <CardTitle className="text-3xl text-amber-700 font-bold">السلم والثعبان</CardTitle>
          <CardDescription className="text-lg mt-2 text-gray-600">
            العب مع أصدقائك (حتى 4 لاعبين)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="playerName" className="text-base font-medium">اسمك:</Label>
            <Input
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="أدخل اسمك هنا"
              className="py-3 text-lg"
              dir="rtl"
            />
          </div>
          
          <div className="pt-2">
            <Button 
              onClick={createNewGame} 
              className="w-full text-lg py-6 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold rounded-xl transition-all duration-300 hover:shadow-lg"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  جاري الإنشاء...
                </span>
              ) : (
                <span>🆕 إنشاء غرفة جديدة</span>
              )}
            </Button>
          </div>
          
          <div className="relative flex items-center py-3">
            <div className="flex-grow border-t border-amber-200"></div>
            <span className="flex-shrink mx-4 text-amber-600 font-medium">أو</span>
            <div className="flex-grow border-t border-amber-200"></div>
          </div>
          
          <div className="space-y-3">
            <Label htmlFor="roomCode" className="text-base font-medium">رمز الغرفة:</Label>
            <Input
              id="roomCode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="أدخل رمز الغرفة"
              onKeyPress={(e) => e.key === 'Enter' && joinGame()}
              className="py-3 text-lg text-center tracking-widest"
              dir="ltr"
            />
          </div>
          
          <Button 
            onClick={joinGame} 
            className="w-full py-6 text-lg font-bold rounded-xl border-2 border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-all duration-300"
            disabled={loading}
            variant="outline"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                جاري الانضمام...
              </span>
            ) : (
              <span>انضم إلى غرفة موجودة</span>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SnakesLaddersHome;
