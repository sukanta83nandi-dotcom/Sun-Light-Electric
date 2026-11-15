const rawFileRegistry = new Map<string, File>();

/**
 * Registers the live File instance in memory (keyed by document ID)
 * without polluting JSON serialization / localStorage.
 */
export const registerRawFile = (docId: string, file: File): void => {
  if (!docId || !file) return;
  rawFileRegistry.set(docId, file);
};

/**
 * Retrieves an in-memory File instance if still available in the current session.
 */
export const getRawFile = (docId?: string): File | undefined => {
  if (!docId) return undefined;
  return rawFileRegistry.get(docId);
};

/**
 * Infers a MIME type from a filename when an uploaded or stored file omits one.
 */
export const inferMimeTypeFromFileName = (fileName?: string): string => {
  const lower = (fileName || '').toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.svg')) return 'image/svg+xml';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.doc')) return 'application/msword';
  if (lower.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (lower.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (lower.endsWith('.xlsx')) {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  return 'application/octet-stream';
};

/**
 * Converts a Base64 Data URL (or raw File in memory) into a safe Blob URL (`blob:...`)
 * so sandboxed iframes and modern browsers render PDFs and files without blocking `data:` URIs.
 */
export const createSafeBlobUrl = (
  dataUrl?: string,
  fallbackMime?: string,
  rawFile?: File,
  fileName?: string
): string => {
  if (rawFile instanceof File) {
    return URL.createObjectURL(rawFile);
  }

  if (!dataUrl) return '';

  if (dataUrl.startsWith('blob:') || dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return dataUrl;
  }

  if (dataUrl.startsWith('data:')) {
    try {
      const commaIndex = dataUrl.indexOf(',');
      if (commaIndex === -1) return dataUrl;

      const header = dataUrl.slice(5, commaIndex);
      const payload = dataUrl.slice(commaIndex + 1);
      const isBase64 = header.includes(';base64');
      const headerMime = header.split(';')[0]?.trim();
      const resolvedMime =
        headerMime && headerMime !== 'application/octet-stream'
          ? headerMime
          : fallbackMime || inferMimeTypeFromFileName(fileName);

      if (isBase64) {
        const cleanBase64 = payload.replace(/\s/g, '');
        const binaryString = atob(cleanBase64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: resolvedMime });
        return URL.createObjectURL(blob);
      }

      const decodedText = decodeURIComponent(payload);
      const blob = new Blob([decodedText], { type: resolvedMime });
      return URL.createObjectURL(blob);
    } catch (err) {
      console.warn('Failed to convert Data URL to Blob URL:', err);
      return dataUrl;
    }
  }

  return dataUrl;
};

/**
 * Safely revokes a temporary `blob:` URL created by `createSafeBlobUrl`.
 */
export const revokeSafeBlobUrl = (url?: string | null, originalSource?: string): void => {
  if (url && url.startsWith('blob:') && url !== originalSource) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // Ignore revoke errors
    }
  }
};
