import { coverLetterSchema, resumeJsonSchema, type CoverLetter, type ResumeJson } from './schema';
import { WRITING_RULES } from './writing-rules';

const MODEL = 'llama-3.3-70b-versatile';

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
  usage: { input_tokens: number; output_tokens: number };
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
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY missing');

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

  const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      max_tokens: 8192,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: RESUME_SYSTEM },
        { role: 'user', content: userMessage },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Groq ${resp.status}: ${errText}`);
  }

  const json = (await resp.json()) as {
    choices: { message: { content: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error('Resume engine returned empty content');

  const parsed = extractJson(text) as { resume: unknown; coverLetter: unknown };
  const resume = resumeJsonSchema.parse(parsed.resume);
  const coverLetter = coverLetterSchema.parse(parsed.coverLetter);

  return {
    resume,
    coverLetter,
    usage: {
      input_tokens: json.usage?.prompt_tokens ?? 0,
      output_tokens: json.usage?.completion_tokens ?? 0,
    },
  };
}
