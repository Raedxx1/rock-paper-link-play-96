import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ArrowLeft, RotateCcw, Users, Trophy, Crown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';

interface TicTacToeRoom {
  id: string;
  player1_name: string;
  player2_name: string | null;
  player2_session_id: string | null;
  board: string;
  player1_score: number;
  player2_score: number;
  current_round: number;
  game_status: 'waiting' | 'playing' | 'round_complete' | 'game_complete';
  winner: 'player1' | 'player2' | 'tie' | null;
  round_winner: 'player1' | 'player2' | 'tie' | null;
}

const TicTacToeRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get('r');
  const isHost = searchParams.get('host') === 'true';
  const { width, height } = useWindowSize();
  
  const [roomData, setRoomData] = useState<TicTacToeRoom | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [isPlayer2, setIsPlayer2] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (roomData?.game_status === 'game_complete') {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [roomData?.game_status]);

  const fetchRoomData = async () => {
    if (!roomCode) return;

    const { data, error } = await supabase
      .from('tic_tac_toe_rooms')
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

    setRoomData(data as TicTacToeRoom);
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
      .channel('tic_tac_toe_room_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tic_tac_toe_rooms',
          filter: `id=eq.${roomCode}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as TicTacToeRoom;
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
      .from('tic_tac_toe_rooms')
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

  const checkWinner = (board: string[]): 'player1' | 'player2' | 'tie' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] === 'X' ? 'player1' : 'player2';
      }
    }

    if (board.every(cell => cell)) return 'tie';

    return null;
  };

  const handleCellClick = async (index: number) => {
    if (!roomData || !roomCode || roomData.game_status !== 'playing') return;

    if (!isHost && isPlayer2 && roomData.player2_session_id !== sessionId) {
      toast({
        title: "❌ غير مسموح",
        description: "هذا الحساب مخصص للاعب آخر",
        variant: "destructive"
      });
      fetchRoomData();
      return;
    }

    const currentBoard = JSON.parse(roomData.board || '["", "", "", "", "", "", "", "", ""]');
    
    if (currentBoard[index]) return;

    const playerSymbol = (isHost || !isPlayer2) ? 'X' : 'O';
    currentBoard[index] = playerSymbol;

    const winner = checkWinner(currentBoard);

    let updateData: any = {
      board: JSON.stringify(currentBoard)
    };

    if (winner) {
      updateData.winner = winner;
      updateData.game_status = 'round_complete';
      updateData.round_winner = winner;
      
      if (winner === 'player1') {
        updateData.player1_score = (roomData.player1_score || 0) + 1;
      } else if (winner === 'player2') {
        updateData.player2_score = (roomData.player2_score || 0) + 1;
      }

      const newPlayer1Score = updateData.player1_score || roomData.player1_score;
      const newPlayer2Score = updateData.player2_score || roomData.player2_score;

      if (newPlayer1Score >= 3 || newPlayer2Score >= 3) {
        updateData.game_status = 'game_complete';
      }
    }

    const { error } = await supabase
      .from('tic_tac_toe_rooms')
      .update(updateData)
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في الحركة",
        description: "حاول مرة أخرى",
        variant: "destructive"
      });
    }
  };

  const resetRound = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from('tic_tac_toe_rooms')
      .update({
        board: JSON.stringify(Array(9).fill('')),
        winner: null,
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
      .from('tic_tac_toe_rooms')
      .update({
        board: JSON.stringify(Array(9).fill('')),
        player1_score: 0,
        player2_score: 0,
        current_round: 1,
        winner: null,
        round_winner: null,
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
    const link = `${window.location.origin}/tic-tac-toe?r=${roomCode}`;
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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-300">جارٍ تحميل الغرفة...</p>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-lg text-gray-600 dark:text-gray-300">الغرفة غير موجودة</p>
          <Button onClick={() => navigate('/')} className="mt-4">
            العودة للرئيسية
          </Button>
        </div>
      </div>
    );
  }

  if (roomData.player2_name && !isHost && !isPlayer2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex justify-center items-center gap-2">
              <Users className="text-red-500" />
              الغرفة ممتلئة
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600 dark:text-gray-300">هذه الغرفة تحتوي على لاعبين بالفعل</p>
            <Button onClick={() => navigate('/')} className="w-full">
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPlayer2 && !roomData.player2_name) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex justify-center items-center gap-2">
              <Users className="text-blue-500" />
              انضمام للعبة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">اسمك:</label>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="أدخل اسمك هنا"
                className="w-full p-3 border border-gray-300 rounded-lg text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white dark:border-gray-600"
                onKeyPress={(e) => e.key === 'Enter' && joinAsPlayer2()}
              />
            </div>
            <Button 
              onClick={joinAsPlayer2} 
              className="w-full py-3"
              disabled={!playerName.trim()}
            >
              انضم للعبة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentBoard = JSON.parse(roomData.board || '["", "", "", "", "", "", "", "", ""]');
  const isGameComplete = roomData.game_status === 'game_complete';
  const isRoundComplete = roomData.game_status === 'round_complete';
  const isPlaying = roomData.game_status === 'playing';
  const isWaiting = roomData.game_status === 'waiting';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800 p-4" dir="rtl">
      {showConfetti && <Confetti width={width} height={height} recycle={false} />}
      
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              size="sm"
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              الرئيسية
            </Button>
            
            {(isHost || !isPlayer2) && (
              <Button onClick={shareRoom} variant="outline" size="sm" className="gap-1">
                <Copy className="h-4 w-4" />
                مشاركة
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full">
              {roomCode}
            </div>
            <ThemeToggle />
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                <Trophy className="text-yellow-500" />
                النتيجة
              </h2>
              <div className="flex justify-center space-x-8 text-lg font-semibold">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${(isHost || !isPlayer2) ? 'text-blue-600' : 'text-gray-600'}`}>
                    {roomData.player1_score || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center justify-center gap-1">
                    {roomData.player1_name}
                    {isHost && <Crown className="h-4 w-4 text-yellow-500" />}
                  </div>
                </div>
                <div className="text-3xl text-gray-400">-</div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${(!isHost && isPlayer2) ? 'text-red-600' : 'text-gray-600'}`}>
                    {roomData.player2_score || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center justify-center gap-1">
                    {roomData.player2_name || 'في الانتظار...'}
                    {!isHost && isPlayer2 && <Crown className="h-4 w-4 text-yellow-500" />}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500">الجولة {roomData.current_round || 1}</div>
            </div>
          </CardContent>
        </Card>

        {isWaiting && (
          <Card className="shadow-lg">
            <CardContent className="pt-6 text-center">
              <div className="animate-pulse text-4xl mb-4">⏳</div>
              <p className="text-lg font-medium">في انتظار اللاعب الثاني...</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">شارك الرابط مع صديقك</p>
            </CardContent>
          </Card>
        )}

        {(isPlaying || isRoundComplete || isGameComplete) && (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <CardTitle>
                {isGameComplete ? '🎉 نهاية اللعبة!' : 
                 isRoundComplete ? '✅ نهاية الجولة!' : 
                 `دور ${(isHost || !isPlayer2) ? roomData.player1_name : roomData.player2_name}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 mb-6 bg-gray-200 dark:bg-gray-700 p-3 rounded-lg">
                {currentBoard.map((cell, index) => (
                  <div
                    key={index}
                    className={`aspect-square rounded-md flex items-center justify-center text-4xl font-bold cursor-pointer transition-all
                      ${cell === 'X' ? 'bg-blue-500 text-white' :
                        cell === 'O' ? 'bg-red-500 text-white' :
                        'bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    onClick={() => isPlaying && handleCellClick(index)}
                  >
                    {cell === 'X' ? 'X' : cell === 'O' ? 'O' : ''}
                  </div>
                ))}
              </div>

              {(isRoundComplete || isGameComplete) && roomData.winner && (
                <div className="text-center p-4 bg-green-100 dark:bg-green-900 rounded-lg mb-4">
                  <p className="text-lg font-semibold">
                    {roomData.winner === 'tie' ? '🤝 تعادل!' : 
                     `🎉 الفائز: ${roomData.winner === 'player1' ? roomData.player1_name : roomData.player2_name}`}
                  </p>
                  {isGameComplete && (
                    <p className="mt-2 text-sm">
                      {roomData.player1_score > roomData.player2_score ? 
                       `${roomData.player1_name} فاز باللعبة!` : 
                       `${roomData.player2_name} فاز باللعبة!`}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(isRoundComplete || isGameComplete) && (
          <div className="flex gap-2 justify-center">
            <Button 
              onClick={resetRound} 
              disabled={isGameComplete}
              className="flex-1 py-3 gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              الجولة التالية
            </Button>
            
            <Button 
              onClick={resetGame} 
              className="flex-1 py-3 gap-1 bg-green-600 hover:bg-green-700"
            >
              <RotateCcw className="h-4 w-4" />
              لعبة جديدة
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicTacToeRoom;
