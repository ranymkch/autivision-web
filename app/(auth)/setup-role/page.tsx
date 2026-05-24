import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/app/app/actions";

export default function PendingActivationPage() {
  return (
    <Card className="w-full max-w-md border-border/80 shadow-xl">
      <CardHeader className="space-y-2 text-center">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-500">
          <ShieldAlert className="h-5 w-5" />
        </div>
        <CardTitle className="font-display text-2xl">Account not activated</CardTitle>
        <CardDescription>
          Your account does not have a role assigned yet. Sign out and sign up again, or contact your administrator.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <form action={signOut}>
          <Button type="submit" variant="outline">
            Sign out
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
