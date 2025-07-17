
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const navigate = useNavigate();
  const [roomLink, setRoomLink] = useState<string>('');

  const generateRoomCode = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'rps-';
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createNewGame = () => {
    const roomCode = generateRoomCode();
    const link = `${window.location.origin}/play?r=${roomCode}`;
    setRoomLink(link);
    
    // حفظ بيانات الغرفة في localStorage (مؤقتاً)
    const roomData = {
      player1: {
        name: "مجهول",
        choice: null
      },
      player2: null,
      gameStarted: false,
      winner: null
    };
    localStorage.setItem(`room_${roomCode}`, JSON.stringify(roomData));
    
    toast({
      title: "🎉 تم إنشاء الغرفة بنجاح!",
      description: "شارك الرابط مع صديقك لبدء اللعب",
    });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
      toast({
        title: "✅ تم نسخ الرابط!",
        description: "يمكنك الآن مشاركته مع أصدقائك",
      });
    } catch (err) {
      toast({
        title: "❌ فشل في نسخ الرابط",
        description: "حاول نسخه يدوياً",
        variant: "destructive"
      });
    }
  };

  const joinGame = () => {
    if (roomLink) {
      window.open(roomLink, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">🪨📄✂️</h1>
          <h2 className="text-2xl font-bold text-gray-800">حجرة ورقة مقص</h2>
          <p className="text-gray-600">العب مع أصدقائك أونلاين!</p>
        </div>

        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle>إنشاء لعبة جديدة</CardTitle>
            <CardDescription>
              أنشئ غرفة جديدة وشارك الرابط مع صديقك
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={createNewGame} 
              className="w-full text-lg py-6"
              size="lg"
            >
              <Plus className="ml-2 h-5 w-5" />
              🆕 إنشاء لعبة جديدة
            </Button>

            {roomLink && (
              <div className="space-y-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">
                  🔗 رابط الغرفة:
                </p>
                <div className="bg-white p-3 rounded border text-sm break-all text-gray-700">
                  {roomLink}
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={copyLink} 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                  >
                    <Copy className="ml-1 h-4 w-4" />
                    نسخ الرابط
                  </Button>
                  <Button 
                    onClick={joinGame} 
                    size="sm" 
                    className="flex-1"
                  >
                    دخول الغرفة
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500 space-y-1">
          <p>💡 نصيحة: شارك الرابط مع صديقك لبدء اللعب</p>
          <p>🎮 يمكن لشخصين فقط اللعب في كل غرفة</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
