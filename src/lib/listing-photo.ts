import type { ImagePickerAsset } from 'expo-image-picker';

export type ListingPhoto = { name: string; uri?: string } | { asset: ImagePickerAsset };

const imageExtensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
  'image/gif': 'gif', 'image/avif': 'avif', 'image/bmp': 'bmp',
  'image/jpg': 'jpg', 'image/pjpeg': 'jpg', 'image/x-png': 'png',
};

export function photoExtension(asset: ImagePickerAsset) {
  const mime = (asset.mimeType || asset.file?.type || '').toLowerCase().split(';')[0].trim();
  const extension = imageExtensions[mime]
    ?? (asset.uri.split(/[?#]/)[0].match(/\.(jpe?g|png|webp|heic|heif|gif|avif|bmp)$/i)?.[1]
      ?? asset.fileName?.match(/\.(jpe?g|png|webp|heic|heif|gif|avif|bmp)$/i)?.[1])?.toLowerCase();
  if (!extension) throw new Error('Choose a photo in a supported format, such as JPEG or PNG.');
  return extension;
}
