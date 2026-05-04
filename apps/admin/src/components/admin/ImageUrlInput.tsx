import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { appConfig } from "@/config";
import { uploadAdminImage } from "@/services/lexhoAdminApi";

type ImageUrlInputProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

export function ImageUrlInput({ value, onChange, label = "Image" }: ImageUrlInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (localPreviewUrl) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const previewSrc = useMemo(() => localPreviewUrl ?? value, [localPreviewUrl, value]);

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
    }

    const canCreateObjectUrl =
      typeof URL !== "undefined" && typeof URL.createObjectURL === "function";
    if (canCreateObjectUrl) {
      setLocalPreviewUrl(URL.createObjectURL(file));
    }
    setIsUploading(true);

    try {
      const uploadedUrl = await uploadAdminImage(file);
      onChange(uploadedUrl);
      setLocalPreviewUrl(null);
      toast.success("Image uploaded successfully");
    } catch {
      toast.error(`Image upload failed (${appConfig.adminImageUploadEndpoint})`);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="grid gap-2 text-sm text-[var(--color-text)]">
      <label className="grid gap-1">
        <span>{label}</span>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          disabled={isUploading}
          className="w-full rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm file:mr-2 file:mt-1 file:rounded-md file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white sm:file:mr-3 sm:file:mt-0"
        />
      </label>

      {previewSrc ? (
        <div className="grid gap-1">
          <span className="text-xs text-[var(--color-muted)]">Uploaded image preview</span>
          <img
            src={previewSrc}
            alt="Uploaded"
            className="h-28 w-full max-w-xs rounded-lg border border-[var(--color-border)] object-cover"
          />
        </div>
      ) : null}

      <span className="text-xs text-[var(--color-muted)]">
        Upload endpoint: {appConfig.adminImageUploadEndpoint}
        {isUploading ? " (Uploading...)" : ""}
      </span>
    </div>
  );
}
