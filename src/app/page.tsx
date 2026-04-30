import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl py-24 text-center">
      <h1 className="text-5xl font-semibold tracking-tight">
        Get matched to the right roles.
        <br />
        <span className="text-muted-foreground">Ship tailored applications.</span>
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
        Job Radar scrapes company boards hourly, matches openings to your career track, and drafts a
        resume and cover letter before the role gets stale.
      </p>
      <div className="mt-10 flex items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/signup">Start free</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/jobs">Browse jobs</Link>
        </Button>
      </div>
    </div>
  );
}
