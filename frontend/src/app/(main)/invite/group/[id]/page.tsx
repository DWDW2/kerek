import { GroupInviteHandler } from "@/components/groups";

interface GroupInvitePageProps {
  params: {
    id: string;
  };
}

export default function GroupInvitePage({ params }: GroupInvitePageProps) {
  return (
    <div className="min-h-screen bg-background">
      <GroupInviteHandler groupId={params.id} />
    </div>
  );
}

export async function generateMetadata({ params }: GroupInvitePageProps) {
  return {
    title: "Join Group - Kerek",
    description: "Join a group on Kerek",
  };
}
