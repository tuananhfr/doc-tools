import { useEffect, useState } from 'react';
import type { GraphicJob } from '../types/graphic.types';
import { renderGraphicSheet } from '../services/graphic-render';
import { graphicSheets } from '../utils/graphic-layout';
const fileIds=new WeakMap<File,number>()
let lastFileId=0
function fileIdentity(file:File){let id=fileIds.get(file);if(id===undefined){id=++lastFileId;fileIds.set(file,id)}return id}
export function useGraphicPreview(job: GraphicJob, page: number) {
    const [preview, setPreview] = useState<{
        url: string;
        signature: string;
    } | null>(null), [error, setError] = useState(false);
    const signature = JSON.stringify([job.template, job.brand, page, job.files.map(file => [fileIdentity(file),file.name, file.size, file.lastModified]), job.logo ? [fileIdentity(job.logo),job.logo.name, job.logo.size, job.logo.lastModified] : null]);
    useEffect(() => { let stopped = false, url: string | null = null; const timer = window.setTimeout(async () => { setError(false); try {
        const sheets = graphicSheets(job), blob = await renderGraphicSheet(job, sheets[Math.min(page, sheets.length - 1)], 60);
        if (stopped)
            return;
        url = URL.createObjectURL(blob);
        setPreview({ url, signature });
    }
    catch {
        if (!stopped)
            setError(true);
    } }, 250); return () => { stopped = true; clearTimeout(timer); if (url)
        URL.revokeObjectURL(url); }; }, [signature]);
    return { url: preview?.signature === signature ? preview.url : null, error };
}
