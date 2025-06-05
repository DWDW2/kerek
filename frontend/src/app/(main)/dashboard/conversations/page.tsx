"use client";
import { useEffect, useState, useRef } from "react";
import ForceGraph2D, { ForceGraphMethods } from "react-force-graph-2d";
import { useAuth } from "@/context/auth-context";
import MessagesSidebar from "@/components/conversations/messages-sidebar";
import { useConversation } from "@/hooks/use-conversation";
import { useUser } from "@/hooks/use-user";
import { useResizePanels } from "@/hooks/use-resize-panels";
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
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { createConversation, conversations } = useConversation();
  const { users, isFetchingUsers } = useUser();

  const { leftWidth, rightWidth, isResizing, handleMouseDown } =
    useResizePanels({
      containerRef,
      initialLeftWidth: 60,
      minWidth: 20,
      maxWidth: 80,
    });

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
    const handleMouseMoveForTooltip = (event: MouseEvent) => {
      setTooltipPos({ x: event.clientX, y: event.clientY });
    };

    if (selectedNode) {
      document.addEventListener("mousemove", handleMouseMoveForTooltip);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMoveForTooltip);
    };
  }, [selectedNode]);

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
  }, [leftWidth]);

  const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
  const graphWidth = (containerWidth * leftWidth) / 100 - 32;

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
      <div
        className="p-4 h-full flex flex-col transition-all duration-150 ease-out"
        style={{ width: `${leftWidth}%` }}
      >
        <div className="font-bold text-xl mb-4">Explore Neighborhood</div>
        <div className="flex-1 relative">
          {graphData.nodes.length > 0 && !isFetchingUsers && (
            <ForceGraph2D
              ref={graphRef}
              graphData={graphData}
              nodeCanvasObject={drawNode}
              nodeRelSize={6}
              linkWidth={1}
              linkColor={() => "#E0E0E0"}
              cooldownTime={3000}
              width={graphWidth}
              height={window.innerHeight - 100}
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
              onNodeHover={(node, prevNode) => {
                if (node) {
                  setSelectedNode(node as NodeData);
                } else {
                  setSelectedNode(null);
                }
              }}
              onNodeDrag={(node) => {
                setSelectedNode(null);
              }}
            />
          )}

          {selectedNode && (
            <div
              className="absolute bg-white border border-gray-200 rounded-lg shadow-lg p-4 pointer-events-none z-10 max-w-xs"
              style={{
                left: tooltipPos.x + 10,
                top: tooltipPos.y - 10,
                transform: "translate(-200%, -100%)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold">
                    {selectedNode.user.username[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm">
                    {selectedNode.user.username}
                  </h3>
                  <div className="flex items-center gap-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        selectedNode.user.is_online
                          ? "bg-green-400"
                          : "bg-gray-400"
                      }`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {selectedNode.user.is_online ? "Online" : "Offline"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {selectedNode.user.home_country && (
                  <div>
                    <span className="font-medium">Location:</span>{" "}
                    <span className="text-muted-foreground">
                      {selectedNode.user.home_country}
                    </span>
                  </div>
                )}

                {selectedNode.user.language && (
                  <div>
                    <span className="font-medium">Language:</span>{" "}
                    <span className="text-muted-foreground">
                      {selectedNode.user.language.toUpperCase()}
                    </span>
                  </div>
                )}

                {selectedNode.user.project_building && (
                  <div>
                    <span className="font-medium">Building:</span>{" "}
                    <span className="text-muted-foreground">
                      {selectedNode.user.project_building}
                    </span>
                  </div>
                )}

                {selectedNode.user.interests && (
                  <div>
                    <span className="font-medium">Interests:</span>{" "}
                    <span className="text-muted-foreground">
                      {selectedNode.user.interests.slice(0, 50)}
                      {selectedNode.user.interests.length > 50 ? "..." : ""}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2 border-t border-gray-100">
                <span className="text-xs text-muted-foreground">
                  Click to start a conversation
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* {!isMobile && (
        <>
          <div
            className={`w-1 bg-gray-200 hover:bg-gray-300 cursor-col-resize relative group transition-colors duration-200 ${
              isResizing ? "bg-blue-400" : ""
            }`}
            onMouseDown={handleMouseDown}
          >
            <div className="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="w-1 h-8 bg-accent rounded-full"></div>
            </div>
          </div>

          <div
            className="h-full transition-all duration-150 ease-out"
            style={{ width: `${rightWidth}%` }}
          >
            <MessagesSidebar conversations={conversations} />
          </div>
        </>
      )} */}
    </section>
  );
}
