"use client";
import { useEffect, useState, useRef } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { useAuth } from "@/lib/auth-context";
import MessagesSidebar from "@/components/conversations/messages-sidebar";
import { useConversation } from "@/hooks/use-conversation";
import { useUser } from "@/hooks/use-user";

interface NodeData {
  id: string;
  name: string;
  color: string;
  val: number;
}

interface LinkData {
  source: string;
  target: string;
  value: number;
  type?: string;
}

interface GraphData {
  nodes: NodeData[];
  links: LinkData[];
}

export default function ConversationsPage() {
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const { user } = useAuth();
  const graphRef = useRef<ForceGraphMethods | null>(null);
  const { createConversation, conversations, isFetching } = useConversation();
  const { users, isFetchingUsers } = useUser();
  useEffect(() => {
    if (user) {
      const filteredUsers = users.filter((u) => u.id !== user?.id);

      const nodes: NodeData[] = filteredUsers.map((user) => ({
        id: user.id,
        name: user.username,
        color: user.is_online ? "#4CAF50" : "#9E9E9E",
        val: 1,
      }));

      const links: LinkData[] = [];
      nodes.forEach((node, index) => {
        const numConnections = Math.floor(Math.random() * 3) + 1;
        for (let i = 0; i < numConnections; i++) {
          const targetIndex = Math.floor(Math.random() * nodes.length);
          if (targetIndex !== index) {
            links.push({
              source: node.id,
              target: nodes[targetIndex].id,
              value: Math.random() * 0.5 + 0.5,
            });
          }
        }
      });
      setGraphData({ nodes, links });
    }
  }, [user, users]);

  useEffect(() => {
    const handleResize = () => {
      if (graphRef.current) {
        graphRef.current.centerAt();
        graphRef.current.zoom(1);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section className="flex flex-row h-full">
      <div className="flex-1 p-4 h-full flex flex-col">
        <div className="font-bold text-xl">Explore Neighborhood</div>
        <div className="flex-1 relative h-fit w-fit">
          {graphData.nodes.length > 0 && !isFetchingUsers && (
            <ForceGraph2D
              graphData={graphData}
              nodeLabel="name"
              nodeColor="color"
              nodeRelSize={6}
              linkWidth={1}
              linkColor={() => "#E0E0E0"}
              cooldownTime={3000}
              width={window.innerWidth * 0.6}
              height={window.innerHeight}
              onNodeClick={(node) => {
                const clickedNode = node as NodeData;
                if (clickedNode.id !== user?.id) {
                  createConversation({
                    participant_ids: [user?.id!, clickedNode.id],
                    is_group: false,
                    name: `${user?.username} and ${clickedNode.name}'s conversation`,
                  });
                }
              }}
            />
          )}
        </div>
      </div>
      <MessagesSidebar conversations={conversations} />
    </section>
  );
}
