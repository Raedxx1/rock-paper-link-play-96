import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";

const snakesAndLadders = {
  ladders: { 3: 22, 5: 8, 11: 26, 20: 29 },
  snakes: { 27: 1, 21: 9, 17: 4, 19: 7 },
};

// 🟢 مصفوفة اللوحة (من 1 تحت يسار إلى 100 فوق يسار)
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
  [100, 99, 98, 97, 96, 95, 94, 93, 92, 91],
];

const SnakesLaddersRoom = () => {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [roomData, setRoomData] = useState<any>(null);
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());

  // 🟢 متابعة بيانات الغرفة
  useEffect(() => {
    if (!roomCode) return;

    const fetchRoom = async () => {
      const { data } = await supabase
        .from("snakes_ladders_rooms")
        .select("*")
        .eq("id", roomCode)
        .single();
      if (data) setRoomData(data);
    };
    fetchRoom();

    const channel = supabase
      .channel("room-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "snakes_ladders_rooms",
          filter: `id=eq.${roomCode}`,
        },
        (payload) => {
          setRoomData(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomCode]);

  // 🟢 تحديد مكان اللاعب (انضمام تلقائي)
  useEffect(() => {
    if (!roomData) return;

    if (roomData.player1_session_id === sessionId) setPlayerNumber(1);
    else if (roomData.player2_session_id === sessionId) setPlayerNumber(2);
    else if (!roomData.player1_session_id) joinGame(1);
    else if (!roomData.player2_session_id) joinGame(2);
  }, [roomData]);

  const joinGame = async (slot: number) => {
    const playerName = prompt("ادخل اسمك") || `لاعب ${slot}`;
    await supabase
      .from("snakes_ladders_rooms")
      .update({
        [`player${slot}_name`]: playerName,
        [`player${slot}_session_id`]: sessionId,
        last_move: `👤 اللاعب ${playerName} دخل مكان لاعب ${slot}`,
      })
      .eq("id", roomCode);
    setPlayerNumber(slot);
  };

  const leaveGame = async () => {
    if (!playerNumber) return;
    const name = roomData[`player${playerNumber}_name`];
    await supabase
      .from("snakes_ladders_rooms")
      .update({
        [`player${playerNumber}_name`]: null,
        [`player${playerNumber}_session_id`]: null,
        last_move: `🚪 اللاعب ${name} خرج من الغرفة`,
      })
      .eq("id", roomCode);
    navigate("/snakes-home");
  };

  // 🟢 رمي النرد
  const rollDice = async () => {
    if (!roomData || playerNumber !== roomData.current_player_index + 1) return;

    const diceValue = Math.floor(Math.random() * 6) + 1;
    const positions = roomData.player_positions || [0, 0];
    const currentPlayerIndex = roomData.current_player_index;
    const playerName = roomData[`player${currentPlayerIndex + 1}_name`];

    const prevPos = positions[currentPlayerIndex];
    let newPos = prevPos + diceValue;
    let moveMsg = `🎲 ${playerName} رمى ${diceValue} وانتقل من ${prevPos} إلى ${newPos}`;

    if (snakesAndLadders.ladders[newPos]) {
      newPos = snakesAndLadders.ladders[newPos];
      moveMsg += ` 🚀 وصعد بالسلم إلى ${newPos}`;
    } else if (snakesAndLadders.snakes[newPos]) {
      newPos = snakesAndLadders.snakes[newPos];
      moveMsg += ` 🐍 وطاح بالثعبان إلى ${newPos}`;
    }

    positions[currentPlayerIndex] = newPos;

    let newGameStatus = "in_progress";
    let winner = null;
    if (newPos >= 100) {
      newGameStatus = "finished";
      winner = playerName;
      moveMsg = `🏆 ${playerName} فاز باللعبة!`;
    }

    const nextPlayerIndex = (currentPlayerIndex + 1) % 2;

    await supabase
      .from("snakes_ladders_rooms")
      .update({
        player_positions: JSON.stringify(positions),
        current_player_index: nextPlayerIndex,
        game_status: newGameStatus,
        winner,
        dice_value: diceValue,
        last_move: moveMsg,
      })
      .eq("id", roomCode);
  };

  const resetGame = async () => {
    await supabase
      .from("snakes_ladders_rooms")
      .update({
        player_positions: JSON.stringify([0, 0]),
        current_player_index: 0,
        game_status: "waiting",
        winner: null,
        dice_value: null,
        last_move: null,
      })
      .eq("id", roomCode);
  };

  if (!roomData) return <div className="text-center p-4">⏳ جاري التحميل...</div>;

  const players = [
    { name: roomData.player1_name, color: "bg-red-500" },
    { name: roomData.player2_name, color: "bg-blue-500" },
  ];
  const positions = roomData.player_positions ? JSON.parse(roomData.player_positions) : [0, 0];

  return (
    <div className="p-4 space-y-4">
      {/* أزرار تحكم */}
      <div className="flex justify-between items-center">
        <Button onClick={() => navigate("/snakes-home")}>⬅️ العودة</Button>
        <Button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            alert("تم نسخ الرابط ✅");
          }}
        >
          📤 مشاركة الرابط
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="text-xl font-bold mb-2">🎲 لعبة السلم والثعبان</h2>
          <div className="relative w-full max-w-md mx-auto">
            {/* خلفية */}
            <img
              src="/snakes-ladders-board.jpg"
              alt="لوحة السلم والثعبان"
              className="w-full h-auto"
            />

            {/* 🟢 الخلايا */}
            {boardLayout.map((row, rowIndex) =>
              row.map((cellNumber, colIndex) => {
                const playersHere = players.filter((_, idx) => positions[idx] === cellNumber);

                const top = `${(9 - rowIndex) * 10}%`; // عكس الصفوف عشان يبدأ من تحت
                const left = `${colIndex * 10}%`;

                return (
                  <div
                    key={cellNumber}
                    className="absolute"
                    style={{ top, left, width: "10%", height: "10%" }}
                  >
                    {playersHere.length > 0 && (
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex space-x-1">
                        {playersHere.map((player, idx) => (
                          <div
                            key={idx}
                            className={`w-4 h-4 rounded-full ${player.color} border border-white`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* حالة اللعبة */}
      <div className="text-center space-y-2">
        {roomData.winner ? (
          <div className="text-lg font-bold">🏆 الفائز: {roomData.winner}</div>
        ) : (
          <>
            <div>🎯 الدور الحالي: {players[roomData.current_player_index]?.name || "---"}</div>
            {roomData.dice_value && <div>🎲 نتيجة النرد: {roomData.dice_value}</div>}
            {roomData.last_move && (
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded">{roomData.last_move}</div>
            )}
          </>
        )}
      </div>

      {/* الأزرار */}
      <div className="flex justify-center space-x-2">
        {roomData.game_status !== "finished" && (
          <Button onClick={rollDice} disabled={playerNumber !== roomData.current_player_index + 1}>
            🎲 رمي النرد
          </Button>
        )}
        <Button onClick={resetGame}>🔄 إعادة اللعبة</Button>
        <Button onClick={leaveGame} variant="destructive">
          🚪 مغادرة
        </Button>
      </div>

      {/* قائمة اللاعبين */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-bold mb-2">👥 اللاعبين</h3>
          <div className="space-y-2">
            {players.map((player, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${player.color}`} />
                  <span>{player.name || `لاعب ${index + 1}`}</span>
                </div>
                <span className="text-sm text-gray-500">لاعب {index + 1}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SnakesLaddersRoom;
