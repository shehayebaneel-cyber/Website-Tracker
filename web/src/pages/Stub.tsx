import { Page, PageHeader } from "../components/Page";
import { Card } from "../components/ui";

export default function Stub({ title, phase }: { title: string; phase: string }) {
  return (
    <Page>
      <PageHeader title={title} subtitle="This module is part of a later milestone" />
      <Card className="p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-3xl opacity-30">◷</div>
          <div className="text-sm font-semibold" style={{ color: "var(--ink-2)" }}>
            Planned for {phase}
          </div>
          <p className="max-w-md text-sm" style={{ color: "var(--muted)" }}>
            The data model and API foundations for this section already exist. The interface will be built
            once the Milestone&nbsp;1 direction (Clients, Websites, Dashboard) is approved.
          </p>
        </div>
      </Card>
    </Page>
  );
}
