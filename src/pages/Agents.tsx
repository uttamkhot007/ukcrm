import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { AgentConsole } from "@/components/agents/AgentConsole";
import { PageSeo } from "@/components/seo/PageSeo";

export default function Agents() {
  const navigate = useNavigate();

  const handleModuleChange = (module: string) => {
    if (module === "ai-agents" || module === "agents") return;

    if (module === "platform-console" || module === "platform-tenants") {
      navigate("/admin/platform/tenants");
      return;
    }

    if (module.startsWith("platform-")) {
      navigate(`/admin/platform/${module.replace("platform-", "")}`);
      return;
    }

    if (module === "tenant-admin") {
      navigate("/admin/organization");
      return;
    }

    if (module.startsWith("tenant-admin-")) {
      navigate(`/admin/${module.replace("tenant-admin-", "")}`);
      return;
    }

    navigate("/", { state: { module } });
  };

  return (
    <>
      <PageSeo
        title="AI Agent Console — NexusCRM"
        description="Specialist AI agents that draft documents, analyse tenders, run the books and build reports from your live workspace data."
        path="/agents"
      />
      <MainLayout activeModule="ai-agents" onModuleChange={handleModuleChange}>
        <AgentConsole />
      </MainLayout>
    </>
  );
}
