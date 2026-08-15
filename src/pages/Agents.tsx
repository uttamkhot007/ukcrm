import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AgentConsole } from "@/components/agents/AgentConsole";
import { PageSeo } from "@/components/seo/PageSeo";

export default function Agents() {
  const [activeModule, setActiveModule] = useState("agents");

  return (
    <>
      <PageSeo
        title="AI Agent Console — NexusCRM"
        description="Specialist AI agents that draft documents, analyse tenders, run the books and build reports from your live workspace data."
        path="/agents"
      />
      <MainLayout activeModule={activeModule} onModuleChange={setActiveModule}>
        <AgentConsole />
      </MainLayout>
    </>
  );
}
