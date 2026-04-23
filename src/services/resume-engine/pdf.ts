import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { CoverLetter, ResumeJson } from './schema';

const MARGIN = 48;
const PAGE_W = 612;
const PAGE_H = 792;

export async function renderResumePdf(resume: ResumeJson): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const text = (
    s: string,
    opts: { size?: number; font?: typeof font; color?: [number, number, number]; indent?: number } = {},
  ) => {
    const f = opts.font ?? font;
    const size = opts.size ?? 10;
    const [r, g, b] = opts.color ?? [0.1, 0.1, 0.1];
    const lines = wrap(s, f, size, PAGE_W - MARGIN * 2 - (opts.indent ?? 0));
    for (const line of lines) {
      ensureSpace(size + 4);
      page.drawText(line, {
        x: MARGIN + (opts.indent ?? 0),
        y: y - size,
        size,
        font: f,
        color: rgb(r, g, b),
      });
      y -= size + 4;
    }
  };

  text(resume.fullName, { size: 20, font: bold });
  text(resume.headline, { size: 11, color: [0.3, 0.3, 0.3] });
  const contactBits = [resume.email, resume.phone, resume.location, ...resume.links.map((l) => l.url)]
    .filter((v): v is string => !!v)
    .join('  ·  ');
  text(contactBits, { size: 9, color: [0.35, 0.35, 0.35] });
  y -= 6;

  text('Summary', { size: 11, font: bold, color: [0, 0, 0] });
  text(resume.summary, { size: 10 });
  y -= 4;

  text('Skills', { size: 11, font: bold });
  text(resume.skills.join(' · '), { size: 10 });
  y -= 6;

  text('Experience', { size: 11, font: bold });
  for (const exp of resume.experience) {
    ensureSpace(40);
    text(`${exp.title} — ${exp.company}`, { size: 10, font: bold });
    text(`${exp.startDate} – ${exp.endDate ?? 'Present'}${exp.location ? ` · ${exp.location}` : ''}`, {
      size: 9,
      color: [0.4, 0.4, 0.4],
    });
    for (const b of exp.bullets) {
      text(`• ${b.text}`, { size: 10, indent: 10 });
    }
    y -= 4;
  }

  if (resume.projects.length > 0) {
    text('Projects', { size: 11, font: bold });
    for (const p of resume.projects) {
      text(p.name, { size: 10, font: bold });
      text(p.description, { size: 10 });
      for (const b of p.bullets ?? []) text(`• ${b.text}`, { size: 10, indent: 10 });
      y -= 4;
    }
  }

  if (resume.education.length > 0) {
    text('Education', { size: 11, font: bold });
    for (const e of resume.education) {
      text(`${e.degree}${e.field ? `, ${e.field}` : ''} — ${e.school}`, { size: 10, font: bold });
      if (e.startDate || e.endDate) {
        text(`${e.startDate ?? ''} – ${e.endDate ?? ''}`, { size: 9, color: [0.4, 0.4, 0.4] });
      }
      if (e.notes) text(e.notes, { size: 10 });
    }
  }

  return pdf.save();
}

export async function renderCoverLetterPdf(
  letter: CoverLetter,
  candidateName: string,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const bold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const write = (s: string, opts: { size?: number; font?: typeof font } = {}) => {
    const f = opts.font ?? font;
    const size = opts.size ?? 11;
    const lines = wrap(s, f, size, PAGE_W - MARGIN * 2);
    for (const line of lines) {
      if (y - size < MARGIN) {
        page = pdf.addPage([PAGE_W, PAGE_H]);
        y = PAGE_H - MARGIN;
      }
      page.drawText(line, { x: MARGIN, y: y - size, size, font: f, color: rgb(0.1, 0.1, 0.1) });
      y -= size + 5;
    }
    y -= 6;
  };

  write(candidateName, { size: 14, font: bold });
  write(letter.greeting);
  write(letter.opening);
  for (const p of letter.body) write(p);
  write(letter.closing);
  write(letter.signature);
  return pdf.save();
}

function wrap(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxW) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}
