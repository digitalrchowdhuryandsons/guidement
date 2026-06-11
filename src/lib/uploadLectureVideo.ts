import * as tus from "tus-js-client";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const BUCKET = "course-materials";

/**
 * Resumable upload to Supabase Storage using the TUS protocol.
 * Supports files larger than 1 GB and resumes after dropped connections.
 *
 * Returns the storage object path (without the bucket prefix) on success.
 */
export async function uploadLectureVideo(
  file: File,
  pathPrefix: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not signed in");

  const ext = file.name.split(".").pop() || "mp4";
  const safe = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  return new Promise<string>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${SUPABASE_URL}/storage/v1/upload/resumable`,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      headers: {
        authorization: `Bearer ${token}`,
        "x-upsert": "true",
      },
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      metadata: {
        bucketName: BUCKET,
        objectName: safe,
        contentType: file.type || "video/mp4",
        cacheControl: "3600",
      },
      chunkSize: 6 * 1024 * 1024, // required by Supabase
      onError: (err) => reject(err),
      onProgress: (sent, total) => {
        onProgress?.(Math.round((sent / total) * 100));
      },
      onSuccess: () => resolve(safe),
    });

    upload.findPreviousUploads().then((prev) => {
      if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
      upload.start();
    });
  });
}

export function getSignedVideoUrl(path: string, expiresInSec = 3600) {
  return supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSec);
}
