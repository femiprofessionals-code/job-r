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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY missing');

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Title: ${input.title}\nLocation: ${input.locationRaw ?? 'unknown'}\n\nDescription:\n${input.description.slice(0, 18_000)}`,
        },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Groq ${resp.status}: ${errText}`);
  }

  const json = (await resp.json()) as {
    choices: { message: { content: string } }[];
  };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error('Classifier returned empty content');

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Classifier returned no JSON');
  return classifierOutputSchema.parse(JSON.parse(text.slice(start, end + 1)));
}
