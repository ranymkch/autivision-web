"use client";

import Link from "next/link";
import { XCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/provider";

export default function AccountRejectedPage() {
  const { t } = useI18n();
  return (
    <Card className="w-full max-w-md border-border/80 shadow-xl">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <XCircle className="h-5 w-5" />
        </div>
        <CardTitle className="font-display text-2xl">{t.auth.rejected.title}</CardTitle>
        <CardDescription className="text-sm leading-relaxed">{t.auth.rejected.desc}</CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button asChild variant="outline" size="sm">
          <Link href="/login">{t.auth.rejected.backToLogin}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
