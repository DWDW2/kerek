"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface User {
  id: string;
  username: string;
  email: string;
}

export function UserSearch() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/users/profile/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to search users");

      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Failed to search users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const startConversation = async (userId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/conversations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify({
            participant_id: userId,
            name: "New Conversation",
            is_group: false,
            participant_ids: [userId],
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to create conversation");

      const conversation = await response.json();
      router.push(`/conversations/${conversation.id}`);
    } catch (error) {
      console.error("Failed to start conversation. Please try again.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Find Users</CardTitle>
        <CardDescription>
          Search for users to start a conversation with
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                searchUsers(e.target.value);
              }}
              className="pl-8"
            />
          </div>
        </div>

        {users.length > 0 && (
          <Command className="mt-2 rounded-lg border shadow-md">
            <CommandList>
              <CommandEmpty>No users found.</CommandEmpty>
              <CommandGroup>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => startConversation(user.id)}
                    className="flex items-center justify-between p-2"
                  >
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startConversation(user.id)}
                    >
                      Message
                    </Button>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </CardContent>
    </Card>
  );
}
