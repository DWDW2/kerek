"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { ConversationCustomization } from "@/types/conversation";
import { Upload, Palette, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

interface ConversationCustomizationProps {
  conversationId: string;
  currentCustomization?: ConversationCustomization;
  trigger?: React.ReactNode;
}

const defaultColors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export function ConversationCustomization({
  conversationId,
  currentCustomization,
  trigger,
}: ConversationCustomizationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [customization, setCustomization] = useState<ConversationCustomization>(
    currentCustomization || {}
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleColorChange = (
    colorType: keyof ConversationCustomization,
    color: string
  ) => {
    setCustomization((prev) => ({
      ...prev,
      [colorType]: color,
    }));
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFile(file);
  };

  const handleSave = async () => {
    if (!user?.id || !conversationId) return;
    if (!file) {
      toast.error("Please upload an image");
      return;
    }

    const token = localStorage.getItem("auth_token");
    if (!token) return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `conversations/${conversationId}/backgrounds`);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload image");
      }

      const uploadResult = await uploadResponse.json();

      const updatedCustomization = {
        ...customization,
        background_image_url: uploadResult.url,
      };

      const response = await fetch(
        `/api/conversations/${conversationId}/customization`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updatedCustomization),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update conversation customization");
      }

      toast.success("Conversation appearance updated!");
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to save customization:", error);
      toast.error("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Palette className="h-4 w-4" />
            Customize
          </Button>
        )}
      </DialogTrigger>
      <DialogTitle />
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Customize Conversation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Background Image
              </Label>

              {file && (
                <div className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    alt="Background preview"
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setFile(null)}
                  >
                    Remove
                  </Button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploading ? "Uploading..." : "Upload Image"}
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base font-semibold">Message Colors</Label>

              <div className="space-y-2">
                <Label className="text-sm">Your Message Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={customization.primary_message_color || "#3b82f6"}
                    onChange={(e) =>
                      handleColorChange("primary_message_color", e.target.value)
                    }
                    className="w-12 h-10 p-1 border rounded cursor-pointer"
                  />
                  <div className="flex gap-1">
                    {defaultColors.map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() =>
                          handleColorChange("primary_message_color", color)
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Other Messages Color</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={customization.secondary_message_color || "#f1f5f9"}
                    onChange={(e) =>
                      handleColorChange(
                        "secondary_message_color",
                        e.target.value
                      )
                    }
                    className="w-12 h-10 p-1 border rounded cursor-pointer"
                  />
                  <div className="flex gap-1">
                    {[
                      "#f1f5f9",
                      "#e2e8f0",
                      "#cbd5e1",
                      "#94a3b8",
                      "#64748b",
                      "#475569",
                      "#334155",
                      "#1e293b",
                    ].map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() =>
                          handleColorChange("secondary_message_color", color)
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <Label className="text-base font-semibold">Text Colors</Label>

              <div className="space-y-2">
                <Label className="text-sm">Your Message Text</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={customization.text_color_primary || "#ffffff"}
                    onChange={(e) =>
                      handleColorChange("text_color_primary", e.target.value)
                    }
                    className="w-12 h-10 p-1 border rounded cursor-pointer"
                  />
                  <div className="flex gap-1">
                    {[
                      "#ffffff",
                      "#f8fafc",
                      "#e2e8f0",
                      "#000000",
                      "#1e293b",
                      "#374151",
                    ].map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() =>
                          handleColorChange("text_color_primary", color)
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Other Messages Text</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={customization.text_color_secondary || "#1e293b"}
                    onChange={(e) =>
                      handleColorChange("text_color_secondary", e.target.value)
                    }
                    className="w-12 h-10 p-1 border rounded cursor-pointer"
                  />
                  <div className="flex gap-1">
                    {[
                      "#1e293b",
                      "#374151",
                      "#4b5563",
                      "#6b7280",
                      "#9ca3af",
                      "#ffffff",
                    ].map((color) => (
                      <button
                        key={color}
                        className="w-8 h-8 rounded border hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={() =>
                          handleColorChange("text_color_secondary", color)
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
