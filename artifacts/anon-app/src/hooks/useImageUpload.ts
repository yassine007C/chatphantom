import { useState, useCallback } from "react";
import { getAuthReq } from "@/lib/auth";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export interface UploadResult {
  objectPath: string;
  previewUrl: string;
}

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(async (file: File): Promise<UploadResult | null> => {
    if (!file.type.startsWith("image/")) {
      setError("Only image files are supported");
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10MB");
      return null;
    }

    setIsUploading(true);
    setError(null);

    try {
      const authReq = getAuthReq();
      const metaRes = await fetch(`${BASE}/api/storage/uploads/request-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authReq.headers as Record<string, string>),
        },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });

      if (!metaRes.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadURL, objectPath } = await metaRes.json();

      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      return {
        objectPath,
        previewUrl: `${BASE}/api/storage${objectPath}`,
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { uploadImage, isUploading, error, setError };
}
