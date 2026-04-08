import { createFsFileStorage } from "@remix-run/file-storage/fs";

export const fileStorage = createFsFileStorage(
    "./uploads/image",
);

export function getStorageKey(photoId: string) {
    return `fridge-${photoId}-image`;
}
