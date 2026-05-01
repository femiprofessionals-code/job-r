'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Bullet = { text: string };
type Experience = {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current?: boolean;
  bullets: Bullet[];
};

type ResumeForm = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  skills: string;
  experience: Experience[];
};

const EMPTY_EXP: Experience = {
  company: '',
  title: '',
  location: '',
  startDate: '',
  endDate: '',
  current: true,
  bullets: [{ text: '' }],
};

export default function ResumeEditorPage() {
  const router = useRouter();
  const [form, setForm] = useState<ResumeForm>({
    fullName: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    summary: '',
    skills: '',
    experience: [{ ...EMPTY_EXP }],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile', { cache: 'no-store' });
        if (res.ok) {
          const { profile } = await res.json();
          if (profile?.resumeJson) {
            const r = profile.resumeJson;
            setForm({
              fullName: r.fullName ?? '',
              headline: r.headline ?? '',
              email: r.email ?? profile.email ?? '',
              phone: r.phone ?? '',
              location: r.location ?? '',
              summary: r.summary ?? '',
              skills: Array.isArray(r.skills) ? r.skills.join(', ') : '',
              experience:
                Array.isArray(r.experience) && r.experience.length > 0
                  ? r.experience.map((e: Experience) => ({
                      company: e.company ?? '',
                      title: e.title ?? '',
                      location: e.location ?? '',
                      startDate: e.startDate ?? '',
                      endDate: e.endDate ?? '',
                      current: !e.endDate,
                      bullets:
                        Array.isArray(e.bullets) && e.bullets.length > 0
                          ? e.bullets.map((b: Bullet | string) =>
                              typeof b === 'string' ? { text: b } : { text: b.text ?? '' },
                            )
                          : [{ text: '' }],
                    }))
                  : [{ ...EMPTY_EXP }],
            });
          } else if (profile?.email) {
            setForm((f) => ({ ...f, email: profile.email }));
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function setExp(i: number, patch: Partial<Experience>) {
    setForm((f) => ({
      ...f,
      experience: f.experience.map((e, idx) => (idx === i ? { ...e, ...patch } : e)),
    }));
  }

  function addExp() {
    setForm((f) => ({ ...f, experience: [...f.experience, { ...EMPTY_EXP }] }));
  }
  function removeExp(i: number) {
    setForm((f) => ({
      ...f,
      experience: f.experience.length > 1 ? f.experience.filter((_, idx) => idx !== i) : f.experience,
    }));
  }
  function addBullet(i: number) {
    setExp(i, { bullets: [...form.experience[i].bullets, { text: '' }] });
  }
  function setBullet(i: number, j: number, text: string) {
    setExp(i, {
      bullets: form.experience[i].bullets.map((b, idx) => (idx === j ? { text } : b)),
    });
  }
  function removeBullet(i: number, j: number) {
    const cur = form.experience[i].bullets;
    if (cur.length <= 1) return;
    setExp(i, { bullets: cur.filter((_, idx) => idx !== j) });
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);

    const skillsArr = form.skills.split(',').map((s) => s.trim()).filter(Boolean);
    if (skillsArr.length < 3) {
      setError('Please list at least 3 skills (comma-separated).');
      setSaving(false);
      return;
    }

    const experience = form.experience.map((e) => {
      const bullets = e.bullets.map((b) => ({ text: b.text.trim() })).filter((b) => b.text.length > 0);
      const out: Experience = {
        company: e.company.trim(),
        title: e.title.trim(),
        startDate: e.startDate.trim(),
        bullets,
      };
      if (e.location?.trim()) out.location = e.location.trim();
      if (!e.current && e.endDate?.trim()) out.endDate = e.endDate.trim();
      return out;
    });

    const resumeJson = {
      fullName: form.fullName.trim(),
      headline: form.headline.trim(),
      email: form.email.trim(),
      ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      ...(form.location.trim() ? { location: form.location.trim() } : {}),
      links: [],
      summary: form.summary.trim(),
      skills: skillsArr,
      experience,
      education: [],
      projects: [],
    };

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ resumeJson }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? `Save failed (${res.status})`);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Base resume</h1>
        <p className="text-sm text-muted-foreground">
          We use this to tailor a custom resume + cover letter for each match. Required fields: name,
          headline, email, summary, at least 3 skills, and at least one experience with one bullet.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Full name</label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Headline (e.g. Senior Product Manager)</label>
            <Input value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Email</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Phone (optional)</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Location (optional)</label>
            <Input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Summary (1–3 sentences)</label>
            <textarea
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              rows={4}
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Skills (comma-separated, at least 3)
            </label>
            <Input
              value={form.skills}
              placeholder="product strategy, sql, user research, roadmapping"
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {form.experience.map((exp, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Experience {i + 1}</CardTitle>
            {form.experience.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => removeExp(i)}>
                Remove
              </Button>
            )}
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Company</label>
                <Input value={exp.company} onChange={(e) => setExp(i, { company: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Title</label>
                <Input value={exp.title} onChange={(e) => setExp(i, { title: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Location</label>
                <Input
                  value={exp.location ?? ''}
                  onChange={(e) => setExp(i, { location: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Start (YYYY-MM)</label>
                <Input
                  placeholder="2022-01"
                  value={exp.startDate}
                  onChange={(e) => setExp(i, { startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">End (or current)</label>
                <Input
                  placeholder="2024-06"
                  disabled={exp.current}
                  value={exp.endDate ?? ''}
                  onChange={(e) => setExp(i, { endDate: e.target.value })}
                />
                <label className="mt-1 inline-flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={!!exp.current}
                    onChange={(e) =>
                      setExp(i, { current: e.target.checked, endDate: e.target.checked ? '' : exp.endDate })
                    }
                  />
                  Current role
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Bullets</div>
              {exp.bullets.map((b, j) => (
                <div key={j} className="flex gap-2">
                  <Input
                    value={b.text}
                    placeholder="Led X initiative resulting in Y outcome."
                    onChange={(e) => setBullet(i, j, e.target.value)}
                  />
                  {exp.bullets.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeBullet(i, j)}>
                      ×
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => addBullet(i)}>
                + Add bullet
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={addExp}>
          + Add experience
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save resume'}
        </Button>
        {error && <span className="text-sm text-destructive">{error}</span>}
        {saved && <span className="text-sm text-green-600">Saved.</span>}
      </div>
    </div>
  );
}
