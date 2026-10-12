import type { BarcodeKind } from '../types/barcode.types';
import type { BarcodeEngine } from '../services/barcode-render';
import { qrPngBlob, qrSvgBlob } from '../services/qr-render';
import { checkBarcode } from './barcode-check';
import { createMatrix, matrixSpan } from './qr-matrix';
export type LabelCodeKind = 'qr' | BarcodeKind;
export async function labelCode(value: string, kind: LabelCodeKind, width: number, height: number, engine: BarcodeEngine | null) {
    if (kind === 'qr') {
        const matrix = createMatrix(value), edge = Math.min(width - 4, height - 4);
        if (!matrix || edge < matrixSpan(matrix) * .25)
            throw new Error('QR_LABEL_TOO_DENSE');
        return { blob: await qrPngBlob(matrix, '#000000', '#ffffff'), preview: qrSvgBlob(matrix, '#000000', '#ffffff'), width: edge, height: edge, value };
    }
    const checked = checkBarcode(kind, value);
    if (!checked.ok)
        throw new Error(checked.reason);
    if (!engine)
        throw new Error('BARCODE_ENGINE_LOADING');
    const look = { includeText: true, heightMm: Math.min(20, height - 10), magnification: 1 }, item = { kind, value: checked.value }, svg = engine.svg(item, look);
    const imageWidth = Number(svg.match(/width="([\d.]+)mm"/)?.[1]), imageHeight = Number(svg.match(/height="([\d.]+)mm"/)?.[1]);
    if (!imageWidth || !imageHeight || imageWidth > width - 4 || imageHeight > height - 4)
        throw new Error('BARCODE_LABEL_TOO_SMALL');
    return { blob: await engine.png(item, look), preview: new Blob([svg], { type: 'image/svg+xml' }), width: imageWidth, height: imageHeight, value: checked.value };
}
