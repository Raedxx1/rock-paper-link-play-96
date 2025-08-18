import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import GameRoom from './pages/GameRoom';
import TicTacToeRoom from './pages/TicTacToeRoom';  // صفحة إكس أو
import Index from './pages/Index';  // الصفحة الرئيسية

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/play" element={<GameRoom />} />
        <Route path="/tic-tac-toe" element={<TicTacToeRoom />} />
      </Routes>
    </Router>
  );
}

export default App;
