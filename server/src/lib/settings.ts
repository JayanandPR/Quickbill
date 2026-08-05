import { prisma } from './prisma';

const SETTINGS_ID = 'singleton';

/**
 * Fetches the one BusinessSettings row, creating it with defaults on first
 * access if it doesn't exist yet. Avoids needing a separate seed step.
 */
export async function getOrCreateBusinessSettings() {
  return prisma.businessSettings.upsert({
    where: { id: SETTINGS_ID },
    update: {},
    create: { id: SETTINGS_ID },
  });
}

export { SETTINGS_ID };

/**
 * Downloads a logo image (from its Cloudinary URL) into a Buffer so it can
 * be embedded directly into a generated PDF. Returns undefined on any
 * failure — invoices should still generate correctly without a logo.
 */
export async function fetchLogoBuffer(url?: string | null): Promise<Buffer | undefined> {
  if (!url) return undefined;
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return undefined;
  }
}