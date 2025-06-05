"use client";
import { useEffect, useState, useRef } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { useAuth } from "@/context/auth-context";
import { useConversation } from "@/hooks/use-conversation";
import { useUser } from "@/hooks/use-user";
import { useIsMobile } from "@/hooks/use-mobile";

interface NodeData {
  id: string;
  name: string;
  color: string;
  val: number;
  user: {
    username: string;
    profile_image_url?: string;
    is_online: boolean;
    home_country?: string;
    language?: string;
    project_building?: string;
    interests?: string;
  };
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
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { createConversation } = useConversation();
  const { users, isFetchingUsers } = useUser();

  useEffect(() => {
    if (user) {
      const filteredUsers = users.filter((u) => u.id !== user?.id);
      const nodes: NodeData[] = filteredUsers.map((userData) => ({
        id: userData.id,
        name: userData.username,
        color: userData.is_online ? "#4CAF50" : "#9E9E9E",
        val: userData.is_online ? 8 : 6,
        user: {
          username: userData.username,
          profile_image_url: userData.profile_image_url,
          is_online: userData.is_online,
          home_country: userData.home_country,
          language: userData.language,
          project_building: userData.project_building,
          interests: userData.interests,
        },
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
        setTimeout(() => {
          graphRef.current?.centerAt();
          graphRef.current?.zoom(1);
        }, 100);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const drawNode = (node: any, ctx: CanvasRenderingContext2D) => {
    const size = node.val || 6;
    const nodeData = node as NodeData;

    if (nodeData.user.is_online) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI);
      ctx.fillStyle = "#4CAF50";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = nodeData.color;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = `${size * 0.6}px Sans-Serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      nodeData.user.username[0]?.toUpperCase() || "U",
      node.x,
      node.y
    );
  };

  return (
    <section ref={containerRef} className="flex flex-row h-full relative">
      <div className="p-4 h-full flex flex-col transition-all duration-150 ease-out">
        <div className="font-bold text-xl mb-4">Explore Neighborhood</div>
        <div className="flex-1 relative overflow-hidden">
          {graphData.nodes.length > 0 && !isFetchingUsers && (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              nodeCanvasObject={drawNode}
              nodeRelSize={6}
              linkWidth={1}
              linkColor={() => "#E0E0E0"}
              width={isMobile ? window.innerWidth : 500}
              height={isMobile ? window.innerHeight : 500}
              cooldownTime={3000}
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
    </section>
  );
}
