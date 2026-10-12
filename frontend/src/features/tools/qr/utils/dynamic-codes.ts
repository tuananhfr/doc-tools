export interface DynamicCodeReceipt {
    version: 1;
    id: string;
    resolve_url: string;
    manage_key: string;
    expires_at: string | null;
    destination_url: string;
    revoked: boolean;
}
export const CODE_STORE = 'chuyen-nho-dynamic-codes-v1';
export function parseCodeReceipt(value: unknown): DynamicCodeReceipt | null {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return null;
    const receipt = value as Partial<DynamicCodeReceipt>;
    if (receipt.version !== 1 || typeof receipt.id !== 'string' || !/^[0-9a-f-]{36}$/.test(receipt.id)
        || typeof receipt.manage_key !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(receipt.manage_key)
        || typeof receipt.resolve_url !== 'string' || typeof receipt.destination_url !== 'string'
        || typeof receipt.revoked !== 'boolean' || receipt.expires_at !== null && (typeof receipt.expires_at !== 'string' || !Number.isFinite(Date.parse(receipt.expires_at))))
        return null;
    try {
        const resolve = new URL(receipt.resolve_url), destination = new URL(receipt.destination_url);
        if (!['https:', 'http:'].includes(resolve.protocol) || resolve.username || resolve.password || resolve.search || resolve.hash
            || !/\/api\/v1\/codes\/[A-Za-z0-9_-]{32}\/resolve$/.test(resolve.pathname)
            || destination.protocol !== 'https:' || destination.username || destination.password)
            return null;
    }
    catch {
        return null;
    }
    return receipt as DynamicCodeReceipt;
}
export function readCodeReceipts(storage: Pick<Storage, 'getItem'>): DynamicCodeReceipt[] {
    try {
        const raw = storage.getItem(CODE_STORE);
        if (!raw || raw.length > 256000)
            return [];
        const value: unknown = JSON.parse(raw);
        return Array.isArray(value) ? value.slice(0, 100).flatMap(item => { const parsed = parseCodeReceipt(item); return parsed ? [parsed] : []; }) : [];
    }
    catch {
        return [];
    }
}
export function writeCodeReceipts(storage: Pick<Storage, 'setItem' | 'removeItem'>, items: DynamicCodeReceipt[]) {
    if (!items.length)
        storage.removeItem(CODE_STORE);
    else
        storage.setItem(CODE_STORE, JSON.stringify(items.slice(0, 100)));
}
