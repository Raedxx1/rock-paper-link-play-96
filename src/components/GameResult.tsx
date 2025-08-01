
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, RotateCcw } from 'lucide-react';

type Choice = 'rock' | 'paper' | 'scissors' | null;

interface Player {
  name: string;
  choice: Choice;
}

interface GameResultProps {
  player1: Player;
  player2: Player;
  winner: 'player1' | 'player2' | 'tie' | null;
  isGameComplete?: boolean;
  gameWinner?: 'player1' | 'player2' | 'tie' | null;
  onReset: () => void;
  onGoHome: () => void;
  isCurrentPlayerHost?: boolean;
}

const GameResult = ({ player1, player2, winner, isGameComplete, gameWinner, onReset, onGoHome, isCurrentPlayerHost = false }: GameResultProps) => {
  const getChoiceEmoji = (choice: Choice) => {
    switch (choice) {
      case 'rock': return '🪨';
      case 'paper': return '📄';
      case 'scissors': return '✂️';
      default: return '❓';
    }
  };

  const getChoiceName = (choice: Choice) => {
    switch (choice) {
      case 'rock': return 'حجر';
      case 'paper': return 'ورقة';
      case 'scissors': return 'مقص';
      default: return 'غير معروف';
    }
  };

  const getResultMessage = () => {
    if (isGameComplete && gameWinner) {
      if (gameWinner === 'tie') {
        return {
          title: '🤝 انتهت اللعبة بالتعادل!',
          description: 'مباراة رائعة!',
          color: 'text-yellow-600'
        };
      }
      return {
        title: `🏆 ${gameWinner === 'player1' ? player1.name : player2.name} فاز باللعبة!`,
        description: 'الوصول لـ 3 نقاط أولاً',
        color: 'text-green-600'
      };
    }
    
    if (winner === 'tie') {
      return {
        title: '🤝 تعادل في الجولة!',
        description: 'اختاركما نفس الحركة',
        color: 'text-yellow-600'
      };
    }
    
    return {
      title: `🎉 ${winner === 'player1' ? player1.name : player2.name} فاز بالجولة!`,
      description: 'جولة رائعة!',
      color: 'text-green-600'
    };
  };

  const result = getResultMessage();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className={`text-2xl ${result.color}`}>
          🎉 النتيجة:
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Result Message */}
        <div className="text-center space-y-2">
          <h3 className={`text-xl font-bold ${result.color}`}>
            {result.title}
          </h3>
          <p className="text-gray-600">{result.description}</p>
        </div>

        {/* Players Choices */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg border-2 ${winner === 'player1' ? 'border-green-300 bg-green-50' : winner === 'tie' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="text-center space-y-2">
              <h4 className="font-semibold text-gray-800">{player1.name}</h4>
              <div className="text-4xl">{getChoiceEmoji(player1.choice)}</div>
              <p className="text-sm text-gray-600">{getChoiceName(player1.choice)}</p>
              {winner === 'player1' && (
                <div className="text-green-600 font-semibold">✅ فائز!</div>
              )}
            </div>
          </div>

          <div className={`p-4 rounded-lg border-2 ${winner === 'player2' ? 'border-green-300 bg-green-50' : winner === 'tie' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="text-center space-y-2">
              <h4 className="font-semibold text-gray-800">{player2.name}</h4>
              <div className="text-4xl">{getChoiceEmoji(player2.choice)}</div>
              <p className="text-sm text-gray-600">{getChoiceName(player2.choice)}</p>
              {winner === 'player2' && (
                <div className="text-green-600 font-semibold">✅ فائز!</div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons - فقط للاعب الأول */}
        {isCurrentPlayerHost && (
          <div className="flex gap-3 justify-center">
            <Button onClick={onReset} className="flex-1 max-w-40">
              <RotateCcw className="ml-2 h-4 w-4" />
              {isGameComplete ? 'لعبة جديدة' : 'جولة جديدة'}
            </Button>
            <Button onClick={onGoHome} variant="outline" className="flex-1 max-w-40">
              <Home className="ml-2 h-4 w-4" />
              {isGameComplete ? 'إنهاء الجلسة' : 'الرئيسية'}
            </Button>
          </div>
        )}
        
        {/* رسالة للاعب الثاني */}
        {!isCurrentPlayerHost && (
          <div className="text-center space-y-2">
            <p className="text-lg text-gray-600">⏳ في انتظار قرار {player1.name}</p>
            <p className="text-sm text-gray-500">سيتحكم اللاعب الأول في بدء الجولة التالية</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GameResult;
