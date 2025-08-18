import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, RotateCcw, Share2, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";

type Choice = 'rock' | 'paper' | 'scissors' | null;
type Winner = 'player1' | 'player2' | 'tie' | null;

interface GameRoom {
  id: string;
  game_type: 'rock_paper_scissors' | 'tic_tac_toe'; // نوع اللعبة
  player1_name: string | null;
  player2_name: string | null;
  player1_choice: Choice;
  player2_choice: Choice;
  player1_score: number;
  player2_score: number;
  current_round: number;
  game_status: 'waiting' | 'playing' | 'round_complete' | 'game_complete';
  winner: Winner;
  round_winner: Winner;
  created_at: string;
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

  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const fetchRoomData = async () => {
    if (!roomCode) return;

    const { data, error } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomCode)
      .single();

    if (error) {
      toast({
        title: "❌ الغرفة غير موجودة",
        description: "تأكد من صحة الرابط",
        variant: "destructive"
      });
      navigate('/');
    }

    setRoomData(data as GameRoom);
    setLoading(false);

    if (!isHost) {
      if (!data.player2_name) {
        setIsPlayer2(true);
      } else if (data.player2_session_id === sessionId) {
        setIsPlayer2(true);
      } else {
        setIsPlayer2(false);
      }
    }
  };

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    fetchRoomData();

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
            const newData = payload.new as GameRoom;
            setRoomData(newData);

            if (!isHost) {
              if (!newData.player2_name) {
                setIsPlayer2(true);
              } else if (newData.player2_session_id === sessionId) {
                setIsPlayer2(true);
              } else {
                setIsPlayer2(false);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomCode, navigate, isHost]);

  const joinAsPlayer2 = async () => {
    if (!playerName.trim() || !roomCode) return;

    const { data: updateResult, error } = await supabase
      .from('game_rooms')
      .update({
        player2_name: playerName.trim(),
        player2_session_id: sessionId,
        game_status: 'playing'
      })
      .eq('id', roomCode)
      .is('player2_name', null)
      .select();

    if (error || !updateResult || updateResult.length === 0) {
      toast({
        title: "❌ الغرفة ممتلئة",
        description: "لقد انضم لاعب آخر بالفعل",
        variant: "destructive"
      });
      fetchRoomData();
      return;
    }

    toast({
      title: "✅ تم الانضمام بنجاح!",
      description: "مرحباً بك في اللعبة"
    });
  };

  const makeChoice = async (choice: Choice) => {
    if (!roomData || !roomCode) return;

    if (!isHost && isPlayer2 && roomData.player2_session_id !== sessionId) {
      toast({
        title: "❌ غير مسموح",
        description: "هذا الحساب مخصص للاعب آخر",
        variant: "destructive"
      });
      fetchRoomData();
      return;
    }

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

  useEffect(() => {
    if (!roomData || !roomCode) return;

    if (roomData.player1_choice && roomData.player2_choice && roomData.game_status === 'playing') {
      const roundWinner = determineRoundWinner(roomData.player1_choice, roomData.player2_choice);

      let newPlayer1Score = roomData.player1_score;
      let newPlayer2Score = roomData.player2_score;

      if (roundWinner === 'player1') newPlayer1Score++;
      else if (roundWinner === 'player2') newPlayer2Score++;

      const gameWinner = newPlayer1Score >= 3 ? 'player1' :
                        newPlayer2Score >= 3 ? 'player2' : null;

      const newGameStatus = gameWinner ? 'game_complete' : 'round_complete';

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

  return (
    <div className="min-h-screen p-4 flex items-center justify-center" dir="rtl">
      <div className="w-full max-w-md space-y-4">
        {/* شريط التنقل */}
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button onClick={() => navigate('/')} variant="outline" size="sm">
              العودة للرئيسية
            </Button>
            
            {(isHost || !isPlayer2) && (
              <Button onClick={shareRoom} variant="outline" size="sm">
                <Copy className="ml-2 h-4 w-4" />
                مشاركة الرابط
              </Button>
            )}
          </div>
          
          <ThemeToggle />
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
                {roomData.current_player === 'X' ? "دور X" : "دور O"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {Array(9).fill("").map((_, i) => (
                  <button
                    key={i}
                    onClick={() => makeChoice(i === 0 ? 'rock' : 'paper')}
                    className="h-20 rounded-xl border bg-gray-700 text-3xl font-bold flex items-center justify-center"
                  >
                    {roomData.current_player}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default GameRoom;
