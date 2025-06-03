"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Gamepad2, Users, Trophy, Clock, Keyboard } from "lucide-react";
import Link from "next/link";

interface GameLauncherProps {
  conversationId: string;
  trigger?: React.ReactNode;
}

interface GameInfo {
  id: string;
  name: string;
  description: string;
  players: string;
  duration: string;
  icon: React.ReactNode;
}

const availableGames: GameInfo[] = [
  {
    id: "tic-tac-toe",
    name: "Tic Tac Toe",
    description: "Classic 3x3 grid game. Get three in a row to win!",
    players: "2 players",
    duration: "2-5 minutes",
    icon: <Trophy className="w-6 h-6" />,
  },
  {
    id: "speed-typing",
    name: "Speed Typing",
    description:
      "Race against your opponent to type the text as fast as possible!",
    players: "2 players",
    duration: "1-3 minutes",
    icon: <Keyboard className="w-6 h-6" />,
  },
];

export function GameLauncher({ conversationId, trigger }: GameLauncherProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Gamepad2 className="w-4 h-4" />
            Play Game
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gamepad2 className="w-5 h-5" />
            Choose a Game
          </DialogTitle>
          <DialogDescription>
            Select a game to play with your conversation partner
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 mt-4">
          {availableGames.map((game) => (
            <Card
              key={game.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {game.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{game.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {game.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {game.players}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {game.duration}
                    </div>
                  </div>

                  <Link
                    href={`/dashboard/conversations/${conversationId}/${game.id}`}
                  >
                    <Button
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2"
                    >
                      <Gamepad2 className="w-4 h-4" />
                      Start Game
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {availableGames.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Gamepad2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No games available at the moment.</p>
            <p className="text-sm mt-1">Check back later for new games!</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
