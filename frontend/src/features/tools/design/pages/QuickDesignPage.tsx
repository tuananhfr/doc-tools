import { useState } from 'react';
import { GraphicWorkspace } from '../components/GraphicWorkspace';
import { DESIGN_TEMPLATES } from '../config/graphic-templates';
export default function QuickDesignPage() {
    const [files, setFiles] = useState<File[]>([]);
    return <GraphicWorkspace design files={files} onFiles={setFiles} templates={DESIGN_TEMPLATES}/>;
}
