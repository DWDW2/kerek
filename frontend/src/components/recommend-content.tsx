"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type ContentItem = {
  id: string;
  title: string;
  description: string;
  source: string;
  date: string;
  categories: string[];
  readTime: number;
};

// Mock data - replace with actual data
const mockContent: ContentItem[] = [
  {
    id: "1",
    title: "Understanding Climate Change: A Comprehensive Guide",
    description:
      "An in-depth look at the causes and effects of climate change with actionable steps.",
    source: "Environmental Science Journal",
    date: "May 11, 2025",
    categories: ["Environment", "Science"],
    readTime: 12,
  },
  {
    id: "2",
    title: "Personal Finance in Uncertain Times",
    description:
      "Strategies for managing your finances during economic volatility.",
    source: "Financial Times",
    date: "May 10, 2025",
    categories: ["Finance", "Economy"],
    readTime: 8,
  },
  {
    id: "3",
    title: "The Evolution of AI in Healthcare",
    description:
      "How artificial intelligence is transforming patient care and medical research.",
    source: "Health Tech Today",
    date: "May 9, 2025",
    categories: ["Technology", "Health"],
    readTime: 15,
  },
];

export function RecommendedContent() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Recommended For You</h2>
      <p className="text-muted-foreground">
        Content tailored to your interests and reading history
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {mockContent.map((item) => (
          <Card key={item.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{item.title}</CardTitle>
              <div className="flex flex-wrap gap-1 pt-1">
                {item.categories.map((category) => (
                  <Badge key={category} variant="outline">
                    {category}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {item.description}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.source}</span>
                <span>{item.readTime} min read</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
