import { Routes, Route } from 'react-router-dom';
import GameRoom from './pages/GameRoom';
import TicTacToeRoom from './pages/TicTacToeRoom';
import Index from './pages/Index';
import Home from './pages/Home'; // تأكد من استيراد Home

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} /> {/* استخدم Home بدلاً من Index */}
      <Route path="/play" element={<GameRoom />} />
      <Route path="/tic-tac-toe" element={<TicTacToeRoom />} />
    </Routes>
  );
}

export default App;
