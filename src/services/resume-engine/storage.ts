import { COVER_LETTER_BUCKET, RESUME_BUCKET, supabaseAdmin } from '@/lib/supabase/admin';

async function ensureBucket(bucket: string) {
  const admin = supabaseAdmin();
  const { data } = await admin.storage.getBucket(bucket);
  if (!data) {
    await admin.storage.createBucket(bucket, { public: false });
  }
}

export async function uploadResumeArtifact(
  userId: string,
  draftId: string,
  ext: 'pdf' | 'docx',
  bytes: Uint8Array,
): Promise<string> {
  await ensureBucket(RESUME_BUCKET);
  const path = `${userId}/${draftId}/resume.${ext}`;
  const admin = supabaseAdmin();
  const { error } = await admin.storage.from(RESUME_BUCKET).upload(path, bytes, {
    contentType: ext === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function uploadCoverLetterArtifact(
  userId: string,
  draftId: string,
  bytes: Uint8Array,
): Promise<string> {
  await ensureBucket(COVER_LETTER_BUCKET);
  const path = `${userId}/${draftId}/cover.pdf`;
  const admin = supabaseAdmin();
  const { error } = await admin.storage.from(COVER_LETTER_BUCKET).upload(path, bytes, {
    contentType: 'application/pdf',
    upsert: true,
  });
  if (error) throw error;
  return path;
}

export async function signedArtifactUrl(bucket: string, path: string, expiresIn = 60 * 10) {
  const admin = supabaseAdmin();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
