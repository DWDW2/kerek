"use client";

import { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";

interface User {
  id: string;
  username: string;
  email: string;
}

interface UserSearchProps {
  onUserSelect: (user: User) => void;
  placeholder?: string;
  excludeUserIds?: string[];
}

export function UserSearch({
  onUserSelect,
  placeholder = "Search users by username or email...",
  excludeUserIds = [],
}: UserSearchProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Search users function
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/users/profile/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to search users");

      const data = await response.json();
      // Filter out excluded users
      const filteredData = data.filter(
        (user: User) => !excludeUserIds.includes(user.id)
      );
      setResults(filteredData);
    } catch (error) {
      console.error("Failed to search users:", error);
      toast.error("Failed to search users. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchUsers(search);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [search, excludeUserIds]);

  const handleUserSelect = (user: User) => {
    onUserSelect(user);
    setSearch("");
    setResults([]);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {results.length > 0 && (
        <Command className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border shadow-md bg-background">
          <CommandList>
            <CommandEmpty>
              {isSearching ? "Searching..." : "No users found."}
            </CommandEmpty>
            <CommandGroup>
              {results.map((user) => (
                <CommandItem
                  key={user.id}
                  onSelect={() => handleUserSelect(user)}
                  className="flex items-center justify-between p-2 cursor-pointer"
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
                    onClick={(e) => {
                      e.preventDefault();
                      handleUserSelect(user);
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      )}
    </div>
  );
}
