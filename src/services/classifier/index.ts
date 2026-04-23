import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

export const classifierOutputSchema = z.object({
  function: z.enum([
    'engineering',
    'product',
    'design',
    'data',
    'marketing',
    'sales',
    'operations',
    'finance',
    'legal',
    'people',
    'support',
    'other',
  ]),
  seniority: z.enum([
    'intern',
    'junior',
    'mid',
    'senior',
    'staff',
    'principal',
    'manager',
    'director',
    'vp',
    'executive',
  ]),
  skills: z.array(z.string().min(1).max(60)).max(25),
  location_type: z.enum(['remote', 'hybrid', 'onsite']).nullable(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().max(400).optional(),
});

export type ClassifierOutput = z.infer<typeof classifierOutputSchema>;

const SYSTEM = `You are a precise job classifier. Given a job title and description,
return STRICT JSON with: function, seniority, skills (array of canonical technical or
domain skills, lowercase where applicable, deduped, max 25), location_type, confidence
(0-1), and an optional one-sentence rationale. Do NOT include any prose outside JSON.

Function values: engineering|product|design|data|marketing|sales|operations|finance|legal|people|support|other
Seniority values: intern|junior|mid|senior|staff|principal|manager|director|vp|executive
Location type: remote|hybrid|onsite|null`;

export async function classifyJob(input: {
  title: string;
  description: string;
  locationRaw?: string | null;
}): Promise<ClassifierOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
  const anthropic = new Anthropic({ apiKey });

  const resp = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Title: ${input.title}\nLocation: ${input.locationRaw ?? 'unknown'}\n\nDescription:\n${input.description.slice(0, 18_000)}`,
      },
    ],
  });

  const text = resp.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Classifier returned no JSON');
  const parsed = classifierOutputSchema.parse(JSON.parse(text.slice(start, end + 1)));
  return parsed;
}
