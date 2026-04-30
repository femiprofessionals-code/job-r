import Link from 'next/link';
import { requireUser } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-xl py-16">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Job Radar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Let&apos;s create your first career track. We&apos;ll use it to match new job postings as they appear.
          </p>
          <div className="flex gap-3">
            <Button asChild>
              <Link href="/tracks/new">Create a career track</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/dashboard">Skip for now</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
