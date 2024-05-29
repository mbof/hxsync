const decoder = new TextDecoder();
const encoder = new TextEncoder();

// Remove 00, FF, and spaced from the tail of a binary string
// and convert it to ASCII.
export function readPaddedString(data: Uint8Array): string {
  for (
    var lastChar = data.length - 1;
    lastChar >= 0 && [0, 255, 32].includes(data[lastChar]);
    lastChar -= 1
  );
  return decoder.decode(data.slice(0, lastChar + 1));
}

// binary encode a string and pad it with FFs.
export function fillPaddedString(data: Uint8Array, str: string) {
  const result = encoder.encodeInto(str, data);
  data.subarray(result.written).fill(255);
}
