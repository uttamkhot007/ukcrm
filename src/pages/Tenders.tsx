import { MainLayout } from '@/components/layout/MainLayout';
import { DealDeskModule } from '@/components/tenders/DealDeskModule';
import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { PageSeo } from '@/components/seo/PageSeo';

export default function Tenders() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'deal-registration';
  const [activeModule, setActiveModule] = useState('deal-desk');

  return (
    <>
    <PageSeo
      title="Tender & Deal Desk — NexusCRM"
      description="Track tenders, register deals, and manage bid workflows end to end in the NexusCRM deal desk."
      path="/tenders"
    />
    <MainLayout activeModule={activeModule} onModuleChange={setActiveModule}>
      <DealDeskModule initialTab={tab} />
    </MainLayout>
    </>
  );
}
