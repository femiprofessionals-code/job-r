import type { MatchBreakdown } from '@/db/schema/matches';

type SeniorityLevel =
  | 'intern'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'staff'
  | 'principal'
  | 'manager'
  | 'director'
  | 'vp'
  | 'executive';

const SENIORITY_ORDER: SeniorityLevel[] = [
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
];

const WEIGHTS = {
  function: 0.25,
  seniority: 0.2,
  skills: 0.25,
  location: 0.15,
  company: 0.1,
  experience: 0.05,
} as const;

export type MatcherInput = {
  track: {
    targetFunction: string;
    targetSeniority: SeniorityLevel;
    targetLocationType: 'remote' | 'hybrid' | 'onsite' | null;
    preferredCities: string[];
    preferredCountries: string[];
    mustHaveSkills: string[];
    niceToHaveSkills: string[];
    excludedCompanies: string[];
    targetCompanies: string[];
  };
  profile: {
    yearsExperience: number | null;
    skills: string[];
  };
  job: {
    function: string | null;
    seniority: SeniorityLevel | null;
    skills: string[];
    locationType: 'remote' | 'hybrid' | 'onsite' | null;
    locationCity: string | null;
    locationCountry: string | null;
    companyName: string;
  };
};

export type MatchScore = {
  overallScore: number;
  breakdown: MatchBreakdown;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function functionScore(track: MatcherInput['track'], job: MatcherInput['job']): number {
  if (!job.function) return 0.3;
  return job.function === track.targetFunction ? 1 : 0;
}

function seniorityScore(track: MatcherInput['track'], job: MatcherInput['job']): number {
  if (!job.seniority) return 0.4;
  const a = SENIORITY_ORDER.indexOf(track.targetSeniority);
  const b = SENIORITY_ORDER.indexOf(job.seniority);
  if (a === -1 || b === -1) return 0.3;
  const distance = Math.abs(a - b);
  if (distance === 0) return 1;
  if (distance === 1) return 0.7;
  if (distance === 2) return 0.4;
  return 0.1;
}

function skillsScore(track: MatcherInput['track'], job: MatcherInput['job']): number {
  const jobSkills = new Set(job.skills.map((s) => s.toLowerCase()));
  if (jobSkills.size === 0) return 0.5;
  const must = track.mustHaveSkills.map((s) => s.toLowerCase());
  const nice = track.niceToHaveSkills.map((s) => s.toLowerCase());
  if (must.length === 0 && nice.length === 0) return 0.5;

  const mustHit = must.filter((s) => jobSkills.has(s)).length;
  const niceHit = nice.filter((s) => jobSkills.has(s)).length;

  const mustComponent = must.length === 0 ? 1 : mustHit / must.length;
  const niceComponent = nice.length === 0 ? 0 : niceHit / nice.length;

  return clamp01(mustComponent * 0.75 + niceComponent * 0.25);
}

function locationScore(track: MatcherInput['track'], job: MatcherInput['job']): number {
  let score = 0;
  if (track.targetLocationType && job.locationType === track.targetLocationType) score += 0.6;
  else if (track.targetLocationType && job.locationType === 'remote') score += 0.5;
  else if (!track.targetLocationType) score += 0.4;

  const cityHit =
    job.locationCity &&
    track.preferredCities.some((c) => c.toLowerCase() === job.locationCity?.toLowerCase());
  const countryHit =
    job.locationCountry &&
    track.preferredCountries.some(
      (c) => c.toLowerCase() === job.locationCountry?.toLowerCase(),
    );

  if (cityHit) score += 0.4;
  else if (countryHit) score += 0.3;
  else if (job.locationType === 'remote') score += 0.2;

  return clamp01(score);
}

function companyScore(track: MatcherInput['track'], job: MatcherInput['job']): number {
  const name = job.companyName.toLowerCase();
  if (track.excludedCompanies.some((c) => c.toLowerCase() === name)) return 0;
  if (track.targetCompanies.some((c) => c.toLowerCase() === name)) return 1;
  return 0.5;
}

function experienceScore(
  track: MatcherInput['track'],
  profile: MatcherInput['profile'],
): number {
  const years = profile.yearsExperience ?? 0;
  const target = SENIORITY_ORDER.indexOf(track.targetSeniority);
  const expected = [0, 1, 3, 5, 8, 10, 6, 10, 15, 20][target] ?? 5;
  const delta = Math.abs(years - expected);
  if (delta <= 1) return 1;
  if (delta <= 3) return 0.7;
  if (delta <= 5) return 0.4;
  return 0.2;
}

export function scoreMatch(input: MatcherInput): MatchScore {
  const breakdown: MatchBreakdown = {
    function: Math.round(functionScore(input.track, input.job) * 100),
    seniority: Math.round(seniorityScore(input.track, input.job) * 100),
    skills: Math.round(skillsScore(input.track, input.job) * 100),
    location: Math.round(locationScore(input.track, input.job) * 100),
    company: Math.round(companyScore(input.track, input.job) * 100),
    experience: Math.round(experienceScore(input.track, input.profile) * 100),
  };

  const overall =
    breakdown.function * WEIGHTS.function +
    breakdown.seniority * WEIGHTS.seniority +
    breakdown.skills * WEIGHTS.skills +
    breakdown.location * WEIGHTS.location +
    breakdown.company * WEIGHTS.company +
    breakdown.experience * WEIGHTS.experience;

  return { overallScore: Math.round(overall), breakdown };
}
