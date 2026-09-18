import { toast } from 'ngx-sonner';

/** Hands a blob to the browser as a download with a sensible name. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** Reads a file as the bare base64 payload the mail API expects. */
export function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',', 2)[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function copyToClipboard(value: string, label = 'Copied'): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(label, { description: value.length > 64 ? `${value.slice(0, 64)}…` : value, duration: 2200 });
  } catch {
    toast.error('Could not copy', { description: 'The browser refused access to the clipboard.' });
  }
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
