export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

class R2Uploader {
  async uploadImage(
    file: File,
    folder: string = "conversations"
  ): Promise<UploadResult> {
    try {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!allowedTypes.includes(file.type)) {
        return {
          success: false,
          error:
            "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.",
        };
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        return {
          success: false,
          error: "File size too large. Maximum 5MB allowed.",
        };
      }

      const token = localStorage.getItem("auth_token");
      if (!token) {
        return { success: false, error: "Authentication required" };
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        return { success: false, error: result.error || "Upload failed" };
      }

      return { success: true, url: result.url };
    } catch (error) {
      console.error("Upload error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  async uploadConversationBackground(
    file: File,
    conversationId: string
  ): Promise<UploadResult> {
    return this.uploadImage(
      file,
      `conversations/${conversationId}/backgrounds`
    );
  }
}

export const r2Uploader = new R2Uploader();
