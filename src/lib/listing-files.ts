import { Directory, File, Paths } from 'expo-file-system';
import type { ImagePickerAsset } from 'expo-image-picker';

const directory = new Directory(Paths.document, 'red-shm-listing-photos');

export async function copyPhoto(name: string, asset: ImagePickerAsset) {
  directory.create({ idempotent: true, intermediates: true });
  const destination = new File(directory, name);
  new File(asset.uri).copy(destination);
  return destination.uri;
}

export async function resolvePhoto(name: string) {
  const file = new File(directory, name);
  return file.exists ? file.uri : undefined;
}

export async function deletePhoto(name: string) {
  const file = new File(directory, name);
  if (file.exists) file.delete();
}
