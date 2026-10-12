import { withBase } from '@/utils/url';
import { parseCodeReceipt, type DynamicCodeReceipt } from '../utils/dynamic-codes';
export class DynamicCodeError extends Error {
    constructor(public readonly code: string) { super(code); }
}
async function write(path: string, body: unknown) {
    const response = await fetch(withBase(`/api/v1/codes${path}`), { method: 'POST', cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer', headers: { 'Content-Type': 'application/json', 'X-CN-Request': '1' }, body: JSON.stringify(body) });
    const value = await response.json() as Record<string, unknown>;
    if (!response.ok || value.ok !== true)
        throw new DynamicCodeError(typeof value.code === 'string' ? value.code : `HTTP_${response.status}`);
    return value;
}
export async function createDynamicCode(destination: string, expiresAt: string | null): Promise<DynamicCodeReceipt> {
    const result = await write('', { destination_url: destination, expires_at: expiresAt });
    const receipt = parseCodeReceipt({ ...result, version: 1, destination_url: new URL(destination).href, revoked: false });
    if (!receipt)
        throw new DynamicCodeError('INVALID_RESPONSE');
    return receipt;
}
export async function revokeDynamicCode(receipt: DynamicCodeReceipt) {
    const value = await write(`/${receipt.id}/revoke`, { manage_key: receipt.manage_key });
    if (value.revoked !== true)
        throw new DynamicCodeError('INVALID_RESPONSE');
}
