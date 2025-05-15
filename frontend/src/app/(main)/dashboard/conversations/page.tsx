import { UserSearch } from "@/components/conversations/user-search";
import { ConversationList } from "@/components/conversations/conversation-list";

export default function ConversationsPage() {
  return (
    <div className="container py-6 space-y-6 mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <UserSearch />
        </div>
        <div className="md:col-span-2">
          <ConversationList />
        </div>
      </div>
    </div>
  );
}
