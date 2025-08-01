
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
      <p className="text-center font-medium text-gray-700 dark:text-gray-300">👇 اختر حركتك:</p>
      <div className="grid gap-3">
        {choices.map((choice) => (
          <Button
            key={choice.id}
            onClick={() => onChoice(choice.id as Choice)}
            variant="outline"
            size="lg"
            className="h-16 text-lg relative overflow-hidden group
                       hover:bg-blue-50 hover:border-blue-300 
                       dark:hover:bg-blue-900/30 dark:hover:border-blue-500
                       transition-all duration-300 ease-out
                       hover:scale-105 hover:shadow-lg
                       dark:hover:shadow-blue-500/20
                       active:scale-95 active:duration-100
                       before:absolute before:inset-0 
                       before:bg-gradient-to-r before:from-blue-400/0 before:via-blue-400/20 before:to-blue-400/0
                       dark:before:from-blue-500/0 dark:before:via-blue-500/30 dark:before:to-blue-500/0
                       before:translate-x-[-100%] before:transition-transform before:duration-700
                       hover:before:translate-x-[100%]"
          >
            <span className="text-3xl ml-3 transition-transform duration-300 group-hover:scale-110">
              {choice.emoji}
            </span>
            <span className="transition-colors duration-300">{choice.name}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default GameChoice;
