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
      1: 38,
      4: 14,
      9: 31,
      21: 42,
      28: 84,
      51: 67,
      80: 100,
      71: 91
    },
    snakes: {
      17: 7,
      54: 34,
      62: 19,
      64: 60,
      87: 24,
      93: 73,
      98: 79
    }
  };

  // ✅ إحداثيات الخلايا تبدأ من أسفل يسار
  const boardLayout = [
    // الصف 1 (الأسفل) - من اليسار إلى اليمين
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    // الصف 2 - من اليمين إلى اليسار
    [20, 19, 18, 17, 16, 15, 14, 13, 12, 11],
    // الصف 3 - من اليسار إلى اليمين
    [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    // الصف 4 - من اليمين إلى اليسار
    [40, 39, 38, 37, 36, 35, 34, 33, 32, 31],
    // الصف 5 - من اليسار إلى اليمين
    [41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
    // الصف 6 - من اليمين إلى اليسار
    [60, 59, 58, 57, 56, 55, 54, 53, 52, 51],
    // الصف 7 - من اليسار إلى اليمين
    [61, 62, 63, 64, 65, 66, 67, 68, 69, 70],
    // الصف 8 - من اليمين إلى اليسار
    [80, 79, 78, 77, 76, 75, 74, 73, 72, 71],
    // الصف 9 - من اليسار إلى اليمين
    [81, 82, 83, 84, 85, 86, 87, 88, 89, 90],
    // الصف 10 (الأعلى) - من اليمين إلى اليسار
    [100, 99, 98, 97, 96, 95, 94, 93, 92, 91]
  ];

  // باقي الكود نفس ما هو 👇 بدون تغيير
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
    const currentPlayerIndex = roomData.current_player_index;
    positions[currentPlayerIndex] += diceValue;
    
    // التحقق من الفائز
    let newGameStatus = roomData.game_status;
    let winner = null;
    
    if (positions[currentPlayerIndex] >= 100) {
      positions[currentPlayerIndex] = 100;
      newGameStatus = 'finished';
      winner = roomData[`player${currentPlayerIndex + 1}_name` as keyof SnakesLaddersRoom];
    }
    
    // تطبيق قواعد السلم والثعبان
    const currentPosition = positions[currentPlayerIndex];
    
    // التحقق من السلالم
    if (snakesAndLadders.ladders[currentPosition as keyof typeof snakesAndLadders.ladders]) {
      const ladderTarget = snakesAndLadders.ladders[currentPosition as keyof typeof snakesAndLadders.ladders];
      positions[currentPlayerIndex] = ladderTarget;
      toast({
        title: "🪜 صعدت سلم!",
        description: `تقدمت إلى المربع ${ladderTarget}`
      });
    }
    // التحقق من الثعابين
    else if (snakesAndLadders.snakes[currentPosition as keyof typeof snakesAndLadders.snakes]) {
      const snakeTarget = snakesAndLadders.snakes[currentPosition as keyof typeof snakesAndLadders.snakes];
      positions[currentPlayerIndex] = snakeTarget;
      toast({
        title: "🐍 وقعت في ثعبان!",
        description: `تراجعت إلى المربع ${snakeTarget}`
      });
    }
    
    // حساب اللاعب التالي
    let nextPlayerIndex = (currentPlayerIndex + 1) % 4;
    
    // تخطي اللاعبين غير النشطين
    const players = [
      roomData.player1_name,
      roomData.player2_name,
      roomData.player3_name,
      roomData.player4_name
    ];
    
    while (!players[nextPlayerIndex] && nextPlayerIndex !== currentPlayerIndex) {
      nextPlayerIndex = (nextPlayerIndex + 1) % 4;
    }

    const { error } = await supabase
      .from('snakes_ladders_rooms')
      .update({
        player_positions: JSON.stringify(positions),
        current_player_index: newGameStatus === 'finished' ? currentPlayerIndex : nextPlayerIndex,
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

  // دالة لتحديد إذا كانت الخلية تحتوي على سلم
  const hasLadder = (cellNumber: number) => {
    return Object.keys(snakesAndLadders.ladders).includes(cellNumber.toString());
  };

  // دالة لتحديد إذا كانت الخلية تحتوي على ثعبان
  const hasSnake = (cellNumber: number) => {
    return Object.keys(snakesAndLadders.snakes).includes(cellNumber.toString());
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
    { name: roomData.player1_name, position: positions[0], active: !!roomData.player1_name, color: 'bg-red-500', emoji: '🔴' },
    { name: roomData.player2_name, position: positions[1], active: !!roomData.player2_name, color: 'bg-blue-500', emoji: '🔵' },
    { name: roomData.player3_name, position: positions[2], active: !!roomData.player3_name, color: 'bg-green-500', emoji: '🟢' },
    { name: roomData.player4_name, position: positions[3], active: !!roomData.player4_name, color: 'bg-yellow-500', emoji: '🟡' },
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
                      <div className="text-sm">المربع: {player.position}</div>
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
            <div className="relative mb-4 mx-auto" style={{ maxWidth: '500px' }}>
              {/* خلفية اللوحة */}
              <img 
                src="/snakes-ladders-board.jpg" 
                alt="لوحة السلم والثعبان" 
                className="w-full h-auto rounded-lg shadow-inner"
              />
              
              {/* شبكة الخلايا الشفافة فوق الخلفية */}
              <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 gap-0">
                {boardLayout.map((row, rowIndex) => (
                  row.map((cellNumber, colIndex) => {
                    const playersHere = players.filter(player => 
                      player.active && player.position === cellNumber
                    );
                    
                    const isLadder = hasLadder(cellNumber);
                    const isSnake = hasSnake(cellNumber);
                    
                    // حساب الإحداثيات بناءً على الصف والعمود
                    const adjustedRowIndex = 9 - rowIndex; 
                    const top = `${adjustedRowIndex * 9.5}%`;
                    const left = `${colIndex * 9.5}%`;
                    const width = '10%';
                    const height = '10%';
                    
                    return (
                      <div
                        key={cellNumber}
                        className="absolute border border-gray-400 border-opacity-30"
                        style={{ top, left, width, height }}
                      >
                        {/* عرض اللاعبين على الخلية */}
                        {playersHere.length > 0 && (
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex">
                            {playersHere.slice(0, 2).map((player, idx) => (
                              <div
                                key={idx}
                                className={`w-3 h-3 rounded-full ${player.color} border border-white`}
                                title={player.name}
                              />
                            ))}
                            {playersHere.length > 2 && (
                              <div className="w-3 h-3 rounded-full bg-gray-500 text-white text-[8px] flex items-center justify-center border border-white">
                                +{playersHere.length - 2}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* عرض أيقونات السلالم والثعابين */}
                        {(isLadder || isSnake) && (
                          <div className={`absolute bottom-0 right-0 text-sm ${isLadder ? 'text-green-600' : 'text-red-600'}`} 
                            title={isLadder ? 
                              `سلم إلى ${snakesAndLadders.ladders[cellNumber as keyof typeof snakesAndLadders.ladders]}` : 
                              `ثعبان إلى ${snakesAndLadders.snakes[cellNumber as keyof typeof snakesAndLadders.snakes]}`}>
                            {isLadder ? '🪜' : '🐍'}
                          </div>
                        )}
                        
                        {/* عرض رقم الخلية */}
                        <span className="absolute top-0 left-0 text-[10px] font-bold bg-white bg-opacity-70 rounded-full w-4 h-4 flex items-center justify-center">
                          {cellNumber}
                        </span>
                      </div>
                    );
                  })
                ))}
              </div>
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
                      <div className={`w-3 h-3 rounded-full ${player.color} mr-2`}></div>
                      <span>{player.name} (لاعب {index + 1})</span>
                    </div>
                    <span className="font-semibold">المربع: {player.position}</span>
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
                <span className="text-lg mr-2">🪜</span>
                <span className="text-sm">سلم - يصعدك لمربع أعلى</span>
              </div>
              <div className="flex items-center">
                <span className="text-lg mr-2">🐍</span>
                <span className="text-sm">ثعبان - ينزلك لمربع أدنى</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                <span className="text-sm">اللاعب الأول</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                <span className="text-sm">اللاعب الثاني</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                <span className="text-sm">اللاعب الثالث</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                <span className="text-sm">اللاعب الرابع</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SnakesLaddersRoom;
