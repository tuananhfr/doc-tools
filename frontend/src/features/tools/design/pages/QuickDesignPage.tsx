import { useState } from 'react';
import { GraphicWorkspace } from '../components/GraphicWorkspace';
import { DESIGN_TEMPLATES } from '../config/graphic-templates';
import { ImageUtilityStudio } from '@/features/tools/image/components/ImageUtilityStudio';

export default function QuickDesignPage() {
    const [files, setFiles] = useState<File[]>([]);
    return <ImageUtilityStudio kind="design"><div className="cn-designstudio cn-design-workspace"><GraphicWorkspace design files={files} onFiles={setFiles} templates={DESIGN_TEMPLATES}/></div></ImageUtilityStudio>;
}
