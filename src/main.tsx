import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/ThemeProvider';
import './index.css';

import Index from './pages/Index';
import NotFound from './pages/NotFound';
import GameRoom from './pages/GameRoom';
import TicTacToeRoom from './pages/TicTacToeRoom';
import Home from './pages/Home';
import SnakesLaddersRoom from './pages/SnakesLaddersRoom';
import SnakesLaddersHome from './pages/SnakesLaddersHome';
import YoutubeChatGame from './pages/YoutubeChatGame';
import YoutubeDrawingGame from './pages/YoutubeDrawingGame'; // تأكد من إنشاء هذا الملف

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />,
    errorElement: <NotFound />,
  },
  {
    path: '/play',
    element: <GameRoom />,
  },
  {
    path: '/tic-tac-toe',
    element: <TicTacToeRoom />,
  },
  {
    path: '/xo-home',
    element: <Home />,
  },
  {
    path: '/snakes-ladders',
    element: <SnakesLaddersRoom />,
  },
  {
    path: '/youtube-chat',
    element: <YoutubeChatGame />,
  },
  {
    path: '/youtube-drawing', // المسار الجديد
    element: <YoutubeDrawingGame />,
  },
  {
    path: '/snakes-home',
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
