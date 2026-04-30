'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function ReviewEditor({
  reviewId,
  initialCoverLetter,
  initialNotes,
}: {
  reviewId: string;
  initialCoverLetter: string;
  initialNotes: string;
}) {
  const router = useRouter();
  const [coverLetter, setCoverLetter] = useState(initialCoverLetter);
  const [notes, setNotes] = useState(initialNotes);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(submit = false) {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/reviewers/${reviewId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ editedCoverLetter: coverLetter, reviewerNotes: notes, submit }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage(submit ? 'Submitted for candidate review' : 'Saved');
      if (submit) router.push('/reviewer');
      else router.refresh();
    } else {
      setMessage('Save failed');
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Cover letter (edit inline)</label>
        <textarea
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          rows={12}
          className="mt-1 w-full rounded-md border bg-background p-3 text-sm"
        />
      </div>
      <div>
        <label className="text-sm font-medium">Reviewer notes (seen by candidate)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border bg-background p-3 text-sm"
        />
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={() => save(false)} variant="outline" disabled={saving}>
          {saving ? 'Saving…' : 'Save draft'}
        </Button>
        <Button onClick={() => save(true)} disabled={saving}>
          Submit review
        </Button>
        {message && <span className="text-xs text-muted-foreground">{message}</span>}
      </div>
    </div>
  );
}
