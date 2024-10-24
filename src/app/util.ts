const decoder = new TextDecoder();
const encoder = new TextEncoder();

// Remove 00, FF, and spaces from the tail of a binary string
// and convert it to ASCII.
export function readPaddedString(data: Uint8Array): string {
  let firstPadding = data.findIndex((v) => v == 0xff);
  if (firstPadding == -1) {
    firstPadding = data.length;
  }
  let lastChar = firstPadding - 1;
  while (lastChar >= 0 && [0, 32].includes(data[lastChar])) {
    lastChar -= 1;
  }
  return decoder.decode(data.slice(0, lastChar + 1));
}

// binary encode a string and pad it with FFs.
export function fillPaddedString(data: Uint8Array, str: string) {
  const result = encoder.encodeInto(str, data);
  data.subarray(result.written).fill(255);
}

// Code point comparison for strings.
export function stringCompare(a: string, b: string) {
  if (a > b) {
    return 1;
  } else if (a < b) {
    return -1;
  } else {
    return 0;
  }
}

// Detect bad characters that shouldn't be in names
export function badChars(s: string): string | undefined {
  if (!/^[-!"#%&'*+,.:<>\?\[\]_0-9A-Za-z ]+$/.test(s)) {
    const badCharRe = /[^-!"#%&'*+,.:<>\?\[\]_0-9A-Za-z ]/g;
    const badCharIterator = s.matchAll(badCharRe);
    let badChars = '';
    for (let badCharMatch of badCharIterator) {
      const badChar = badCharMatch[0];
      if (!badChars.includes(badChar)) {
        badChars = badChars + badChar;
      }
    }
    return badChars;
  }
  return undefined;
}
