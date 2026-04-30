'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type Step = 0 | 1 | 2 | 3;

export default function NewTrackPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState({
    name: '',
    targetFunction: 'engineering',
    targetSeniority: 'senior',
    targetLocationType: 'remote' as 'remote' | 'hybrid' | 'onsite',
    preferredCities: '',
    preferredCountries: '',
    mustHaveSkills: '',
    niceToHaveSkills: '',
    targetCompanies: '',
    excludedCompanies: '',
    minMatchScore: 70,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const payload = {
      name: form.name,
      targetFunction: form.targetFunction,
      targetSeniority: form.targetSeniority,
      targetLocationType: form.targetLocationType,
      preferredCities: form.preferredCities.split(',').map((s) => s.trim()).filter(Boolean),
      preferredCountries: form.preferredCountries.split(',').map((s) => s.trim()).filter(Boolean),
      mustHaveSkills: form.mustHaveSkills.split(',').map((s) => s.trim()).filter(Boolean),
      niceToHaveSkills: form.niceToHaveSkills.split(',').map((s) => s.trim()).filter(Boolean),
      targetCompanies: form.targetCompanies.split(',').map((s) => s.trim()).filter(Boolean),
      excludedCompanies: form.excludedCompanies.split(',').map((s) => s.trim()).filter(Boolean),
      minMatchScore: Number(form.minMatchScore) || 60,
    };
    const res = await fetch('/api/tracks', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? 'Failed to create track');
      return;
    }
    router.push(`/tracks?flash=${encodeURIComponent('Track created. Matches will populate as new jobs come in.')}&tone=success`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>New career track — step {step + 1} of 4</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <label className="text-sm font-medium">Track name</label>
              <Input
                placeholder="e.g. Senior backend engineer, remote EU"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
              />
            </>
          )}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Function</label>
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.targetFunction}
                  onChange={(e) => update('targetFunction', e.target.value)}
                >
                  {['engineering', 'product', 'design', 'data', 'marketing', 'sales', 'operations', 'finance', 'legal', 'people', 'support', 'other'].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Seniority</label>
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.targetSeniority}
                  onChange={(e) => update('targetSeniority', e.target.value)}
                >
                  {['intern', 'junior', 'mid', 'senior', 'staff', 'principal', 'manager', 'director', 'vp', 'executive'].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium">Location type</label>
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={form.targetLocationType}
                  onChange={(e) => update('targetLocationType', e.target.value as never)}
                >
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">Onsite</option>
                </select>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Must-have skills (comma-separated)</label>
                <Input value={form.mustHaveSkills} onChange={(e) => update('mustHaveSkills', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Nice-to-have skills</label>
                <Input value={form.niceToHaveSkills} onChange={(e) => update('niceToHaveSkills', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Preferred cities</label>
                <Input value={form.preferredCities} onChange={(e) => update('preferredCities', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Preferred countries</label>
                <Input value={form.preferredCountries} onChange={(e) => update('preferredCountries', e.target.value)} />
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Target companies</label>
                <Input value={form.targetCompanies} onChange={(e) => update('targetCompanies', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Excluded companies</label>
                <Input value={form.excludedCompanies} onChange={(e) => update('excludedCompanies', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Minimum match score (0-100)</label>
                <Input
                  type="number"
                  value={form.minMatchScore}
                  onChange={(e) => update('minMatchScore', Number(e.target.value))}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <Button variant="outline" disabled={step === 0} onClick={() => setStep((step - 1) as Step)}>
              Back
            </Button>
            {step < 3 ? (
              <Button onClick={() => setStep((step + 1) as Step)}>Next</Button>
            ) : (
              <Button onClick={submit} disabled={submitting}>
                {submitting ? 'Creating…' : 'Create track'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
