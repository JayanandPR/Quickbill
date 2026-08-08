import { prisma } from './prisma';

export async function getBusinessBranding() {
  const settings = await prisma.businessSettings.findFirst();
  let logoBuffer: Buffer | undefined;

  if (settings?.logoUrl) {
    try {
      const imgRes = await fetch(settings.logoUrl);
      logoBuffer = Buffer.from(await imgRes.arrayBuffer());
    } catch {
      // If the logo can't be fetched, just skip it — don't break report generation
    }
  }

  return {
    businessName: settings?.businessName,
    businessAddress: settings?.address ?? undefined,
    businessPhone: settings?.phone ?? undefined,
    logoBuffer,
  };
}