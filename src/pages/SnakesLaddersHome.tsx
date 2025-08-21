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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">🐍🪜 السلم والثعبان</CardTitle>
          <CardDescription>
            العب مع أصدقائك (حتى 4 لاعبين)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="playerName">اسمك:</Label>
            <Input
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="أدخل اسمك هنا"
            />
          </div>
          <Button 
  onClick={() => navigate('/')} 
  variant="outline" 
  className="absolute top-4 left-4"
  size="sm"
>
  <HomeIcon className="ml-2 h-4 w-4" />
  الرئيسية
</Button>
          <div className="pt-4">
            <Button 
              onClick={createNewGame} 
              className="w-full text-lg py-6 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              disabled={loading}
            >
              🆕 إنشاء غرفة جديدة
            </Button>
          </div>
          
          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500">أو</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="roomCode">رمز الغرفة:</Label>
            <Input
              id="roomCode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="أدخل رمز الغرفة"
              onKeyPress={(e) => e.key === 'Enter' && joinGame()}
            />
          </div>
          
          <Button 
            onClick={joinGame} 
            className="w-full"
            disabled={loading}
            variant="outline"
          >
            انضم إلى غرفة موجودة
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SnakesLaddersHome;
