import { ConversationDetail } from "@/components/conversations/conversation-detail";

interface ConversationPageProps {
  params: {
    id: string;
  };
}

export default async function ConversationPage({
  params,
}: ConversationPageProps) {
  return (
    <div className="flex h-full w-full">
      <div className="flex-1 flex flex-col">
        <ConversationDetail />
      </div>
    </div>
  );
}
