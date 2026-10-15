import { useState } from 'react';
import { GraphicWorkspace } from '../components/GraphicWorkspace';
import { DESIGN_TEMPLATES } from '../config/graphic-templates';
import { useTranslation } from 'react-i18next';
import { WorkspaceGuide } from '@/features/tools/hub';
export default function QuickDesignPage() {
    const { t: studio } = useTranslation('common', { keyPrefix: 'studio.design' });
    const [files, setFiles] = useState<File[]>([]);
    return <div className="cn-design-workspace"><GraphicWorkspace design files={files} onFiles={setFiles} templates={DESIGN_TEMPLATES}/><div className="cn-studio-footer-guide"><WorkspaceGuide steps={[studio('stepContent'),studio('stepTemplate'),studio('stepSave')]} tip={studio('tip')}/></div></div>;
}
