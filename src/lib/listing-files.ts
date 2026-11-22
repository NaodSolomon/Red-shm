import { Directory, File, Paths } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

const listingDirectory = 'red-shm-listing-photos';

export async function copyPhoto(name: string, asset: ImagePickerAsset, folder = listingDirectory) {
  const directory = new Directory(Paths.document, folder);
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, name);
  new File(asset.uri).copy(destination);
  return destination.uri;
}

export async function resolvePhoto(name: string, folder = listingDirectory) {
  const file = new File(Paths.document, folder, name);
  return file.exists ? file.uri : undefined;
}

export async function deletePhoto(name: string, _uri?: string, folder = listingDirectory) {
  const file = new File(Paths.document, folder, name);
  if (file.exists) file.delete();
}
