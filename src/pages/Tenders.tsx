import { MainLayout } from '@/components/layout/MainLayout';
import { TenderModule } from '@/components/tenders/TenderModule';
import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';

export default function Tenders() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'opportunities';
  const [activeModule, setActiveModule] = useState('tenders');

  return (
    <MainLayout activeModule={activeModule} onModuleChange={setActiveModule}>
      <TenderModule initialTab={tab} />
    </MainLayout>
  );
}
