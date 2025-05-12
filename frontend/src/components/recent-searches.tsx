"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SearchItem = {
  id: string;
  query: string;
  date: string;
  resultCount: number;
};

// Mock data - replace with actual data
const mockSearches: SearchItem[] = [
  {
    id: "1",
    query: "renewable energy solutions",
    date: "May 10, 2025",
    resultCount: 42,
  },
  {
    id: "2",
    query: "financial literacy for beginners",
    date: "May 8, 2025",
    resultCount: 28,
  },
  {
    id: "3",
    query: "mental health resources",
    date: "May 5, 2025",
    resultCount: 63,
  },
  {
    id: "4",
    query: "coding bootcamps comparison",
    date: "May 3, 2025",
    resultCount: 17,
  },
];

export function RecentSearches() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Searches</CardTitle>
        <CardDescription>
          Your search history from the past 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockSearches.map((search) => (
            <div
              key={search.id}
              className="flex items-center justify-between border-b pb-2"
            >
              <div>
                <p className="font-medium">{search.query}</p>
                <p className="text-sm text-muted-foreground">{search.date}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {search.resultCount} results
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
