import { MainLayout } from '@/components/layout/MainLayout';
import { DealDeskModule } from '@/components/tenders/DealDeskModule';
import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';

export default function Tenders() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'deal-registration';
  const [activeModule, setActiveModule] = useState('deal-desk');

  return (
    <MainLayout activeModule={activeModule} onModuleChange={setActiveModule}>
      <DealDeskModule initialTab={tab} />
    </MainLayout>
  );
}
