import React, { use } from "react";
import { TicTacToe } from "@/components/game/tic-tac-toe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Gamepad2 } from "lucide-react";

type Props = {
  params: Promise<{ id: string; game: string }>;
};

export default function GamePage({ params }: Props) {
  const { id, game } = use(params);

  const renderGame = () => {
    switch (game.toLowerCase()) {
      case "tic-tac-toe":
        return <TicTacToe conversationId={id} />;
      default:
        return (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Gamepad2 className="w-6 h-6" />
                Game Not Found
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                The game "{game}" is not available.
              </p>
              <p className="text-sm text-muted-foreground">
                Available games: Tic Tac Toe
              </p>
              <Link href={`/dashboard/conversations/${id}`}>
                <Button variant="outline" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Conversation
                </Button>
              </Link>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link href={`/dashboard/conversations/${id}`}>
            <Button variant="ghost" className="flex items-center gap-2 mb-4">
              <ArrowLeft className="w-4 h-4" />
              Back to Conversation
            </Button>
          </Link>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Game Room
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Playing:{" "}
              {game.replace("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </p>
          </div>
        </div>

        {/* Game Content */}
        {renderGame()}
      </div>
    </div>
  );
}
