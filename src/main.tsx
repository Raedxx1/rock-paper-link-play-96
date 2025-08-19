import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/ThemeProvider';
import './index.css';

import Index from './pages/Index';      // الصفحة الرئيسية مع خيارات الألعاب
import NotFound from './pages/NotFound';
import GameRoom from './pages/GameRoom'; // حجرة ورقة مقص
import TicTacToeRoom from './pages/TicTacToeRoom'; // صفحة XO
import Home from './pages/Home'; // صفحة إنشاء غرفة XO
import SnakesLaddersRoom from './pages/SnakesLaddersRoom'; // صفحة السلم والثعبان
import SnakesLaddersHome from './pages/SnakesLaddersHome'; // صفحة إنشاء غرفة السلم والثعبان

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />, // الصفحة الرئيسية مع خيارات الألعاب
    errorElement: <NotFound />,
  },
  {
    path: '/play',
    element: <GameRoom />, // حجرة ورقة مقص
  },
  {
    path: '/tic-tac-toe',
    element: <TicTacToeRoom />, // XO
  },
  {
    path: '/xo-home', // مسار منفصل لصفحة إنشاء غرفة XO
    element: <Home />,
  },
  {
    path: '/snakes-ladders', // مسار غرفة السلم والثعبان
    element: <SnakesLaddersRoom />,
  },
  {
    path: '/snakes-home', // مسار منفصل لصفحة إنشاء غرفة السلم والثعبان
    element: <SnakesLaddersHome />,
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="gaming-multiplayer-theme">
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
