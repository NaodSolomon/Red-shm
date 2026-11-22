import type { ImagePickerAsset } from 'expo-image-picker';

export type ListingPhoto = { name: string; uri?: string } | { asset: ImagePickerAsset };

const imageExtensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic', 'image/heif': 'heif',
  'image/gif': 'gif', 'image/avif': 'avif', 'image/bmp': 'bmp',
};

export function photoExtension(asset: ImagePickerAsset) {
  const extension = imageExtensions[asset.mimeType ?? '']
    ?? (asset.uri.split(/[?#]/)[0].match(/\.(jpe?g|png|webp|heic|heif|gif|avif|bmp)$/i)?.[1]
      ?? asset.fileName?.match(/\.(jpe?g|png|webp|heic|heif|gif|avif|bmp)$/i)?.[1])?.toLowerCase();
  if (!extension) throw new Error('Choose a photo in a supported format, such as JPEG or PNG.');
  return extension;
}
