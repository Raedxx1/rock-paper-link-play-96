import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, ArrowLeft, RotateCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import GameChoice from '@/components/GameChoice';
import GameResult from '@/components/GameResult';

type Choice = 'rock' | 'paper' | 'scissors' | null;

interface GameRoom {
  id: string;
  player1_name: string;
  player2_name: string | null;
  player1_choice: Choice;
  player2_choice: Choice;
  player1_score: number;
  player2_score: number;
  current_round: number;
  game_status: 'waiting' | 'playing' | 'round_complete' | 'game_complete';
  winner: 'player1' | 'player2' | 'tie' | null;
  round_winner: 'player1' | 'player2' | 'tie' | null;
}

const GameRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get('r');
  const isHost = searchParams.get('host') === 'true';
  
  const [roomData, setRoomData] = useState<GameRoom | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [isPlayer2, setIsPlayer2] = useState(false);
  const [loading, setLoading] = useState(true);

  // جلب بيانات الغرفة
  const fetchRoomData = async () => {
    if (!roomCode) return;

    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        toast({
          title: "❌ الغرفة غير موجودة",
          description: "تأكد من صحة الرابط",
          variant: "destructive"
        });
        navigate('/');
      }
      return;
    }

    setRoomData(data as GameRoom);
    setLoading(false);

    // تحديد دور اللاعب
    if (!isHost && !data.player2_name) {
      setIsPlayer2(true);
    }
  };

  // إعداد الاشتراك في التحديثات الفورية
  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    fetchRoomData();

    // الاشتراك في التحديثات الفورية
    const subscription = supabase
      .channel('game_room_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomCode}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setRoomData(payload.new as GameRoom);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomCode, navigate, isHost]);

  // انضمام اللاعب الثاني
  const joinAsPlayer2 = async () => {
    if (!playerName.trim() || !roomCode) return;

    const { error } = await supabase
      .from('game_rooms')
      .update({
        player2_name: playerName.trim(),
        game_status: 'playing'
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في الانضمام",
        description: "حاول مرة أخرى",
        variant: "destructive"
      });
    }
  };

  // اختيار الحركة
  const makeChoice = async (choice: Choice) => {
    if (!roomData || !roomCode) return;

    const updateField = isHost || !isPlayer2 ? 'player1_choice' : 'player2_choice';
    
    const { error } = await supabase
      .from('game_rooms')
      .update({ [updateField]: choice })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في الاختيار",
        description: "حاول مرة أخرى",
        variant: "destructive"
      });
    }
  };

  // تحديد الفائز في الجولة
  const determineRoundWinner = (p1Choice: Choice, p2Choice: Choice): 'player1' | 'player2' | 'tie' => {
    if (!p1Choice || !p2Choice) return 'tie';
    if (p1Choice === p2Choice) return 'tie';
    
    const winConditions = {
      rock: 'scissors',
      paper: 'rock',
      scissors: 'paper'
    };
    
    return winConditions[p1Choice] === p2Choice ? 'player1' : 'player2';
  };

  // معالجة نهاية الجولة
  useEffect(() => {
    if (!roomData || !roomCode) return;
    
    // إذا اختار كلا اللاعبين
    if (roomData.player1_choice && roomData.player2_choice && roomData.game_status === 'playing') {
      const roundWinner = determineRoundWinner(roomData.player1_choice, roomData.player2_choice);
      
      let newPlayer1Score = roomData.player1_score;
      let newPlayer2Score = roomData.player2_score;
      
      if (roundWinner === 'player1') newPlayer1Score++;
      else if (roundWinner === 'player2') newPlayer2Score++;

      // تحديد فائز اللعبة (أول من يصل لـ 3 نقاط)
      const gameWinner = newPlayer1Score >= 3 ? 'player1' : 
                        newPlayer2Score >= 3 ? 'player2' : null;

      const newGameStatus = gameWinner ? 'game_complete' : 'round_complete';

      // إجراء التحديث مع معالجة الأخطاء
      const updateRound = async () => {
        const { error } = await supabase
          .from('game_rooms')
          .update({
            round_winner: roundWinner,
            player1_score: newPlayer1Score,
            player2_score: newPlayer2Score,
            winner: gameWinner,
            game_status: newGameStatus
          })
          .eq('id', roomCode);

        if (error) {
          console.error('Error updating round:', error);
          toast({
            title: "❌ خطأ في حفظ النتيجة",
            description: "حاول إعادة تحميل الصفحة",
            variant: "destructive"
          });
        }
      };

      updateRound();
    }
  }, [roomData?.player1_choice, roomData?.player2_choice, roomData?.game_status, roomCode]);

  // إعادة تعيين الجولة
  const resetRound = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from('game_rooms')
      .update({
        player1_choice: null,
        player2_choice: null,
        round_winner: null,
        current_round: (roomData?.current_round || 1) + 1,
        game_status: 'playing'
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في إعادة الجولة",
        description: "حاول مرة أخرى",
        variant: "destructive"
      });
    }
  };

  // إعادة تعيين اللعبة
  const resetGame = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from('game_rooms')
      .update({
        player1_choice: null,
        player2_choice: null,
        player1_score: 0,
        player2_score: 0,
        current_round: 1,
        round_winner: null,
        winner: null,
        game_status: 'playing'
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في إعادة اللعبة",
        description: "حاول مرة أخرى",
        variant: "destructive"
      });
    }
  };

  // نسخ رابط الغرفة
  const shareRoom = async () => {
    const link = `${window.location.origin}/play?r=${roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "✅ تم نسخ الرابط!",
        description: "شارك الرابط مع صديقك",
      });
    } catch (err) {
      toast({
        title: "❌ فشل في نسخ الرابط",
        description: "حاول نسخه يدوياً",
        variant: "destructive"
      });
    }
  };

  if (!roomCode) {
    return <div>رمز الغرفة مطلوب</div>;
  }

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

  // إذا كانت الغرفة ممتلئة والمستخدم ليس من اللاعبين
  if (roomData.player2_name && !isHost && !isPlayer2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">🚫 الغرفة ممتلئة</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">هذه الغرفة تحتوي على لاعبين بالفعل</p>
            <Button onClick={() => navigate('/')} className="w-full">
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // إذا كان اللاعب الثاني يحتاج لإدخال اسمه
  if (isPlayer2 && !roomData.player2_name) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">🎮 انضمام للعبة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">اسمك:</label>
              <Input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="أدخل اسمك هنا"
                className="text-right"
                onKeyPress={(e) => e.key === 'Enter' && joinAsPlayer2()}
              />
            </div>
            <Button 
              onClick={joinAsPlayer2} 
              className="w-full"
              disabled={!playerName.trim()}
            >
              انضم للعبة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlayerChoice = (isHost || !isPlayer2) ? roomData.player1_choice : roomData.player2_choice;
  const otherPlayerChoice = (isHost || !isPlayer2) ? roomData.player2_choice : roomData.player1_choice;
  const bothPlayersChosen = roomData.player1_choice && roomData.player2_choice;

  // تحديد ما إذا كان اللاعب الحالي هو اللاعب الأول
  const isCurrentPlayer1 = isHost || !isPlayer2;
  
  // اللاعب الأول يجب أن ينتظر حتى يختار اللاعب الثاني أولاً
  const shouldPlayer1Wait = isCurrentPlayer1 && !roomData.player2_choice && roomData.game_status === 'playing';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4" dir="rtl">
      <div className="max-w-md mx-auto space-y-6">
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
          
          {(isHost || !isPlayer2) && (
            <Button onClick={shareRoom} variant="outline" size="sm">
              <Copy className="ml-2 h-4 w-4" />
              مشاركة الرابط
            </Button>
          )}
        </div>

        {/* النتيجة */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">النتيجة</h2>
              <div className="flex justify-center space-x-8 text-lg font-semibold">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{roomData.player1_score}</div>
                  <div className="text-sm text-gray-600">{roomData.player1_name}</div>
                </div>
                <div className="text-3xl">VS</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{roomData.player2_score}</div>
                  <div className="text-sm text-gray-600">{roomData.player2_name || 'في الانتظار...'}</div>
                </div>
              </div>
              <div className="text-sm text-gray-500">الجولة {roomData.current_round}</div>
            </div>
          </CardContent>
        </Card>

        {/* انتظار اللاعب الثاني */}
        {roomData.game_status === 'waiting' && (
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-lg font-medium">في انتظار اللاعب الثاني...</p>
              <p className="text-sm text-gray-600 mt-2">شارك الرابط مع صديقك</p>
            </CardContent>
          </Card>
        )}

        {/* اللعب */}
        {roomData.game_status === 'playing' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>
                {currentPlayerChoice ? 
                  '✅ تم اختيار حركتك!' : 
                  shouldPlayer1Wait ? 
                    `⏳ انتظر حتى يختار ${roomData.player2_name}` : 
                    'اختر حركتك'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentPlayerChoice ? (
                <div className="text-center space-y-4">
                  <div className="text-6xl">⏳</div>
                  <p className="text-lg">في انتظار اختيار اللاعب الآخر...</p>
                  {bothPlayersChosen && (
                    <p className="text-sm text-gray-500">جارٍ حساب النتيجة...</p>
                  )}
                </div>
              ) : shouldPlayer1Wait ? (
                <div className="text-center space-y-4">
                  <div className="text-6xl">⏳</div>
                  <p className="text-lg">انتظر حتى يختار {roomData.player2_name} حركته أولاً</p>
                  <p className="text-sm text-gray-500">ستتمكن من اللعب بعد أن يختار</p>
                </div>
              ) : (
                <GameChoice onChoice={makeChoice} />
              )}
            </CardContent>
          </Card>
        )}

        {/* نتيجة الجولة */}
        {(roomData.game_status === 'round_complete' || roomData.game_status === 'game_complete') && bothPlayersChosen && (
          <GameResult
            player1={{
              name: roomData.player1_name,
              choice: roomData.player1_choice
            }}
            player2={{
              name: roomData.player2_name || 'Player 2',
              choice: roomData.player2_choice
            }}
            winner={roomData.round_winner}
            isGameComplete={roomData.game_status === 'game_complete'}
            gameWinner={roomData.winner}
            onReset={roomData.game_status === 'game_complete' ? resetGame : resetRound}
            onGoHome={() => navigate('/')}
          />
        )}
      </div>
    </div>
  );
};

export default GameRoom;
