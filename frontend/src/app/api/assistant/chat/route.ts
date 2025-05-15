import { NextRequest, NextResponse } from "next/server";

interface ConversationSummary {
  id: string;
  name: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ChatRequest {
  message: string;
  conversationSummaries: ConversationSummary[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest;
    const { message, conversationSummaries } = body;

    if (!message || !conversationSummaries) {
      return new NextResponse("Bad Request", { status: 400 });
    }
    const totalMessages = conversationSummaries.reduce(
      (acc, conv) => acc + conv.messageCount,
      0
    );
    const avgMessagesPerConversation = Math.round(
      totalMessages / conversationSummaries.length
    );

    let response = "";

    if (message.toLowerCase().includes("active")) {
      const mostActive = conversationSummaries
        .sort((a, b) => b.messageCount - a.messageCount)
        .slice(0, 3);

      response = `Your most active conversations are:\n${mostActive
        .map(
          (conv) =>
            `• ${conv.name} (${
              conv.messageCount
            } messages, last updated ${new Date(
              conv.updatedAt
            ).toLocaleDateString()})`
        )
        .join("\n")}`;
    } else if (message.toLowerCase().includes("trend")) {
      const recentConversations = conversationSummaries
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )
        .slice(0, 5);

      response = `Recent conversation activity:\n${recentConversations
        .map(
          (conv) =>
            `• ${conv.name} (${conv.messageCount} messages, updated ${new Date(
              conv.updatedAt
            ).toLocaleDateString()})`
        )
        .join("\n")}`;
    } else if (message.toLowerCase().includes("insight")) {
      const conversationsByDate = conversationSummaries.reduce((acc, conv) => {
        const date = new Date(conv.updatedAt).toLocaleDateString();
        acc[date] = (acc[date] || 0) + conv.messageCount;
        return acc;
      }, {} as Record<string, number>);

      const mostActiveDay = Object.entries(conversationsByDate).sort(
        (a, b) => b[1] - a[1]
      )[0];

      response =
        `Here are some insights about your conversations:\n\n` +
        `• Total Conversations: ${conversationSummaries.length}\n` +
        `• Total Messages: ${totalMessages}\n` +
        `• Average Messages per Conversation: ${avgMessagesPerConversation}\n` +
        `• Most Active Day: ${mostActiveDay[0]} (${mostActiveDay[1]} messages)\n\n` +
        `You can ask me about specific trends, active conversations, or get more detailed insights about your messaging patterns.`;
    } else {
      response =
        `I can help you analyze your conversations. You have ${conversationSummaries.length} total conversations with an average of ${avgMessagesPerConversation} messages per conversation.\n\n` +
        `Try asking me about:\n` +
        `• Your most active conversations\n` +
        `• Recent conversation trends\n` +
        `• Key insights from your conversations`;
    }

    return NextResponse.json({ message: response });
  } catch (error) {
    console.error("Error in chat route:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
