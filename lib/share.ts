export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** Copy to clipboard with a graceful fallback; returns true on success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
