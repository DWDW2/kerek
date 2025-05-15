import { getConversation } from "@/server/conversations";
import { ConversationDetail } from "@/components/conversations/conversation-detail";
import { notFound } from "next/navigation";

interface ConversationPageProps {
  params: {
    id: string;
  };
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  return (
    <div className="container py-6 mx-auto">
      <div className="h-[calc(100vh-8rem)]">
        <ConversationDetail />
      </div>
    </div>
  );
}
