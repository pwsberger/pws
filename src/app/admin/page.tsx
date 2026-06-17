import { Download, Lock, LogOut } from "lucide-react";
import Link from "next/link";
import { loginAdmin, logoutAdmin, isAdminAuthenticated } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createServiceClient } from "@/lib/supabase";

type AdminPageProps = {
  searchParams: Promise<{ error?: string }>;
};

async function getStats() {
  const supabase = createServiceClient();
  const [{ data: participants, error }, { data: completedRows }] = await Promise.all([
    supabase.from("participants").select("assigned_variant, completed, total_session_duration_ms"),
    supabase.from("participants").select("total_session_duration_ms").eq("completed", true),
  ]);

  if (error) throw new Error(error.message);

  const rows = participants ?? [];
  const total = rows.length;
  const completed = rows.filter((row) => row.completed).length;
  const variantA = rows.filter((row) => row.assigned_variant === "A").length;
  const variantB = rows.filter((row) => row.assigned_variant === "B").length;
  const durations = (completedRows ?? [])
    .map((row) => row.total_session_duration_ms)
    .filter((value): value is number => typeof value === "number");
  const avgDurationMs = durations.length
    ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
    : 0;

  return {
    total,
    completed,
    variantA,
    variantB,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    avgDurationMs,
  };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const authenticated = await isAdminAuthenticated();
  const params = await searchParams;

  if (!authenticated) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Lock className="h-5 w-5" />
            </div>
            <CardTitle>Admin login</CardTitle>
            <CardDescription>Log in om onderzoeksdata te bekijken en te exporteren.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={loginAdmin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Wachtwoord</Label>
                <Input id="password" name="password" required type="password" />
              </div>
              {params.error ? <p className="text-sm text-destructive">Onjuist wachtwoord.</p> : null}
              <Button className="w-full" type="submit">Inloggen</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  const stats = await getStats();

  return (
    <main className="min-h-dvh px-4 py-6 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">PWS sportmarketing</p>
            <h1 className="text-3xl font-semibold tracking-normal">Admin dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/api/admin/export">
                <Download className="h-4 w-4" />
                CSV
              </Link>
            </Button>
            <form action={logoutAdmin}>
              <Button aria-label="Uitloggen" size="icon" type="submit" variant="ghost">
                <LogOut className="h-5 w-5" />
              </Button>
            </form>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard label="Totaal deelnemers" value={stats.total} />
          <StatCard label="Afgeronde enquetes" value={stats.completed} />
          <StatCard label="Completion rate" value={`${stats.completionRate}%`} />
          <StatCard label="Variant A" value={stats.variantA} />
          <StatCard label="Variant B" value={stats.variantB} />
          <StatCard label="Gemiddelde invultijd" value={formatDuration(stats.avgDurationMs)} />
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function formatDuration(ms: number) {
  if (!ms) return "0s";
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
}
