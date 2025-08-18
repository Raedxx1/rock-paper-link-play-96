// src/pages/TicTacToeRoom.tsx
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { toast } from "@/components/ui/use-toast";

export default function TicTacToeRoom() {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("r");
  const isHost = searchParams.get("host") === "true";

  const [board, setBoard] = useState(Array(9).fill(""));
  const [currentTurn, setCurrentTurn] = useState("X");

  // 📡 جلب حالة الغرفة
  useEffect(() => {
    if (!roomId) return;

    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from("tic_tac_toe_rooms")
        .select("*")
        .eq("id", roomId)
        .single();

      if (error) {
        toast({
          title: "خطأ",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data?.board) setBoard(data.board);
    };

    fetchRoom();

    // 👂 الاستماع للتغييرات
    const channel = supabase
      .channel("tic-tac-toe")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tic_tac_toe_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const newBoard = payload.new.board;
          if (newBoard) setBoard(newBoard);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // 🎮 عند الضغط على خانة
  const handleMove = async (index: number) => {
    if (board[index] !== "") return;

    const newBoard = [...board];
    newBoard[index] = currentTurn;

    setBoard(newBoard);
    setCurrentTurn(currentTurn === "X" ? "O" : "X");

    await supabase
      .from("tic_tac_toe_rooms")
      .update({ board: newBoard })
      .eq("id", roomId);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white">
      <h1 className="text-2xl font-bold mb-6">❌⭕ غرفة XO ({roomId})</h1>
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => handleMove(i)}
            className="w-20 h-20 text-3xl flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            {cell}
          </button>
        ))}
      </div>
      <p className="mt-4">🎯 الدور الحالي: {currentTurn}</p>
    </div>
  );
}
