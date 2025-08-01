-- Create game_rooms table for real-time Rock Paper Scissors game
CREATE TABLE public.game_rooms (
  id TEXT PRIMARY KEY,
  player1_name TEXT NOT NULL DEFAULT 'Player 1',
  player2_name TEXT,
  player1_choice TEXT CHECK (player1_choice IN ('rock', 'paper', 'scissors')),
  player2_choice TEXT CHECK (player2_choice IN ('rock', 'paper', 'scissors')),
  player1_score INTEGER NOT NULL DEFAULT 0,
  player2_score INTEGER NOT NULL DEFAULT 0,
  current_round INTEGER NOT NULL DEFAULT 1,
  game_status TEXT NOT NULL DEFAULT 'waiting' CHECK (game_status IN ('waiting', 'playing', 'round_complete', 'game_complete')),
  winner TEXT CHECK (winner IN ('player1', 'player2', 'tie')),
  round_winner TEXT CHECK (round_winner IN ('player1', 'player2', 'tie')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for this game)
CREATE POLICY "Game rooms are publicly accessible" 
ON public.game_rooms 
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime
ALTER TABLE public.game_rooms REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.game_rooms;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();