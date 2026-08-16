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

export function toImageBlob(
  image: Buffer,
  mimetype: string | undefined,
  filename: string,
): Blob {
  return new Blob([new Uint8Array(image)], {
    type: resolveImageMimeType(mimetype, filename),
  });
}
