import { put, del } from "@vercel/blob";

const BLOB_BASE = "pdfs";

export function getPaperPath(projectId: string, paperId: string) {
  return `${BLOB_BASE}/${projectId}/${paperId}.pdf`;
}

export async function saveFile(
  buffer: Buffer,
  projectId: string,
  paperId: string
): Promise<string> {
  const { url } = await put(getPaperPath(projectId, paperId), buffer, {
    access: "public",
    contentType: "application/pdf",
  });
  return url;
}

export async function deleteFile(url: string) {
  try {
    await del(url);
  } catch {
    // File may not exist
  }
}

export async function getFile(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}
