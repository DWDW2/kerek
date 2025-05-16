import { UserSearch } from "@/components/conversations/user-search";
import { ConversationList } from "@/components/conversations/conversation-list";

export default function ConversationsPage() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full">
      <div className="w-80 flex-shrink-0">
        <UserSearch />
      </div>
      <div className="flex-1">
        <ConversationList />
      </div>
    </div>
  );
}
