-- إضافة عمود لتتبع session اللاعب الثاني
ALTER TABLE public.game_rooms 
ADD COLUMN player2_session_id TEXT DEFAULT NULL;