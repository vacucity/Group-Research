import fs from "fs/promises";
import path from "path";

const STORAGE_ROOT = path.join(process.cwd(), "..", "storage", "pdfs");

export function getPaperPath(projectId: string, paperId: string) {
  return path.join(STORAGE_ROOT, projectId, `${paperId}.pdf`);
}

export async function saveFile(
  buffer: Buffer,
  projectId: string,
  paperId: string
): Promise<string> {
  const dir = path.join(STORAGE_ROOT, projectId);
  await fs.mkdir(dir, { recursive: true });
  const filePath = getPaperPath(projectId, paperId);
  await fs.writeFile(filePath, buffer);
  return filePath;
}

export async function deleteFile(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch {
    // File may not exist
  }
}

export async function getFile(filePath: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}
