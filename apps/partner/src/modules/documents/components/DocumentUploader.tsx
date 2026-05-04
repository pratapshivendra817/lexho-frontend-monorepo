import { useState } from "react";

import { ButtonLoader } from "@/modules/shared/components/ButtonLoader";
import { validateDocumentFile } from "@/modules/shared/utils/fileValidation";

import type { DocumentType } from "@/modules/providers/types/onboarding";

type DocumentUploaderProps = {
  label: string;
  required?: boolean;
  documentType: DocumentType;
  providerId: string;
  uploadedUrl?: string;
  onUpload: (documentType: DocumentType, file: File, onProgress: (progress: number) => void) => Promise<void>;
};

export function DocumentUploader({
  label,
  required = false,
  documentType,
  providerId,
  uploadedUrl,
  onUpload,
}: DocumentUploaderProps) {
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState("");

  const previewUrl = uploadedUrl || localPreviewUrl;

  return (
    <div className="onboarding-card">
      <div className="onboarding-card-header">
        <p className="onboarding-card-title">{label}</p>
        {required ? <span className="tag">Required</span> : <span className="tag">Optional</span>}
      </div>

      <input
        type="file"
        disabled={!providerId || uploading}
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;

          const validation = validateDocumentFile(file);
          if (!validation.valid) {
            setError(validation.message ?? "Invalid file");
            return;
          }

          setError("");
          setProgress(0);
          setUploading(true);
          if (file.type.startsWith("image/")) {
            setLocalPreviewUrl(URL.createObjectURL(file));
          }

          try {
            await onUpload(documentType, file, setProgress);
            setProgress(100);
          } catch (uploadError) {
            const message = uploadError instanceof Error ? uploadError.message : "Upload failed";
            setError(message);
          } finally {
            setUploading(false);
          }
        }}
      />

      <div className="onboarding-upload-meta">
        <p className="item-subtitle">{providerId ? `Provider ID: ${providerId}` : "Submit onboarding form first."}</p>
        <p className="item-subtitle">Progress: {progress}%</p>
      </div>

      {previewUrl ? (
        <div className="onboarding-preview-wrap">
          {previewUrl.endsWith(".pdf") ? (
            <iframe src={previewUrl} className="onboarding-preview" title={label} />
          ) : (
            <img src={previewUrl} className="onboarding-preview" alt={label} />
          )}
        </div>
      ) : null}

      {error ? <p className="error-text">{error}</p> : null}

      <ButtonLoader label={uploading ? "Uploading" : "Ready"} loading={uploading} disabled />
    </div>
  );
}
