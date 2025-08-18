import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { db } from '@/firebase-config';  // استيراد إعدادات Firebase
import { doc, getDoc, updateDoc, setDoc, onSnapshot } from 'firebase/firestore';

const TicTacToeRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roomCode = searchParams.get('r');  // الحصول على رمز الغرفة من الرابط
  const isHost = searchParams.get('host') === 'true';  // التأكد إذا كنت المضيف

  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true); // حالة التحميل
  const board = useMemo(() => room ? JSON.parse(room.board) : Array(9).fill(''), [room]);

  // جلب بيانات الغرفة من Firebase
  useEffect(() => {
    const fetchRoomData = async () => {
      if (!roomCode) {
        toast({
          title: '❌ خطأ في الرابط',
          description: 'رمز الغرفة غير موجود',
          variant: 'destructive',
        });
        setLoading(false); // إيقاف التحميل إذا كان الرابط خاطئًا
        return;
      }

      setLoading(true);
      try {
        const roomRef = doc(db, 'tic_tac_toe_rooms', roomCode);
        const roomSnap = await getDoc(roomRef);

        if (roomSnap.exists()) {
          setRoom(roomSnap.data());
        } else {
          toast({
            title: '❌ الغرفة غير موجودة',
            description: 'تأكد من صحة الرابط أو أن الغرفة موجودة',
            variant: 'destructive',
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching room data:', error);
        toast({
          title: '❌ خطأ في الاتصال',
          description: 'فشل في تحميل البيانات من السيرفر',
          variant: 'destructive',
        });
        setLoading(false);
      }
    };

    fetchRoomData();  // جلب البيانات عند تحميل الصفحة

    // الاشتراك في التحديثات الفورية باستخدام Firestore
    const unsub = onSnapshot(doc(db, 'tic_tac_toe_rooms', roomCode), (docSnapshot) => {
      setRoom(docSnapshot.data());
    });

    return () => unsub();  // تنظيف الاشتراك عند الخروج من الصفحة
  }, [roomCode]);

  // دالة اختيار الحركة
  const playAt = async (index: number) => {
    if (!room || !roomCode) return;
    if (room.winner) return;

    const currentPlayer = isHost ? 'X' : 'O';
    const updatedBoard = [...board];
    if (updatedBoard[index]) return;  // إذا كانت الخانة مشغولة

    updatedBoard[index] = currentPlayer;
    const winner = checkWinner(updatedBoard);

    await updateDoc(doc(db, 'tic_tac_toe_rooms', roomCode), {
      board: JSON.stringify(updatedBoard),
      current_player: winner ? (winner === 'X' ? 'O' : 'X') : room.current_player,
      winner,
    });
  };

  // التحقق من الفائز
  const checkWinner = (board: string[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // الصفوف
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // الأعمدة
      [0, 4, 8], [2, 4, 6],           // القطرين
    ];
    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
    }
    return board.every(cell => cell) ? 'tie' : null;
  };

  // دالة إعادة تعيين الجولة
  const resetRound = async () => {
    if (!roomCode) return;

    await updateDoc(doc(db, 'tic_tac_toe_rooms', roomCode), {
      board: JSON.stringify(Array(9).fill('')),
      winner: null,
      current_player: 'X',
    });
  };

  // عرض الغرفة
  if (loading) {
    return <div>جارٍ التحميل...</div>;
  }

  return (
    <div className="game-room">
      {/* لوحة اللعبة */}
      <div className="board">
        {board.map((cell, index) => (
          <Button key={index} onClick={() => playAt(index)}>
            {cell}
          </Button>
        ))}
      </div>

      {/* إعادة تعيين الجولة */}
      <Button onClick={resetRound}>إعادة الجولة</Button>

      {room?.winner && <div>الفائز: {room.winner}</div>}
    </div>
  );
};

export default TicTacToeRoom;
