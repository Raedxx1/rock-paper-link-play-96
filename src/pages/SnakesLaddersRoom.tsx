import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ArrowLeft, RotateCcw, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SnakesLaddersRoom {
  id: string;
  player1_name: string;
  player2_name: string | null;
  player3_name: string | null;
  player4_name: string | null;
  player1_session_id: string | null;
  player2_session_id: string | null;
  player3_session_id: string | null;
  player4_session_id: string | null;
  player_positions: string;
  board_state: string;
  current_player_index: number;
  max_players: number;
  game_status: 'waiting' | 'playing' | 'finished';
  winner: string | null;
  dice_value: number | null;
  created_at: string;
}

const SnakesLaddersRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get('r');
  const isHost = searchParams.get('host') === 'true';
  
  const [roomData, setRoomData] = useState<SnakesLaddersRoom | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  // تعريف السلالم والثعابين
  const snakesAndLadders = {
    ladders: {
      4: 25, 13: 46, 33: 49, 42: 63, 50: 69, 62: 81, 74: 92
    },
    snakes: {
      27: 5, 40: 3, 43: 18, 54: 31, 66: 45, 76: 58, 89: 53, 99: 41
    }
  };

  const fetchRoomData = async () => {
    if (!roomCode) return;

    const { data, error } = await supabase
      .from('snakes_ladders_rooms')
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
        navigate('/snakes-home');
      }
      return;
    }

    setRoomData(data as SnakesLaddersRoom);
    setLoading(false);
    determinePlayerNumber(data as SnakesLaddersRoom);
  };

  const determinePlayerNumber = (data: SnakesLaddersRoom) => {
    if (isHost) {
      setPlayerNumber(1);
      return;
    }

    if (!data.player2_name || data.player2_session_id === sessionId) {
      setPlayerNumber(2);
    } else if (!data.player3_name || data.player3_session_id === sessionId) {
      setPlayerNumber(3);
    } else if (!data.player4_name || data.player4_session_id === sessionId) {
      setPlayerNumber(4);
    } else {
      setPlayerNumber(null);
    }
  };

  useEffect(() => {
    if (!roomCode) {
      navigate('/snakes-home');
      return;
    }

    fetchRoomData();

    const subscription = supabase
      .channel('snakes_ladders_room_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'snakes_ladders_rooms',
          filter: `id=eq.${roomCode}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const newData = payload.new as SnakesLaddersRoom;
            setRoomData(newData);
            determinePlayerNumber(newData);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomCode, navigate, isHost]);

  const joinGame = async () => {
    if (!playerName.trim() || !roomCode || !playerNumber) return;

    const updateField = `player${playerNumber}_name`;
    const sessionField = `player${playerNumber}_session_id`;
    
    const { error } = await supabase
      .from('snakes_ladders_rooms')
      .update({
        [updateField]: playerName.trim(),
        [sessionField]: sessionId,
        game_status: roomData?.player2_name ? 'playing' : 'waiting'
      })
      .eq('id', roomCode)
      .is(updateField, null);

    if (error) {
      toast({
        title: "❌ خطأ في الانضمام",
        description: "حاول مرة أخرى",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "✅ تم الانضمام بنجاح!",
      description: "مرحباً بك في اللعبة"
    });
  };

  const rollDice = async () => {
    if (!roomCode || !roomData || roomData.game_status !== 'playing') return;
    
    if (playerNumber !== roomData.current_player_index + 1) {
      toast({
        title: "⏳ ليس دورك الآن",
        description: "انتظر دورك للعب",
        variant: "destructive"
      });
      return;
    }

    const diceValue = Math.floor(Math.random() * 6) + 1;
    const positions = JSON.parse(roomData.player_positions || '[0,0,0,0]');
    
    // تحديث موقع اللاعب الحالي
    positions[roomData.current_player_index] += diceValue;
    
    // التحقق من الفائز
    let newGameStatus = roomData.game_status;
    let winner = null;
    
    if (positions[roomData.current_player_index] >= 99) {
      positions[roomData.current_player_index] = 99;
      newGameStatus = 'finished';
      winner = roomData[`player${roomData.current_player_index + 1}_name` as keyof SnakesLaddersRoom];
    }
    
    // تطبيق قواعد السلم والثعبان
    const board = JSON.parse(roomData.board_state || '[]');
    const currentPosition = positions[roomData.current_player_index];
    
    if (currentPosition < 100 && board[currentPosition] !== 0) {
      if (board[currentPosition] > 0) {
        // سلم
        positions[roomData.current_player_index] = board[currentPosition];
        toast({
          title: "🪜 صعدت سلم!",
          description: `تقدمت إلى المربع ${board[currentPosition] + 1}`
        });
      } else {
        // ثعبان
        positions[roomData.current_player_index] = Math.abs(board[currentPosition]);
        toast({
          title: "🐍 وقعت في ثعبان!",
          description: `تراجعت إلى المربع ${Math.abs(board[currentPosition]) + 1}`
        });
      }
    }
    
    // حساب اللاعب التالي
    let nextPlayerIndex = (roomData.current_player_index + 1) % 4;
    
    // تخطي اللاعبين غير النشطين
    const players = [
      roomData.player1_name,
      roomData.player2_name,
      roomData.player3_name,
      roomData.player4_name
    ];
    
    while (!players[nextPlayerIndex] && nextPlayerIndex !== roomData.current_player_index) {
      nextPlayerIndex = (nextPlayerIndex + 1) % 4;
    }

    const { error } = await supabase
      .from('snakes_ladders_rooms')
      .update({
        player_positions: JSON.stringify(positions),
        current_player_index: newGameStatus === 'finished' ? roomData.current_player_index : nextPlayerIndex,
        game_status: newGameStatus,
        winner: winner,
        dice_value: diceValue
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في رمي النرد",
        description: "حاول مرة أخرى",
        variant: "destructive"
      });
    }
  };

  const resetGame = async () => {
    if (!roomCode) return;

    const { error } = await supabase
      .from('snakes_ladders_rooms')
      .update({
        player_positions: JSON.stringify([0, 0, 0, 0]),
        current_player_index: 0,
        game_status: 'playing',
        winner: null,
        dice_value: null
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
    const link = `${window.location.origin}/snakes-ladders?r=${roomCode}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: "✅ تم نسخ الرابط!",
        description: "شارك الرابط مع أصدقائك",
      });
    } catch (err) {
      toast({
        title: "❌ فشل في نسخ الرابط",
        description: "حاول نسخه يدوياً",
        variant: "destructive"
      });
    }
  };

  // دالة لتحديد لون الخلية بناءً على موقعها
  const getCellColor = (cellIndex: number) => {
    const row = Math.floor(cellIndex / 10);
    if (row % 2 === 0) {
      return cellIndex % 2 === 0 ? 'bg-blue-100' : 'bg-blue-50';
    } else {
      return cellIndex % 2 === 0 ? 'bg-blue-50' : 'bg-blue-100';
    }
  };

  // دالة للتحقق إذا كانت الخلية تحتوي على سلم أو ثعبان
  const getCellSpecialContent = (cellIndex: number) => {
    // التحقق من السلالم
    if (Object.keys(snakesAndLadders.ladders).includes(cellIndex.toString())) {
      return {
        type: 'ladder',
        target: snakesAndLadders.ladders[cellIndex as keyof typeof snakesAndLadders.ladders]
      };
    }
    
    // التحقق من الثعابين
    if (Object.keys(snakesAndLadders.snakes).includes(cellIndex.toString())) {
      return {
        type: 'snake',
        target: snakesAndLadders.snakes[cellIndex as keyof typeof snakesAndLadders.snakes]
      };
    }
    
    return null;
  };

  if (!roomCode) {
    return <div>رمز الغرفة مطلوب</div>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-lg text-gray-600">جارٍ تحميل الغرفة...</p>
        </div>
      </div>
    );
  }

  if (!roomData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-lg text-gray-600">الغرفة غير موجودة</p>
          <Button onClick={() => navigate('/snakes-home')} className="mt-4">
            العودة
          </Button>
        </div>
      </div>
    );
  }

  // إذا كانت الغرفة ممتلئة والمستخدم ليس من اللاعبين
  if (roomData.player4_name && !isHost && playerNumber === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">🚫 الغرفة ممتلئة</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">هذه الغرفة تحتوي على 4 لاعبين بالفعل</p>
            <Button onClick={() => navigate('/snakes-home')} className="w-full">
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // إذا كان اللاعب يحتاج لإدخال اسمه
  if (!isHost && playerNumber && !roomData[`player${playerNumber}_name` as keyof SnakesLaddersRoom]) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">🎮 انضمام للعبة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">اسمك:</label>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="أدخل اسمك هنا"
                className="w-full p-2 border border-gray-300 rounded text-right"
                onKeyPress={(e) => e.key === 'Enter' && joinGame()}
              />
            </div>
            <Button 
              onClick={joinGame} 
              className="w-full"
              disabled={!playerName.trim()}
            >
              انضم كلاعب {playerNumber}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const positions = JSON.parse(roomData.player_positions || '[0,0,0,0]');
  const players = [
    { name: roomData.player1_name, position: positions[0], active: !!roomData.player1_name, color: 'bg-red-500' },
    { name: roomData.player2_name, position: positions[1], active: !!roomData.player2_name, color: 'bg-blue-500' },
    { name: roomData.player3_name, position: positions[2], active: !!roomData.player3_name, color: 'bg-green-500' },
    { name: roomData.player4_name, position: positions[3], active: !!roomData.player4_name, color: 'bg-yellow-500' },
  ];

  const activePlayers = players.filter(player => player.active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* شريط التنقل */}
        <div className="flex justify-between items-center">
          <Button 
            onClick={() => navigate('/snakes-home')} 
            variant="outline" 
            size="sm"
          >
            <ArrowLeft className="ml-2 h-4 w-4" />
            العودة
          </Button>
          
          {(isHost || playerNumber === 1) && (
            <Button onClick={shareRoom} variant="outline" size="sm">
              <Copy className="ml-2 h-4 w-4" />
              مشاركة الرابط
            </Button>
          )}
        </div>

        {/* معلومات اللعبة */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold">🐍🪜 السلم والثعبان</h2>
              <div className="flex justify-center space-x-6">
                {players.map((player, index) => (
                  player.active && (
                    <div 
                      key={index} 
                      className={`text-center p-3 rounded-lg ${
                        roomData.current_player_index === index && roomData.game_status === 'playing' 
                          ? 'bg-orange-100 dark:bg-orange-900' 
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      <div className="text-lg font-semibold">{player.name}</div>
                      <div className="text-sm">المربع: {player.position + 1}</div>
                      <div className="text-xs text-gray-500">لاعب {index + 1}</div>
                    </div>
                  )
                ))}
              </div>
              
              {roomData.game_status === 'playing' && (
                <div className="text-sm text-green-600 font-medium">
                  دور: {players[roomData.current_player_index]?.name}
                  {roomData.dice_value && ` - النرد: ${roomData.dice_value}`}
                </div>
              )}
              
              {roomData.game_status === 'finished' && roomData.winner && (
                <div className="p-4 bg-green-100 dark:bg-green-900 rounded-lg">
                  <p className="text-lg font-semibold">🎉 الفائز: {roomData.winner}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* لوحة اللعبة */}
        <Card>
          <CardHeader className="text-center">
            <CardTitle>
              {roomData.game_status === 'waiting' ? '⏳ في انتظار اللاعبين...' : 
               roomData.game_status === 'finished' ? '🎉 نهاية اللعبة!' : 
               '🎲 دورك!'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-10 gap-1 mb-4 bg-white p-2 rounded-lg shadow-inner">
              {Array.from({ length: 100 }).map((_, index) => {
                const cellIndex = 99 - index; // لجعل المربع 1 في الأسفل
                const playerHere = players.findIndex(player => 
                  player.active && player.position === cellIndex
                );
                
                const specialContent = getCellSpecialContent(cellIndex);
                
                return (
                  <div
                    key={cellIndex}
                    className={`w-10 h-10 border border-gray-300 flex items-center justify-center relative text-xs font-medium ${getCellColor(cellIndex)}`}
                  >
                    <span className="absolute top-0 left-0 text-[8px] p-1">{cellIndex + 1}</span>
                    
                    {specialContent && (
                      <div className="absolute bottom-0 right-0 text-lg">
                        {specialContent.type === 'ladder' ? '🪜' : '🐍'}
                      </div>
                    )}
                    
                    {playerHere !== -1 && (
                      <div className={`absolute w-5 h-5 rounded-full ${players[playerHere].color}`}></div>
                    )}
                  </div>
                );
              })}
            </div>

            {roomData.game_status === 'playing' && (
              <div className="text-center">
                <Button 
                  onClick={rollDice} 
                  className="text-lg py-4 px-8 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  disabled={playerNumber !== roomData.current_player_index + 1}
                >
                  🎲 رمي النرد
                </Button>
              </div>
            )}

            {roomData.game_status === 'finished' && (
              <div className="text-center">
                <Button onClick={resetGame} className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white">
                  <RotateCcw className="ml-2 h-4 w-4" />
                  لعبة جديدة
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* معلومات اللاعبين */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="ml-2 h-5 w-5" />
              اللاعبون ({activePlayers.length}/4)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {players.map((player, index) => (
                player.active && (
                  <div key={index} className="flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-800 rounded">
                    <div className="flex items-center">
                      <div className={`w-4 h-4 rounded-full ${player.color} mr-2`}></div>
                      <span>{player.name} (لاعب {index + 1})</span>
                    </div>
                    <span className="font-semibold">المربع: {player.position + 1}</span>
                  </div>
                )
              ))}
            </div>
          </CardContent>
        </Card>

        {/* مفتاح الرموز */}
        <Card>
          <CardHeader>
            <CardTitle>مفتاح الرموز</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <span className="text-2xl mr-2">🪜</span>
                <span>سلم - يصعدك لمربع أعلى</span>
              </div>
              <div className="flex items-center">
                <span className="text-2xl mr-2">🐍</span>
                <span>ثعبان - ينزلك لمربع أدنى</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
                <span>اللاعب الأول</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                <span>اللاعب الثاني</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                <span>اللاعب الثالث</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 rounded-full bg-yellow-500 mr-2"></div>
                <span>اللاعب الرابع</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SnakesLaddersRoom;
