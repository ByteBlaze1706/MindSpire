// src/lib/auth/token.ts
const SECRET_KEY = process.env.JWT_SECRET || 'mindspire-super-secret-jwt-signing-key-value-for-security-filters';

// Web Crypto array buffer and encoding helpers
function textToBuffer(text: string): any {
  return new TextEncoder().encode(text);
}

function bufferToBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlToString(base64url: string): string {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// Web Crypto JWT sign and verify (Edge-safe, uses globalThis.crypto)
export async function signToken(payload: any): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = bufferToBase64url(textToBuffer(JSON.stringify(header)));
  const encodedPayload = bufferToBase64url(textToBuffer(JSON.stringify(payload)));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const cryptoKey = await globalThis.crypto.subtle.importKey(
    'raw',
    textToBuffer(SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await globalThis.crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    textToBuffer(dataToSign)
  );

  const encodedSignature = bufferToBase64url(new Uint8Array(signature));
  return `${dataToSign}.${encodedSignature}`;
}

export async function verifyToken(token: string): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      textToBuffer(SECRET_KEY),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const binarySignature = atob(encodedSignature.replace(/-/g, '+').replace(/_/g, '/'));
    const signatureBuffer = new Uint8Array(binarySignature.length);
    for (let i = 0; i < binarySignature.length; i++) {
      signatureBuffer[i] = binarySignature.charCodeAt(i);
    }

    const isValid = await globalThis.crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBuffer as any,
      textToBuffer(dataToSign)
    );

    if (!isValid) return null;

    return JSON.parse(base64urlToString(encodedPayload));
  } catch (err) {
    return null;
  }
}
