"use client";
import { useEffect, useState, useRef } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { User } from "@/types/user";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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
  const [users, setUsers] = useState<User[]>([]);
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const { user } = useAuth();
  const router = useRouter();
  const graphRef = useRef<ForceGraphMethods | null>(null);

  const createConversation = async (targetUserId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/conversations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
          },
          body: JSON.stringify({
            participant_ids: [user?.id, targetUserId],
            is_group: false,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to create conversation");
      }

      const conversation = await response.json();
      toast.success("Conversation created successfully");
      router.push(`/dashboard/conversations/${conversation.id}`);
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast.error("Failed to create conversation");
    }
  };

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
        const filteredUsers = data.filter((u) => u.id !== user?.id);
        setUsers(filteredUsers);

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
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUsers();

    const intervalId = setInterval(fetchUsers, 30000);

    return () => clearInterval(intervalId);
  }, [user?.id]);

  useEffect(() => {
    const handleResize = () => {
      if (graphRef.current) {
        graphRef.current.centerAt();
        graphRef.current.zoom(1.5);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div style={{ width: "100%", height: "100vh" }}>
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
          width={window.innerWidth}
          height={window.innerHeight}
          onEngineStop={() => {
            if (graphRef.current) {
              graphRef.current.zoomToFit(400);
            }
          }}
          onNodeClick={(node) => {
            const clickedNode = node as NodeData;
            if (clickedNode.id !== user?.id) {
              createConversation(clickedNode.id);
            }
          }}
        />
      )}
    </div>
  );
}
