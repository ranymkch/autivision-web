"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/app/page-header";
import { useI18n } from "@/lib/i18n/provider";

export function PatientsHeading({ action }: { action: ReactNode }) {
  const { t } = useI18n();
  return <PageHeader title={t.app.patients.title} subtitle={t.app.patients.subtitle} actions={action} />;
}

export function EmptyState({ canCreate }: { canCreate: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <p className="text-sm text-muted-foreground">{t.app.patients.empty}</p>
      {canCreate && (
        <Button asChild size="sm">
          <Link href="/app/patients/new">{t.app.patients.new}</Link>
        </Button>
      )}
    </div>
  );
}
