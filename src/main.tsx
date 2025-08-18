// src/index.tsx أو src/main.tsx (استعمل نفس اسم الملف الموجود عندك)
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/ThemeProvider';
import './index.css';

import Index from './pages/Index';      // هذه قائمتك الرئيسية الحالية
import NotFound from './pages/NotFound';
import GameRoom from './pages/GameRoom'; // حجرة ورقة مقص
import TicTacToeRoom from './pages/TicTacToeRoom2.tsx'; // 🔥 صفحة XO الجديدة

const queryClient = new QueryClient();

const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />, // نخلي صفحتك Index هي الهوم
    errorElement: <NotFound />,
  },
  {
    path: '/play',
    element: <GameRoom />, // حجرة ورقة مقص (زي ما هو)
  },
  {
    path: '/tic-tac-toe',
    element: <TicTacToeRoom />, // ❌⭕ XO
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
