export type FileValidationResult = {
  valid: boolean;
  message?: string;
};

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "application/pdf"];

export function validateDocumentFile(file: File): FileValidationResult {
  const maxBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, message: `File size must be <= ${MAX_FILE_SIZE_MB}MB.` };
  }

  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { valid: false, message: "Only JPG, PNG or PDF files are allowed." };
  }

  return { valid: true };
}
