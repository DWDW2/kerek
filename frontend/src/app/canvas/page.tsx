import SharedCanvas from "@/components/shared-canvas/shared-canvas";

export default function CanvasPage() {
  return (
    <div className="h-screen w-full">
      <div className="h-full w-full bg-gray-50">
        <SharedCanvas className="w-full h-full" />
      </div>
    </div>
  );
}
