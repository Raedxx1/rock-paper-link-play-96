import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ArrowLeft, RotateCcw, Users, MessageSquare } from 'lucide-react';
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

  const [animatedPositions, setAnimatedPositions] = useState([0, 0, 0, 0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameMessages, setGameMessages] = useState([]);
  const messagesEndRef = useRef(null);

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

  // تمرير إلى آخر رسالة
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [gameMessages]);

  // إضافة رسالة جديدة للجميع
  const addGameMessage = (message) => {
    const newMessage = {
      id: Date.now(),
      text: message,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setGameMessages(prev => [...prev, newMessage]);
  };

  // محاكاة الحركة السلسة
  const animateMovement = (startPosition, endPosition, playerIndex, isLadderOrSnake = false) => {
    setIsAnimating(true);
    const steps = Math.abs(endPosition - startPosition);
    const direction = endPosition > startPosition ? 1 : -1;
    let currentStep = 0;

    const animationInterval = setInterval(() => {
      currentStep++;
      const newPosition = startPosition + (currentStep * direction);
      
      setAnimatedPositions(prev => {
        const newPositions = [...prev];
        newPositions[playerIndex] = newPosition;
        return newPositions;
      });

      if (currentStep >= steps) {
        clearInterval(animationInterval);
        
        // إذا كانت حركة عادية (ليست سلم أو ثعبان)
        if (!isLadderOrSnake) {
          setIsAnimating(false);
          
          // التحقق من وجود سلم أو ثعبان في المربع الجديد
          const finalPosition = animatedPositions[playerIndex];
          checkForSnakeOrLadder(finalPosition, playerIndex);
        } else {
          setIsAnimating(false);
        }
      }
    }, 300); // سرعة الحركة
  };

  // التحقق من وجود ثعبان أو سلم
  const checkForSnakeOrLadder = (position, playerIndex) => {
    const playerName = roomData[`player${playerIndex + 1}_name`];
    let message = "";
    let targetPosition = position;

    // التحقق من السلالم
    if (snakesAndLadders.ladders[position]) {
      targetPosition = snakesAndLadders.ladders[position];
      message = `🎉 ${playerName} صعد سلم من ${position} إلى ${targetPosition}!`;
      addGameMessage(message);
      
      toast({
        title: "🪜 صعدت سلم!",
        description: `تقدمت من المربع ${position} إلى ${targetPosition}`
      });
      
      // محاكاة الحركة للسلم
      setTimeout(() => {
        animateMovement(position, targetPosition, playerIndex, true);
        updatePositionInDatabase(playerIndex, targetPosition);
      }, 1000);
    }
    // التحقق من الثعابين
    else if (snakesAndLadders.snakes[position]) {
      targetPosition = snakesAndLadders.snakes[position];
      message = `🐍 ${playerName} وقع في ثعبان من ${position} إلى ${targetPosition}!`;
      addGameMessage(message);
      
      toast({
        title: "🐍 وقعت في ثعبان!",
        description: `تراجعت من المربع ${position} إلى ${targetPosition}`
      });
      
      // محاكاة الحركة للثعبان
      setTimeout(() => {
        animateMovement(position, targetPosition, playerIndex, true);
        updatePositionInDatabase(playerIndex, targetPosition);
      }, 1000);
    } else {
      // إذا لم يكن هناك سلم أو ثعبان، تحديث الموضع مباشرة
      updatePositionInDatabase(playerIndex, position);
    }
  };

  // تحديث الموضع في قاعدة البيانات
  const updatePositionInDatabase = async (playerIndex, newPosition) => {
    if (!roomCode) return;

    const positions = JSON.parse(roomData.player_positions || '[0,0,0,0]');
    positions[playerIndex] = newPosition;
    
    // التحقق من الفائز
    let newGameStatus = roomData.game_status;
    let winner = null;
    
    if (newPosition >= 100) {
      positions[playerIndex] = 100;
      newGameStatus = 'finished';
      winner = roomData[`player${playerIndex + 1}_name`];
      
      const winMessage = `🎉 ${winner} فاز باللعبة!`;
      addGameMessage(winMessage);
    }
    
    // حساب اللاعب التالي
    let nextPlayerIndex = (playerIndex + 1) % 4;
    const players = [
      roomData.player1_name,
      roomData.player2_name,
      roomData.player3_name,
      roomData.player4_name
    ];
    
    while (!players[nextPlayerIndex] && nextPlayerIndex !== playerIndex) {
      nextPlayerIndex = (nextPlayerIndex + 1) % 4;
    }

    const { error } = await supabase
      .from('snakes_ladders_rooms')
      .update({
        player_positions: JSON.stringify(positions),
        current_player_index: newGameStatus === 'finished' ? playerIndex : nextPlayerIndex,
        game_status: newGameStatus,
        winner: winner
      })
      .eq('id', roomCode);

    if (error) {
      console.error("Error updating position:", error);
    }
  };

  // تعديل دالة رمي النرد
  const rollDice = async () => {
    if (!roomCode || !roomData || roomData.game_status !== 'playing' || isAnimating) return;
    
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
    const currentPosition = positions[currentPlayerIndex];
    const newPosition = currentPosition + diceValue;
    
    // إضافة رسالة الرمية
    const playerName = roomData[`player${currentPlayerIndex + 1}_name`];
    const rollMessage = `🎲 ${playerName} رمى النرد وحصل على ${diceValue}!`;
    addGameMessage(rollMessage);
    
    // تحديث قيمة النرد في قاعدة البيانات
    await supabase
      .from('snakes_ladders_rooms')
      .update({ dice_value: diceValue })
      .eq('id', roomCode);

    // بدء الحركة السلسة
    animateMovement(currentPosition, newPosition, currentPlayerIndex);
  };

  // ... (بقية الكود)

  // في جزء عرض اللوحة، استخدام animatedPositions بدلاً من positions
  const players = [
    { name: roomData.player1_name, position: animatedPositions[0], active: !!roomData.player1_name, color: 'bg-red-500', emoji: '🔴' },
    { name: roomData.player2_name, position: animatedPositions[1], active: !!roomData.player2_name, color: 'bg-blue-500', emoji: '🔵' },
    { name: roomData.player3_name, position: animatedPositions[2], active: !!roomData.player3_name, color: 'bg-green-500', emoji: '🟢' },
    { name: roomData.player4_name, position: animatedPositions[3], active: !!roomData.player4_name, color: 'bg-yellow-500', emoji: '🟡' },
  ];

  // في واجهة المستخدم، إضافة قسم للرسائل
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 p-4" dir="rtl">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* العمود الأيسر - معلومات اللعبة */}
        <div className="lg:col-span-2 space-y-6">
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
                        <div className="text-sm">المربع: {Math.min(player.position, 100)}</div>
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
              <div className="relative mb-4 mx-auto" style={{ maxWidth: '400px' }}>
                {/* خلفية اللوحة */}
                <img 
                  src="/snakes-ladders-board.jpg" 
                  alt="لوحة السلم والثعبان" 
                  className="w-full h-auto rounded-lg shadow-inner"
                />
                
                {/* شبكة الخلايا الشفافة فوق الخلفية */}
                <div className="absolute inset-0 grid grid-cols-0 grid-rows-0 gap-0">
                  {boardLayout.map((row, rowIndex) => (
                    row.map((cellNumber, colIndex) => {
                      const playersHere = players.filter(player => 
                        player.active && Math.floor(player.position) === cellNumber
                      );
                      
                      const isLadder = hasLadder(cellNumber);
                      const isSnake = hasSnake(cellNumber);
                      
                      // حساب الإحداثيات بناءً على الصف والعمود
                      const adjustedRowIndex = 9 - rowIndex; 
                      const top = `${adjustedRowIndex * 10}%`;
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

              {roomData.game_status === 'playing' && (
                <div className="text-center">
                  <Button 
                    onClick={rollDice} 
                    className="text-lg py-4 px-8 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                    disabled={playerNumber !== roomData.current_player_index + 1 || isAnimating}
                  >
                    {isAnimating ? '⏳ يتحرك...' : '🎲 رمي النرد'}
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
                      <span className="font-semibold">المربع: {Math.min(player.position, 100)}</span>
                    </div>
                  )
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* العمود الأيمن - الرسائل ومفتاح الرموز */}
        <div className="space-y-6">
          {/* رسائل اللعبة */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="ml-2 h-5 w-5" />
                أحداث اللعبة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 overflow-y-auto space-y-2">
                {gameMessages.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">لا توجد أحداث حتى الآن</p>
                ) : (
                  gameMessages.map(message => (
                    <div key={message.id} className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                      <div className="text-sm">{message.text}</div>
                      <div className="text-xs text-gray-500 text-left">{message.timestamp}</div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
          </Card>

          {/* مفتاح الرموز */}
          <Card>
            <CardHeader>
              <CardTitle>مفتاح الرموز</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2">
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
    </div>
  );
};

export default SnakesLaddersRoom;
