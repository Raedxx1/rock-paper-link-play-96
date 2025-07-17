
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
  winner: string;
  isPlayer2: boolean;
  onResetGame: () => void;
  onGoHome: () => void;
}

const GameResult = ({ player1, player2, winner, isPlayer2, onResetGame, onGoHome }: GameResultProps) => {
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
    if (winner === 'tie') {
      return {
        title: '🤝 تعادل!',
        description: 'اختاركما نفس الحركة',
        color: 'text-yellow-600'
      };
    }
    
    const playerWon = (winner === 'player1' && !isPlayer2) || (winner === 'player2' && isPlayer2);
    
    if (playerWon) {
      return {
        title: '🎉 تهانينا! فزت!',
        description: 'أحسنت اللعب',
        color: 'text-green-600'
      };
    } else {
      return {
        title: '💔 خسرت هذه المرة',
        description: 'حظ أفضل في المرة القادمة',
        color: 'text-red-600'
      };
    }
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
              {winner === 'player1' && winner !== 'tie' && (
                <div className="text-green-600 font-semibold">✅ فائز!</div>
              )}
            </div>
          </div>

          <div className={`p-4 rounded-lg border-2 ${winner === 'player2' ? 'border-green-300 bg-green-50' : winner === 'tie' ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="text-center space-y-2">
              <h4 className="font-semibold text-gray-800">{player2.name}</h4>
              <div className="text-4xl">{getChoiceEmoji(player2.choice)}</div>
              <p className="text-sm text-gray-600">{getChoiceName(player2.choice)}</p>
              {winner === 'player2' && winner !== 'tie' && (
                <div className="text-green-600 font-semibold">✅ فائز!</div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <Button onClick={onResetGame} className="flex-1 max-w-40">
            <RotateCcw className="ml-2 h-4 w-4" />
            إعادة المباراة
          </Button>
          <Button onClick={onGoHome} variant="outline" className="flex-1 max-w-40">
            <Home className="ml-2 h-4 w-4" />
            إنهاء الجلسة
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GameResult;
