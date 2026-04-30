import Anthropic from '@anthropic-ai/sdk';
import { coverLetterSchema, resumeJsonSchema, type CoverLetter, type ResumeJson } from './schema';
import { WRITING_RULES } from './writing-rules';

const MODEL = 'claude-opus-4-7';

export type ResumeGenerationInput = {
  profileResume: ResumeJson;
  job: {
    title: string;
    companyName: string;
    description: string;
    skills: string[];
  };
};

export type ResumeGenerationOutput = {
  resume: ResumeJson;
  coverLetter: CoverLetter;
  usage: Anthropic.Messages.Usage;
};

const RESUME_SYSTEM = `You are a senior resume writer. You produce a tailored resume as JSON and a
targeted cover letter as JSON. Output a single JSON object with top-level keys
"resume" and "coverLetter". No markdown, no commentary.\n\n${WRITING_RULES}`;

function extractJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON in model response');
  return JSON.parse(text.slice(start, end + 1));
}

export async function generateTailoredDraft(
  input: ResumeGenerationInput,
): Promise<ResumeGenerationOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY missing');
  const anthropic = new Anthropic({ apiKey });

  const userMessage = `TARGET JOB
Company: ${input.job.companyName}
Title: ${input.job.title}
Required skills: ${input.job.skills.join(', ') || 'unspecified'}

Job description:
${input.job.description.slice(0, 16_000)}

CANDIDATE BASE RESUME (JSON):
${JSON.stringify(input.profileResume, null, 2)}

Produce a tailored resume and cover letter as:
{
  "resume": <resume JSON matching the schema in the rules>,
  "coverLetter": { "greeting": string, "opening": string, "body": [string,...], "closing": string, "signature": string }
}`;

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: RESUME_SYSTEM,
    messages: [{ role: 'user', content: userMessage }],
  });

  const text = resp.content
    .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('');
  const parsed = extractJson(text) as { resume: unknown; coverLetter: unknown };

  const resume = resumeJsonSchema.parse(parsed.resume);
  const coverLetter = coverLetterSchema.parse(parsed.coverLetter);

  return { resume, coverLetter, usage: resp.usage };
}
