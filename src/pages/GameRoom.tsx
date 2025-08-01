
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from '@/hooks/use-toast';
import { Home, RotateCcw, Copy } from 'lucide-react';
import GameChoice from '@/components/GameChoice';
import GameResult from '@/components/GameResult';

type Choice = 'rock' | 'paper' | 'scissors' | null;

interface Player {
  name: string;
  choice: Choice;
}

interface RoomData {
  player1: Player;
  player2: Player | null;
  gameStarted: boolean;
  winner: string | null;
}

const GameRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get('r');
  const isHost = searchParams.get('host') === 'true';
  
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [isPlayer2, setIsPlayer2] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [roomFull, setRoomFull] = useState(false);

  useEffect(() => {
    if (!roomCode) {
      navigate('/');
      return;
    }

    const savedRoom = localStorage.getItem(`room_${roomCode}`);
    if (!savedRoom) {
      toast({
        title: "❌ غرفة غير موجودة",
        description: "هذه الغرفة غير موجودة أو انتهت صلاحيتها",
        variant: "destructive"
      });
      navigate('/');
      return;
    }

    const room: RoomData = JSON.parse(savedRoom);
    setRoomData(room);

    // تحديد دور اللاعب
    if (isHost) {
      // مضيف الغرفة - اللاعب الأول
      setIsPlayer2(false);
      setShowNameInput(false);
    } else if (!room.player2) {
      // لاعب ثاني جديد
      setShowNameInput(true);
      setIsPlayer2(true);
    } else {
      // الغرفة ممتلئة
      setRoomFull(true);
    }
  }, [roomCode, navigate]);

  const joinAsPlayer2 = () => {
    if (!playerName.trim()) {
      toast({
        title: "❌ اسم مطلوب",
        description: "يرجى إدخال اسمك للانضمام",
        variant: "destructive"
      });
      return;
    }

    const updatedRoom = {
      ...roomData!,
      player2: {
        name: playerName.trim(),
        choice: null
      }
    };

    setRoomData(updatedRoom);
    localStorage.setItem(`room_${roomCode}`, JSON.stringify(updatedRoom));
    setShowNameInput(false);
    
    toast({
      title: "✅ انضممت للغرفة!",
      description: "ابدأ باختيار حركتك",
    });
  };

  const makeChoice = (choice: Choice) => {
    if (!roomData) return;

    const updatedRoom = { ...roomData };
    
    if (isPlayer2) {
      updatedRoom.player2!.choice = choice;
    } else {
      updatedRoom.player1.choice = choice;
    }

    // تحديد الفائز إذا اختار كلا اللاعبين
    if (updatedRoom.player1.choice && updatedRoom.player2?.choice) {
      updatedRoom.winner = determineWinner(updatedRoom.player1.choice, updatedRoom.player2.choice);
      updatedRoom.gameStarted = true;
    }

    setRoomData(updatedRoom);
    localStorage.setItem(`room_${roomCode}`, JSON.stringify(updatedRoom));
  };

  const determineWinner = (choice1: Choice, choice2: Choice): string => {
    if (choice1 === choice2) return 'tie';
    
    const winConditions = {
      rock: 'scissors',
      paper: 'rock',
      scissors: 'paper'
    };

    return winConditions[choice1 as keyof typeof winConditions] === choice2 ? 'player1' : 'player2';
  };

  const resetGame = () => {
    const resetRoom = {
      ...roomData!,
      player1: { ...roomData!.player1, choice: null },
      player2: roomData!.player2 ? { ...roomData!.player2, choice: null } : null,
      gameStarted: false,
      winner: null
    };

    setRoomData(resetRoom);
    localStorage.setItem(`room_${roomCode}`, JSON.stringify(resetRoom));
  };

  const goHome = () => {
    navigate('/');
  };

  if (roomFull && !isPlayer2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">❌ غرفة ممتلئة</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert>
              <AlertDescription>
                ❌ لا يمكن الانضمام. الغرفة ممتلئة بالفعل.
              </AlertDescription>
            </Alert>
            <Button onClick={goHome} className="w-full">
              <Home className="ml-2 h-4 w-4" />
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showNameInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>✍️ أدخل اسمك للانضمام</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="اسمك..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && joinAsPlayer2()}
            />
            <Button onClick={joinAsPlayer2} className="w-full">
              انضمام للعبة
            </Button>
            <Button onClick={goHome} variant="outline" className="w-full">
              <Home className="ml-2 h-4 w-4" />
              العودة للرئيسية
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!roomData) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">🪨📄✂️ حجرة ورقة مقص</h1>
          <p className="text-gray-600">الغرفة: {roomCode}</p>
        </div>

        {/* Game Result */}
        {roomData.gameStarted && roomData.winner && (
          <GameResult 
            player1={roomData.player1}
            player2={roomData.player2!}
            winner={roomData.winner}
            isPlayer2={isPlayer2}
            onResetGame={resetGame}
            onGoHome={goHome}
          />
        )}

        {/* Game Area */}
        {!roomData.gameStarted && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Player 1 */}
            <Card className={`${!isPlayer2 ? 'ring-2 ring-blue-500' : ''}`}>
              <CardHeader className="text-center">
                <CardTitle>🎮 اللاعب الأول</CardTitle>
                <p className="text-lg font-semibold">{roomData.player1.name}</p>
              </CardHeader>
              <CardContent>
                {!isPlayer2 && roomData.player2?.choice && !roomData.player1.choice ? (
                  <GameChoice onChoice={makeChoice} />
                ) : (
                  <div className="text-center p-8">
                    {roomData.player1.choice ? (
                      <div className="text-4xl">
                        {roomData.player1.choice === 'rock' && '🪨'}
                        {roomData.player1.choice === 'paper' && '📄'}
                        {roomData.player1.choice === 'scissors' && '✂️'}
                      </div>
                    ) : (
                      <div className="text-gray-400">
                        {isPlayer2 ? 'في انتظار اختيار اللاعب الأول...' : 'في انتظار اختيار اللاعب الثاني...'}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Player 2 */}
            <Card className={`${isPlayer2 ? 'ring-2 ring-green-500' : ''}`}>
              <CardHeader className="text-center">
                <CardTitle>🎮 اللاعب الثاني</CardTitle>
                <p className="text-lg font-semibold">
                  {roomData.player2?.name || 'في انتظار لاعب...'}
                </p>
              </CardHeader>
              <CardContent>
                {roomData.player2 ? (
                  isPlayer2 && !roomData.player2.choice ? (
                    <GameChoice onChoice={makeChoice} />
                  ) : (
                    <div className="text-center p-8">
                      {roomData.player2.choice ? (
                        <div className="text-4xl">
                          {roomData.player2.choice === 'rock' && '🪨'}
                          {roomData.player2.choice === 'paper' && '📄'}
                          {roomData.player2.choice === 'scissors' && '✂️'}
                        </div>
                      ) : (
                        <div className="text-gray-400">
                          {isPlayer2 ? 'اختر حركتك أولاً!' : 'في انتظار اختيار اللاعب الثاني...'}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className="text-center p-8 text-gray-400">
                    في انتظار انضمام لاعب ثاني...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Share Room Link for Host */}
        {!isPlayer2 && !roomData.player2 && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-4">
              <div className="text-center space-y-3">
                <p className="text-sm font-medium text-blue-800">
                  🔗 شارك هذا الرابط مع صديقك للانضمام:
                </p>
                <div className="bg-gray-100 p-3 rounded text-sm break-all text-gray-700">
                  {`${window.location.origin}/play?r=${roomCode}`}
                </div>
                <Button 
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(`${window.location.origin}/play?r=${roomCode}`);
                      toast({
                        title: "✅ تم نسخ الرابط!",
                        description: "يمكنك الآن مشاركته مع صديقك",
                      });
                    } catch {
                      toast({
                        title: "❌ فشل في نسخ الرابط",
                        description: "حاول نسخه يدوياً",
                        variant: "destructive"
                      });
                    }
                  }}
                  variant="outline" 
                  size="sm"
                >
                  <Copy className="ml-1 h-4 w-4" />
                  نسخ الرابط
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Controls */}
        <div className="flex justify-center gap-4">
          <Button onClick={goHome} variant="outline">
            <Home className="ml-2 h-4 w-4" />
            العودة للرئيسية
          </Button>
          {roomData.player2 && (
            <Button onClick={resetGame} variant="outline">
              <RotateCcw className="ml-2 h-4 w-4" />
              إعادة تعيين
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameRoom;
