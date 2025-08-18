// src/index.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./index.css";

import Home from "./pages/Index";
import NotFound from "./pages/NotFound";
import GameRoom from "./pages/GameRoom";
import TicTacToeRoom from "./pages/TicTacToeRoom.tsx";

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: "/", element: <Home />, errorElement: <NotFound /> },
  { path: "/play", element: <GameRoom /> },
  { path: "/tic-tac-toe", element: <TicTacToeRoom /> },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="gaming-multiplayer-theme">
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
