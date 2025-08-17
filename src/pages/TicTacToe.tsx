import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useParams } from "react-router-dom"

type Player = "X" | "O" | ""

// البيانات من قاعدة البيانات
type RoomData = {
  id: string
  board: string
  current_player: Player
  winner: Player | null
}

export default function TicTacToe() {
  const { roomId } = useParams()
  const [room, setRoom] = useState<RoomData | null>(null)
  const [loading, setLoading] = useState(true)

  // جلب حالة الغرفة
  useEffect(() => {
    async function fetchRoom() {
      const { data, error } = await supabase
        .from("tictactoe_rooms")
        .select("*")
        .eq("id", roomId)
        .single()

      if (error) console.error(error)
      else setRoom(data)

      setLoading(false)
    }
    fetchRoom()

    // استماع لتغييرات الـ Realtime
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tictactoe_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          setRoom(payload.new as RoomData)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  if (loading) return <p>Loading...</p>
  if (!room) return <p>Room not found</p>

  const board = JSON.parse(room.board) as Player[]

  async function handleClick(index: number) {
    if (board[index] || room.winner) return

    board[index] = room.current_player
    const winner = checkWinner(board)
    const nextPlayer = room.current_player === "O" ? "X" : "O"

    await supabase
      .from("tictactoe_rooms")
      .update({
        board: JSON.stringify(board),
        current_player: winner ? room.current_player : nextPlayer,
        winner: winner,
      })
      .eq("id", roomId)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">لعبة إكس أو</h1>

      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            className="w-20 h-20 flex items-center justify-center text-2xl font-bold border rounded-lg
                       bg-white text-black dark:bg-gray-800 dark:text-white"
          >
            {cell}
          </button>
        ))}
      </div>

      {room.winner && (
        <p className="mt-4 text-lg font-semibold">Winner: {room.winner}</p>
      )}
    </div>
  )
}

function checkWinner(board: Player[]): Player | null {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ]
  for (let [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a]
    }
  }
  return null
}
