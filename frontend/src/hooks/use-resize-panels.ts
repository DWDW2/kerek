import { useState, useCallback, useEffect, RefObject } from "react";

interface UseResizePanelsProps {
  containerRef: RefObject<HTMLDivElement | null>;
  initialLeftWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

export function useResizePanels({
  containerRef,
  initialLeftWidth = 60,
  minWidth = 20,
  maxWidth = 80,
}: UseResizePanelsProps) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newLeftWidth =
        ((e.clientX - containerRect.left) / containerRect.width) * 100;

      const constrainedWidth = Math.max(
        minWidth,
        Math.min(maxWidth, newLeftWidth)
      );
      setLeftWidth(constrainedWidth);
    },
    [isResizing, containerRef, minWidth, maxWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const rightWidth = 100 - leftWidth;

  return {
    leftWidth,
    rightWidth,
    isResizing,
    handleMouseDown,
  };
}
