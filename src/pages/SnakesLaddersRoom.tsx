import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ArrowLeft, RotateCcw, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SnakesLaddersRoom {
  id: string;
  player1_name: string | null;
  player2_name: string | null;
  player3_name: string | null;
  player4_name: string | null;
  player1_session_id: string | null;
  player2_session_id: string | null;
  player3_session_id: string | null;
  player4_session_id: string | null;
  player_positions: string;
  current_player_index: number;
  max_players: number;
  game_status: 'waiting' | 'playing' | 'finished';
  winner: string | null;
  dice_value: number | null;
  last_move: string | null;
  created_at: string;
}

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

const boardLayout = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [20, 19, 18, 17, 16, 15, 14, 13, 12, 11],
  [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
  [40, 39, 38, 37, 36, 35, 34, 33, 32, 31],
  [41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
  [60, 59, 58, 57, 56, 55, 54, 53, 52, 51],
  [61, 62, 63, 64, 65, 66, 67, 68, 69, 70],
  [80, 79, 78, 77, 76, 75, 74, 73, 72, 71],
  [81, 82, 83, 84, 85, 86, 87, 88, 89, 90],
  [100, 99, 98, 97, 96, 95, 94, 93, 92, 91]
];

const SnakesLaddersRoom = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState<SnakesLaddersRoom | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());

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
  }, [roomCode, navigate]);

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
    if (data.player1_session_id === sessionId) {
      setPlayerNumber(1);
    } else if (data.player2_session_id === sessionId) {
      setPlayerNumber(2);
    } else if (data.player3_session_id === sessionId) {
      setPlayerNumber(3);
    } else if (data.player4_session_id === sessionId) {
      setPlayerNumber(4);
    } else if (!data.player1_name) {
      setPlayerNumber(1);
    } else if (!data.player2_name) {
      setPlayerNumber(2);
    } else if (!data.player3_name && data.max_players >= 3) {
      setPlayerNumber(3);
    } else if (!data.player4_name && data.max_players >= 4) {
      setPlayerNumber(4);
    } else {
      setPlayerNumber(null);
    }
  };

  const joinGame = async () => {
    if (!playerName.trim() || !roomCode || !playerNumber) return;

    const updateField = `player${playerNumber}_name`;
    const sessionField = `player${playerNumber}_session_id`;
    
    const { error } = await supabase
      .from('snakes_ladders_rooms')
      .update({
        [updateField]: playerName.trim(),
        [sessionField]: sessionId,
        game_status: roomData?.player2_name ? 'playing' : 'waiting',
        last_move: `🚪 اللاعب ${playerName.trim()} انضم إلى اللعبة`
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

  const leaveGame = async () => {
    if (!playerNumber || !roomCode) return;
    
    const name = roomData?.[`player${playerNumber}_name` as keyof SnakesLaddersRoom];
    await supabase
      .from('snakes_ladders_rooms')
      .update({
        [`player${playerNumber}_name`]: null,
        [`player${playerNumber}_session_id`]: null,
        last_move: `🚪 اللاعب ${name} خرج من الغرفة`
      })
      .eq('id', roomCode);
    navigate('/snakes-home');
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
    
    const currentPlayerIndex = roomData.current_player_index;
    const playerName = roomData[`player${currentPlayerIndex + 1}_name` as keyof SnakesLaddersRoom];
    const prevPos = positions[currentPlayerIndex];
    
    let newPos = prevPos + diceValue;
    let moveMsg = `🎲 ${playerName} رمى ${diceValue} وانتقل من ${prevPos} إلى ${newPos}`;

    if (snakesAndLadders.ladders[newPos as keyof typeof snakesAndLadders.ladders]) {
      newPos = snakesAndLadders.ladders[newPos as keyof typeof snakesAndLadders.ladders];
      moveMsg += ` 🚀 وصعد بالسلم إلى ${newPos}`;
    } else if (snakesAndLadders.snakes[newPos as keyof typeof snakesAndLadders.snakes]) {
      newPos = snakesAndLadders.snakes[newPos as keyof typeof snakesAndLadders.snakes];
      moveMsg += ` 🐍 وطاح بالثعبان إلى ${newPos}`;
    }

    positions[currentPlayerIndex] = newPos;

    let newGameStatus = roomData.game_status;
    let winner = null;
    
    if (newPos >= 100) {
      newPos = 100;
      newGameStatus = 'finished';
      winner = playerName;
      moveMsg = `🏆 ${playerName} فاز باللعبة!`;
    }
    
    let nextPlayerIndex = (currentPlayerIndex + 1) % 4;
    
    const players = [
      roomData.player1_name,
      roomData.player2_name,
      roomData.player3_name,
      roomData.player4_name
    ];
    
    while (!players[nextPlayerIndex] && nextPlayerIndex !== currentPlayerIndex) {
      nextPlayerIndex = (nextPlayerIndex + 1) % 4;
    }

    await supabase
      .from('snakes_ladders_rooms')
      .update({
        player_positions: JSON.stringify(positions),
        current_player_index: newGameStatus === 'finished' ? currentPlayerIndex : nextPlayerIndex,
        game_status: newGameStatus,
        winner: winner,
        dice_value: diceValue,
        last_move: moveMsg
      })
      .eq('id', roomCode);
  };

  const resetGame = async () => {
    if (!roomCode) return;

    await supabase
      .from('snakes_ladders_rooms')
      .update({
        player_positions: JSON.stringify([0, 0, 0, 0]),
        current_player_index: 0,
        game_status: 'waiting',
        winner: null,
        dice_value: null,
        last_move: null
      })
      .eq('id', roomCode);
  };

  const shareRoom = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
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

  const hasLadder = (cellNumber: number) => {
    return Object.keys(snakesAndLadders.ladders).includes(cellNumber.toString());
  };

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
  const maxPlayers = roomData.max_players || 2;
  const playersCount = [
    roomData.player1_name,
    roomData.player2_name,
    roomData.player3_name,
    roomData.player4_name
  ].filter(Boolean).length;

  if (playersCount >= maxPlayers && playerNumber === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">🚫 الغرفة ممتلئة</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">هذه الغرفة تحتوي على {maxPlayers} لاعبين بالفعل</p>
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
  if (playerNumber && !roomData[`player${playerNumber}_name` as keyof SnakesLaddersRoom]) {
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
          
          <Button onClick={shareRoom} variant="outline" size="sm">
            <Copy className="ml-2 h-4 w-4" />
            مشاركة الرابط
          </Button>
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

              {roomData.last_move && (
                <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                  {roomData.last_move}
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
                    const top = `${rowIndex * 10}%`;
                    const left = `${colIndex * 10}%`;
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

            <div className="flex justify-center space-x-2">
              {roomData.game_status === 'playing' && (
                <Button 
                  onClick={rollDice} 
                  className="text-lg py-4 px-8 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                  disabled={playerNumber !== roomData.current_player_index + 1}
                >
                  🎲 رمي النرد
                </Button>
              )}

              {(playerNumber === 1 || roomData.game_status === 'finished') && (
                <Button onClick={resetGame} className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white">
                  <RotateCcw className="ml-2 h-4 w-4" />
                  إعادة اللعبة
                </Button>
              )}

              <Button onClick={leaveGame} variant="destructive">
                🚪 مغادرة
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* معلومات اللاعبين */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="ml-2 h-5 w-5" />
              اللاعبون ({activePlayers.length}/{maxPlayers})
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
              {maxPlayers >= 3 && (
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-sm">اللاعب الثالث</span>
                </div>
              )}
              {maxPlayers >= 4 && (
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="text-sm">اللاعب الرابع</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SnakesLaddersRoom;
