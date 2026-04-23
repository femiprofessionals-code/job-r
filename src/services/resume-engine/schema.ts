import { z } from 'zod';

export const resumeBulletSchema = z.object({
  text: z.string().min(1).max(300),
  impact: z.string().max(200).optional(),
});

export const resumeExperienceSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  bullets: z.array(resumeBulletSchema).min(1).max(6),
});

export const resumeEducationSchema = z.object({
  school: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  notes: z.string().optional(),
});

export const resumeProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1).max(400),
  link: z.string().url().optional(),
  bullets: z.array(resumeBulletSchema).max(4).optional(),
});

export const resumeJsonSchema = z.object({
  fullName: z.string().min(1),
  headline: z.string().min(1).max(140),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(z.object({ label: z.string(), url: z.string().url() })).max(6).default([]),
  summary: z.string().min(1).max(600),
  skills: z.array(z.string().min(1).max(40)).min(3).max(30),
  experience: z.array(resumeExperienceSchema).min(1),
  education: z.array(resumeEducationSchema).default([]),
  projects: z.array(resumeProjectSchema).max(6).default([]),
});

export type ResumeJson = z.infer<typeof resumeJsonSchema>;

export const coverLetterSchema = z.object({
  greeting: z.string().min(1),
  opening: z.string().min(1),
  body: z.array(z.string().min(1)).min(1).max(4),
  closing: z.string().min(1),
  signature: z.string().min(1),
});

export type CoverLetter = z.infer<typeof coverLetterSchema>;
