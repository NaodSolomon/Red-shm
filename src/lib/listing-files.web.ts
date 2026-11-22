import type { ImagePickerAsset } from 'expo-image-picker';

async function directory() {
  if (!navigator.storage?.getDirectory) {
    throw new Error('Photo storage needs a supported browser on localhost or HTTPS.');
  }
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle('red-shm-listing-photos', { create: true });
}

export async function copyPhoto(name: string, asset: ImagePickerAsset) {
  if (!asset.file) throw new Error('Choose the photo again to save it.');
  const handle = await (await directory()).getFileHandle(name, { create: true });
  const writer = await handle.createWritable();
  try {
    await writer.write(asset.file);
    await writer.close();
  } catch (error) {
    await writer.abort().catch(() => {});
    throw error;
  }
  return URL.createObjectURL(asset.file);
}

export async function resolvePhoto(name: string) {
  try {
    const handle = await (await directory()).getFileHandle(name);
    return URL.createObjectURL(await handle.getFile());
  } catch {
    return undefined;
  }
}

export async function deletePhoto(name: string, uri?: string) {
  if (uri) URL.revokeObjectURL(uri);
  await (await directory()).removeEntry(name);
}
