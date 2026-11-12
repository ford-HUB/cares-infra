export function resolveImageMimeType(
  mimetype: string | undefined,
  filename: string,
): string {
  if (mimetype?.startsWith('image/')) {
    return mimetype;
  }

  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
    case 'heif':
      return 'image/heic';
    default:
      return 'image/jpeg';
  }
}

/** The type a file's leading bytes prove it to be, or null when they prove nothing. */
export function sniffImageMimeType(buffer: Buffer): string | null {
  const startsWith = (bytes: number[], offset = 0) =>
    bytes.every((byte, index) => buffer[offset + index] === byte);

  if (startsWith([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  // RIFF....WEBP
  if (
    startsWith([0x52, 0x49, 0x46, 0x46]) &&
    startsWith([0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return 'image/webp';
  }
  return null;
}

export function toImageBlob(
  image: Buffer,
  mimetype: string | undefined,
  filename: string,
): Blob {
  return new Blob([new Uint8Array(image)], {
    type: resolveImageMimeType(mimetype, filename),
  });
}
