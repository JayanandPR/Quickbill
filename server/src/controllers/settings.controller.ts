import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getOrCreateBusinessSettings, SETTINGS_ID } from '../lib/settings';
import cloudinary from '../lib/cloudinary';

const updateSettingsSchema = z.object({
  businessName: z.string().min(1, 'Business name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
});

export async function getSettings(req: Request, res: Response) {
  const settings = await getOrCreateBusinessSettings();
  return res.status(200).json({ settings });
}

export async function updateSettings(req: Request, res: Response) {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.issues[0].message });
  }

  const settings = await prisma.businessSettings.upsert({
    where: { id: SETTINGS_ID },
    update: parsed.data,
    create: { id: SETTINGS_ID, ...parsed.data },
  });

  return res.status(200).json({ settings });
}

export async function uploadLogo(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({ message: 'No image file was provided' });
  }

  try {
    // Upload the in-memory buffer to Cloudinary via its upload_stream API
    const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'quickbill/logos', resource_type: 'image' },
        (error, result) => {
          if (error || !result) return reject(error || new Error('Upload failed'));
          resolve(result);
        }
      );
      stream.end(req.file!.buffer);
    });

    const settings = await prisma.businessSettings.upsert({
      where: { id: SETTINGS_ID },
      update: { logoUrl: uploadResult.secure_url },
      create: { id: SETTINGS_ID, logoUrl: uploadResult.secure_url },
    });

    return res.status(200).json({ settings });
  } catch (err: any) {
    return res.status(500).json({ message: 'Failed to upload logo. Please try again.' });
  }
}