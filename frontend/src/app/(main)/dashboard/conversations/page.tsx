"use client";
import { useEffect, useState, useRef } from "react";
import { UserSearch } from "@/components/conversations/user-search";
import { ConversationList } from "@/components/conversations/conversation-list";
import ForceGraph2D from "react-force-graph-2d";
import { User } from "@/types/user";
interface Node {
  nodes: Partial<User>[];
  links: any[];
}
export default function ConversationsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [graphData, setGraphData] = useState<Node>({ nodes: [], links: [] });
  const graphRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch users");
        }
        const data: User[] = await response.json();
        setUsers(data);

        const nodes = data.map((user) => ({
          id: user.id,
          name: user.username,
          color: user.is_online ? "#4CAF50" : "#9E9E9E",
          val: 1,
        }));
        const links: {
          source: string;
          target: string;
          value: number;
          type?: string;
        }[] = [];
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
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();

    const intervalId = setInterval(fetchUsers, 30000);

    return () => clearInterval(intervalId);
  }, []);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (graphRef.current) {
        graphRef.current.centerAt();
        graphRef.current.zoom(1.5);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      {graphData.nodes.length > 0 && (
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeLabel="name"
          nodeColor="color"
          nodeRelSize={6}
          linkWidth={1}
          linkColor={() => "#E0E0E0"}
          cooldownTime={3000}
          onEngineStop={() => {
            if (graphRef.current) {
              graphRef.current.zoomToFit(400);
            }
          }}
          onNodeClick={(node) => {
            console.log("Selected user:", node);
          }}
        />
      )}
    </>
  );
}
