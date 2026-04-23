import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type { ResumeJson } from './schema';

export async function renderResumeDocx(resume: ResumeJson): Promise<Uint8Array> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: resume.fullName, bold: true, size: 36 })],
    }),
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: resume.headline, italics: true, size: 22 })],
    }),
  );
  const contact = [resume.email, resume.phone, resume.location, ...resume.links.map((l) => l.url)]
    .filter(Boolean)
    .join('  ·  ');
  children.push(new Paragraph({ children: [new TextRun({ text: contact, size: 18 })] }));

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Summary' }));
  children.push(new Paragraph({ children: [new TextRun({ text: resume.summary, size: 22 })] }));

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Skills' }));
  children.push(
    new Paragraph({ children: [new TextRun({ text: resume.skills.join(' · '), size: 22 })] }),
  );

  children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Experience' }));
  for (const exp of resume.experience) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${exp.title} — ${exp.company}`, bold: true, size: 24 }),
        ],
      }),
    );
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${exp.startDate} – ${exp.endDate ?? 'Present'}${exp.location ? ` · ${exp.location}` : ''}`,
            italics: true,
            size: 20,
          }),
        ],
      }),
    );
    for (const b of exp.bullets) {
      children.push(new Paragraph({ text: b.text, bullet: { level: 0 } }));
    }
  }

  if (resume.projects.length > 0) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Projects' }));
    for (const p of resume.projects) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: p.name, bold: true, size: 24 })] }),
      );
      children.push(new Paragraph({ text: p.description }));
      for (const b of p.bullets ?? []) {
        children.push(new Paragraph({ text: b.text, bullet: { level: 0 } }));
      }
    }
  }

  if (resume.education.length > 0) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Education' }));
    for (const e of resume.education) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${e.degree}${e.field ? `, ${e.field}` : ''} — ${e.school}`,
              bold: true,
              size: 22,
            }),
          ],
        }),
      );
      if (e.startDate || e.endDate) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `${e.startDate ?? ''} – ${e.endDate ?? ''}`, italics: true }),
            ],
          }),
        );
      }
      if (e.notes) children.push(new Paragraph({ text: e.notes }));
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  return new Uint8Array(buf);
}
