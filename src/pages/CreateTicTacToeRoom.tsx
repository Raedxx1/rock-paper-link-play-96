import { supabase } from "@/lib/supabaseClient"
import { useNavigate } from "react-router-dom"

export default function CreateTicTacToeRoom() {
  const navigate = useNavigate()

  async function createRoom() {
    const { data, error } = await supabase
      .from("tictactoe_rooms")
      .insert({})
      .select()
      .single()

    if (error) {
      console.error(error)
      return
    }

    navigate(`/tictactoe/${data.id}`)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold mb-4">إنشاء روم إكس أو</h1>
      <button
        onClick={createRoom}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg"
      >
        إنشاء روم
      </button>
    </div>
  )
}
