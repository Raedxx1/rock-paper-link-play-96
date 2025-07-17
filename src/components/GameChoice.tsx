
import { Button } from '@/components/ui/button';

type Choice = 'rock' | 'paper' | 'scissors';

interface GameChoiceProps {
  onChoice: (choice: Choice) => void;
}

const GameChoice = ({ onChoice }: GameChoiceProps) => {
  const choices = [
    { id: 'rock', emoji: '🪨', name: 'حجر' },
    { id: 'paper', emoji: '📄', name: 'ورقة' },
    { id: 'scissors', emoji: '✂️', name: 'مقص' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-center font-medium text-gray-700">👇 اختر حركتك:</p>
      <div className="grid gap-3">
        {choices.map((choice) => (
          <Button
            key={choice.id}
            onClick={() => onChoice(choice.id as Choice)}
            variant="outline"
            size="lg"
            className="h-16 text-lg hover:bg-blue-50 hover:border-blue-300 transition-all"
          >
            <span className="text-3xl ml-3">{choice.emoji}</span>
            {choice.name}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default GameChoice;
