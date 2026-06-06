import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expected = signatureHeader.replace('sha256=', '');
  const actual = createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex');

  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');

  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
