// Determine the response type from stored bytes, never from the caller's MIME header.
export function serviceImageType(bytes: Uint8Array): 'image/webp' | 'image/jpeg' | null {
  if (bytes.length >= 12 && bytes[0]===0x52 && bytes[1]===0x49 && bytes[2]===0x46 && bytes[3]===0x46 &&
      bytes[8]===0x57 && bytes[9]===0x45 && bytes[10]===0x42 && bytes[11]===0x50) return 'image/webp';
  if (bytes.length >= 4 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff &&
      bytes[bytes.length-2]===0xff && bytes[bytes.length-1]===0xd9) return 'image/jpeg';
  return null;
}
