import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, ArrowLeft, RotateCcw, Users, MessageSquare, Volume2, VolumeX, UserX } from 'lucide-react';
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
  game_messages: string | null;
  last_activity_at: string;
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
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [availableSlots, setAvailableSlots] = useState<number[]>([]);
  
  const [sessionId] = useState(() => {
    const savedSessionId = localStorage.getItem(`snakes_session_${roomCode}`);
    if (savedSessionId) return savedSessionId;
    
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    if (roomCode) {
      localStorage.setItem(`snakes_session_${roomCode}`, newSessionId);
    }
    return newSessionId;
  });
  
  const [animatedPositions, setAnimatedPositions] = useState([0, 0, 0, 0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [gameMessages, setGameMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const activityTimeoutRef = useRef(null);

  // تعريف الأصوات
  const moveSound = '/sounds/move.mp3';
  const winSound = '/sounds/win.mp3';
  const ladderSound = '/sounds/ladder.mp3';
  const snakeSound = '/sounds/snake.mp3';
  const diceSound = '/sounds/dice.mp3';

  // المراجع للأصوات
  const moveSoundRef = useRef(null);
  const winSoundRef = useRef(null);
  const ladderSoundRef = useRef(null);
  const snakeSoundRef = useRef(null);
  const diceSoundRef = useRef(null);

  // تهيئة عناصر الصوت
  useEffect(() => {
    moveSoundRef.current = new Audio(moveSound);
    winSoundRef.current = new Audio(winSound);
    ladderSoundRef.current = new Audio(ladderSound);
    snakeSoundRef.current = new Audio(snakeSound);
    diceSoundRef.current = new Audio(diceSound);

    const sounds = [
      moveSoundRef.current,
      winSoundRef.current,
      ladderSoundRef.current,
      snakeSoundRef.current,
      diceSoundRef.current
    ];
    
    sounds.forEach(sound => {
      if (sound) {
        sound.volume = isMuted ? 0 : volume;
      }
    });

    // تفعيل تتبع النشاط
    const handleActivity = () => {
      if (roomCode && playerNumber) {
        updatePlayerActivity();
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  // تحديث مستوى الصوت
  useEffect(() => {
    const sounds = [
      moveSoundRef.current,
      winSoundRef.current,
      ladderSoundRef.current,
      snakeSoundRef.current,
      diceSoundRef.current
    ];
    
    sounds.forEach(sound => {
      if (sound) {
        sound.volume = isMuted ? 0 : volume;
      }
    });
  }, [volume, isMuted]);

  // تعريف السلالم والثعابين
  const snakesAndLadders = {
    ladders: {
      1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 51: 67, 80: 100, 71: 91
    },
    snakes: {
      17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 98: 79
    }
  };

  // تمرير إلى آخر رسالة
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [gameMessages]);

  // دالة مساعدة لتشغيل الأصوات
  const playSound = (soundRef, restart = true) => {
    if (isMuted || !soundRef.current) return;
    
    try {
      if (restart) {
        soundRef.current.currentTime = 0;
      }
      soundRef.current.volume = volume;
      soundRef.current.play().catch(error => {
        console.log("تشغيل الصوت فشل:", error);
      });
    } catch (error) {
      console.log("خطأ في تشغيل الصوت:", error);
    }
  };

  // إحداثيات الخلايا - تم تعديلها لتبدأ من اليسار في الأسفل
  const boardLayout = [
    [100, 99, 98, 97, 96, 95, 94, 93, 92, 91],
    [81, 82, 83, 84, 85, 86, 87, 88, 89, 90],
    [80, 79, 78, 77, 76, 75, 74, 73, 72, 71],
    [61, 62, 63, 64, 65, 66, 67, 68, 69, 70],
    [60, 59, 58, 57, 56, 55, 54, 53, 52, 51],
    [41, 42, 43, 44, 45, 46, 47, 48, 49, 50],
    [40, 39, 38, 37, 36, 35, 34, 33, 32, 31],
    [21, 22, 23, 24, 25, 26, 27, 28, 29, 30],
    [20, 19, 18, 17, 16, 15, 14, 13, 12, 11],
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  ];

  // تحديث نشاط اللاعب
  const updatePlayerActivity = async () => {
    if (!roomCode || !playerNumber) return;
    
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    
    activityTimeoutRef.current = setTimeout(async () => {
      try {
        await supabase
          .from('snakes_ladders_rooms')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('id', roomCode);
      } catch (error) {
        console.error("Error updating activity:", error);
      }
    }, 1000);
  };

  // إضافة رسالة جديدة
  const addGameMessage = async (message) => {
    if (!roomCode) return;
    
    const newMessage = {
      id: Date.now(),
      text: message,
      timestamp: new Date().toLocaleTimeString(),
      player: playerNumber ? `لاعب ${playerNumber}` : 'النظام'
    };
    
    setGameMessages(prev => [...prev, newMessage]);
    
    try {
      const { data: room } = await supabase
        .from('snakes_ladders_rooms')
        .select('game_messages')
        .eq('id', roomCode)
        .single();
      
      let currentMessages = [];
      if (room?.game_messages) {
        try {
          currentMessages = JSON.parse(room.game_messages);
        } catch (e) {
          console.error("Error parsing game messages:", e);
          currentMessages = [];
        }
      }
      
      const updatedMessages = [...currentMessages, newMessage];
      
      const { error } = await supabase
        .from('snakes_ladders_rooms')
        .update({ game_messages: JSON.stringify(updatedMessages) })
        .eq('id', roomCode);
      
      if (error) {
        console.error("Error updating game messages:", error);
      }
    } catch (error) {
      console.error("Error in addGameMessage:", error);
    }
  };

  // جلب بيانات الغرفة
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
    
    if (data.player_positions) {
      const positions = JSON.parse(data.player_positions);
      setAnimatedPositions(positions);
    }
    
    if (data.game_messages) {
      try {
        const messages = JSON.parse(data.game_messages);
        setGameMessages(messages);
      } catch (e) {
        console.error("Error parsing game messages:", e);
        setGameMessages([]);
      }
    } else {
      setGameMessages([]);
    }
    
    setLoading(false);
    determinePlayerNumber(data as SnakesLaddersRoom);
    checkForInactivePlayers(data as SnakesLaddersRoom);
  };

  // تحديد رقم اللاعب
  const determinePlayerNumber = (data: SnakesLaddersRoom) => {
    if (isHost) {
      setPlayerNumber(1);
      return;
    }

    if (data.player2_session_id === sessionId) {
      setPlayerNumber(2);
    } else if (data.player3_session_id === sessionId) {
      setPlayerNumber(3);
    } else if (data.player4_session_id === sessionId) {
      setPlayerNumber(4);
    } else {
      if (!data.player2_name || !data.player2_session_id) {
        setPlayerNumber(2);
      } else if (!data.player3_name || !data.player3_session_id) {
        setPlayerNumber(3);
      } else if (!data.player4_name || !data.player4_session_id) {
        setPlayerNumber(4);
      } else {
        setPlayerNumber(null);
      }
    }
  };

  // التحقق من اللاعبين غير النشطين
  const checkForInactivePlayers = async (data: SnakesLaddersRoom) => {
    const now = new Date();
    const inactivePlayers = [];
    const availableSlots = [];

    for (let i = 1; i <= 4; i++) {
      const playerName = data[`player${i}_name` as keyof SnakesLaddersRoom];
      const sessionId = data[`player${i}_session_id` as keyof SnakesLaddersRoom];
      
      if (playerName && sessionId) {
        if (i > 1 || !isHost) {
          const lastActivity = new Date(data.last_activity_at || data.created_at);
          const minutesInactive = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
          
          if (minutesInactive > 5) {
            inactivePlayers.push(i);
            availableSlots.push(i);
          }
        }
      } else if (!playerName && !sessionId) {
        availableSlots.push(i);
      }
    }

    setAvailableSlots(availableSlots);

    for (const playerNum of inactivePlayers) {
      try {
        await supabase
          .from('snakes_ladders_rooms')
          .update({
            [`player${playerNum}_name`]: null,
            [`player${playerNum}_session_id`]: null
          })
          .eq('id', roomCode);

        addGameMessage(`👋 اللاعب ${playerNum} غادر اللعبة بسبب عدم النشاط`);
      } catch (error) {
        console.error(`Error removing inactive player ${playerNum}:`, error);
      }
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
            
            if (newData.player_positions) {
              const positions = JSON.parse(newData.player_positions);
              setAnimatedPositions(positions);
            }
            
            if (newData.game_messages) {
              try {
                const messages = JSON.parse(newData.game_messages);
                setGameMessages(messages);
              } catch (e) {
                console.error("Error parsing game messages:", e);
              }
            }
            
            determinePlayerNumber(newData);
            checkForInactivePlayers(newData);

            if (newData.winner && (!roomData || !roomData.winner)) {
              playSound(winSoundRef);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomCode, navigate, isHost]);

  // محاكاة الحركة السلسة
  const animateMovement = (startPosition, endPosition, playerIndex, isLadderOrSnake = false) => {
    setIsAnimating(true);
    const steps = Math.abs(endPosition - startPosition);
    const direction = endPosition > startPosition ? 1 : -1;
    let currentStep = 0;

    const playMoveSound = () => {
      playSound(moveSoundRef);
    };

    playMoveSound();

    const animationInterval = setInterval(() => {
      currentStep++;
      const newPosition = startPosition + (currentStep * direction);
      
      setAnimatedPositions(prev => {
        const newPositions = [...prev];
        newPositions[playerIndex] = newPosition;
        return newPositions;
      });

      if (currentStep % 2 === 0) {
        playMoveSound();
      }

      if (currentStep >= steps) {
        clearInterval(animationInterval);
        
        if (!isLadderOrSnake) {
          setIsAnimating(false);
          const finalPosition = newPosition;
          checkForSnakeOrLadder(finalPosition, playerIndex);
        } else {
          setIsAnimating(false);
        }
      }
    }, 300);
  };

  // التحقق من وجود ثعبان أو سلم
  const checkForSnakeOrLadder = (position, playerIndex) => {
    const playerName = roomData[`player${playerIndex + 1}_name`];
    let message = "";
    let targetPosition = position;

    if (snakesAndLadders.ladders[position]) {
      targetPosition = snakesAndLadders.ladders[position];
      message = `🎉 ${playerName} صعد سلم من ${position} إلى ${targetPosition}!`;
      addGameMessage(message);
      
      toast({
        title: "🪜 صعدت سلم!",
        description: `تقدمت من المربع ${position} إلى ${targetPosition}`
      });
      
      playSound(ladderSoundRef);
      
      setTimeout(() => {
        animateMovement(position, targetPosition, playerIndex, true);
        updatePositionInDatabase(playerIndex, targetPosition);
      }, 1000);
    }
    else if (snakesAndLadders.snakes[position]) {
      targetPosition = snakesAndLadders.snakes[position];
      message = `🐍 ${playerName} وقع في ثعبان من ${position} إلى ${targetPosition}!`;
      addGameMessage(message);
      
      toast({
        title: "🐍 وقعت في ثعبان!",
        description: `تراجعت من المربع ${position} إلى ${targetPosition}`
      });
      
      playSound(snakeSoundRef);
      
      setTimeout(() => {
        animateMovement(position, targetPosition, playerIndex, true);
        updatePositionInDatabase(playerIndex, targetPosition);
      }, 1000);
    } else {
      updatePositionInDatabase(playerIndex, position);
    }
  };

  // تحديث الموضع في قاعدة البيانات
  const updatePositionInDatabase = async (playerIndex, newPosition) => {
    if (!roomCode || !roomData) return;

    const positions = JSON.parse(roomData.player_positions || '[0,0,0,0]');
    positions[playerIndex] = newPosition;
    
    let newGameStatus = roomData.game_status;
    let winner = null;
    
    if (newPosition >= 100) {
      positions[playerIndex] = 100;
      newGameStatus = 'finished';
      winner = roomData[`player${playerIndex + 1}_name`];
      
      const winMessage = `🎉 ${winner} فاز باللعبة!`;
      addGameMessage(winMessage);
      
      playSound(winSoundRef);
    }
    
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
        winner: winner,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', roomCode);

    if (error) {
      console.error("Error updating position:", error);
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
        game_status: 'playing',
        last_activity_at: new Date().toISOString()
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في الانضمام",
        description: "حاول مرة أخرى",
        variant: "destructive"
      });
      return;
    }

    localStorage.setItem(`snakes_session_${roomCode}`, sessionId);

    addGameMessage(`🎮 ${playerName.trim()} انضم إلى اللعبة كلاعب ${playerNumber}!`);

    toast({
      title: "✅ تم الانضمام بنجاح!",
      description: "مرحباً بك في اللعبة"
    });
  };

  // دالة لمغادرة اللاعب
  const leaveGame = async () => {
    if (!roomCode || !playerNumber) return;

    try {
      const updateField = `player${playerNumber}_name`;
      const sessionField = `player${playerNumber}_session_id`;
      
      await supabase
        .from('snakes_ladders_rooms')
        .update({
          [updateField]: null,
          [sessionField]: null,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', roomCode);

      addGameMessage(`👋 ${playerName} غادر اللعبة`);

      localStorage.removeItem(`snakes_session_${roomCode}`);
      
      toast({
        title: "👋 وداعاً!",
        description: "تم مغادرة اللعبة بنجاح"
      });

      navigate('/snakes-home');
    } catch (error) {
      console.error("Error leaving game:", error);
    }
  };

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
    
    const playerName = roomData[`player${currentPlayerIndex + 1}_name`];
    const rollMessage = `🎲 ${playerName} رمى النرد وحصل على ${diceValue}!`;
    addGameMessage(rollMessage);
    
    playSound(diceSoundRef);
    
    await supabase
      .from('snakes_ladders_rooms')
      .update({ 
        dice_value: diceValue,
        last_activity_at: new Date().toISOString()
      })
      .eq('id', roomCode);

    animateMovement(currentPosition, newPosition, currentPlayerIndex);
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
        dice_value: null,
        game_messages: JSON.stringify([]),
        last_activity_at: new Date().toISOString()
      })
      .eq('id', roomCode);

    if (error) {
      toast({
        title: "❌ خطأ في إعادة اللعبة",
        description: "حاول مرة أخرى",
        variant: "destructive"
      });
    } else {
      setGameMessages([]);
      setAnimatedPositions([0, 0, 0, 0]);
      
      addGameMessage("🔄 تم إعادة تشغيل اللعبة!");
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
  if (roomData.player4_name && !isHost && playerNumber === null && availableSlots.length === 0) {
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
            <Button 
              onClick={() => navigate('/snakes-home')} 
              variant="outline" 
              className="w-full"
            >
              <ArrowLeft className="ml-2 h-4 w-4" />
              العودة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const positions = JSON.parse(roomData.player_positions || '[0,0,0,0]');
  const players = [
    { name: roomData.player1_name, position: animatedPositions[0], active: !!roomData.player1_name, color: 'bg-red-500', emoji: '🔴' },
    { name: roomData.player2_name, position: animatedPositions[1], active: !!roomData.player2_name, color: 'bg-blue-500', emoji: '🔵' },
    { name: roomData.player3_name, position: animatedPositions[2], active: !!roomData.player3_name, color: 'bg-green-500', emoji: '🟢' },
    { name: roomData.player4_name, position: animatedPositions[3], active: !!roomData.player4_name, color: 'bg-yellow-500', emoji: '🟡' },
  ];

  const activePlayers = players.filter(player => player.active);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 dark:from-gray-900 dark:to-gray-800 p-4" dir="rtl">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* العمود الأيسر - معلومات اللعبة */}
        <div className="lg:col-span-2 space-y-6">
          {/* شريط التنقل */}
          <div className="flex justify-between items-center">
            <Button 
              onClick={leaveGame} 
              variant="outline" 
              size="sm"
            >
              <ArrowLeft className="ml-2 h-4 w-4" />
              مغادرة اللعبة
            </Button>
            
            <div className="flex items-center space-x-2">
              {/* عناصر التحكم في الصوت */}
              <Button 
                onClick={() => setIsMuted(!isMuted)} 
                variant="outline" 
                size="sm"
                title={isMuted ? "تشغيل الصوت" : "كتم الصوت"}
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              
              {!isMuted && (
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-20"
                  title="مستوى الصوت"
                />
              )}
            
              {(isHost || playerNumber === 1) && (
                <Button onClick={shareRoom} variant="outline" size="sm">
                  <Copy className="ml-2 h-4 w-4" />
                  مشاركة الرابط
                </Button>
              )}
            </div>
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

                {availableSlots.length > 0 && (
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      <UserX className="inline ml-1 h-4 w-4" />
                      {availableSlots.length} أماكن متاحة للانضمام
                    </p>
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
                        player.active && Math.floor(player.position) === cellNumber
                      );
                      
                      const isLadder = hasLadder(cellNumber);
                      const isSnake = hasSnake(cellNumber);
                      
                      return (
                        <div
                          key={cellNumber}
                          className="relative"
                          style={{ 
                            gridRow: rowIndex + 1,
                            gridColumn: colIndex + 1
                          }}
                        >
                          {/* عرض اللاعبين على الخلية */}
                          {playersHere.length > 0 && (
                            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-wrap justify-center gap-1">
                              {playersHere.map((player, idx) => {
                                const playerIdx = players.findIndex(p => p.name === player.name);
                                return (
                                  <div
                                    key={idx}
                                    className={`w-8 h-8 rounded-full ${player.color} border-2 border-white flex items-center justify-center text-white font-bold text-xs`}
                                    title={player.name}
                                  >
                                    {playerIdx + 1}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* عرض أيقونات السلالم والثعابين */}
                          {(isLadder || isSnake) && (
                            <div className={`absolute bottom-0 right-0 text-xl ${isLadder ? 'text-green-600' : 'text-red-600'}`} 
                              title={isLadder ? 
                                `سلم إلى ${snakesAndLadders.ladders[cellNumber as keyof typeof snakesAndLadders.ladders]}` : 
                                `ثعبان إلى ${snakesAndLadders.snakes[cellNumber as keyof typeof snakesAndLadders.snakes]}`}>
                              {isLadder ? '🪜' : '🐍'}
                            </div>
                          )}
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
