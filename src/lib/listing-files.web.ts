import type { ImagePickerAsset } from 'expo-image-picker';

const listingDirectory = 'red-shm-listing-photos';

async function directory(folder: string) {
  if (!navigator.storage?.getDirectory) {
    throw new Error('Photo storage needs a supported browser on localhost or HTTPS.');
  }
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(folder, { create: true });
}

export async function copyPhoto(name: string, asset: ImagePickerAsset, folder = listingDirectory) {
  if (!asset.file) throw new Error('Choose the photo again to save it.');
  const handle = await (await directory(folder)).getFileHandle(name, { create: true });
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

export async function resolvePhoto(name: string, folder = listingDirectory) {
  try {
    const handle = await (await directory(folder)).getFileHandle(name);
    return URL.createObjectURL(await handle.getFile());
  } catch {
    return undefined;
  }
}

export async function deletePhoto(name: string, uri?: string, folder = listingDirectory) {
  if (uri) URL.revokeObjectURL(uri);
  await (await directory(folder)).removeEntry(name);
}
