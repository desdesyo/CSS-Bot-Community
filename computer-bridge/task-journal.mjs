import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export async function readJournal(path) {
  try {
    const value = JSON.parse(await readFile(path, "utf8"));
    if (!value || typeof value !== "object" || !value.task || typeof value.task.id !== "string")
      throw new Error("Local task journal is invalid; refusing to poll for new work.");
    return value;
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

export async function writeJournal(path, value) {
  if (!value || typeof value !== "object" || !value.task || typeof value.task.id !== "string")
    throw new Error("Refusing to persist an invalid task journal.");
  await mkdir(dirname(path), { recursive: true });
  const temporary = path + "." + randomUUID() + ".tmp";
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(JSON.stringify(value), "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try { await rename(temporary, path); }
  catch (error) { await unlink(temporary).catch(() => {}); throw error; }
}

export async function removeJournal(path) {
  await unlink(path).catch(error => { if (error?.code !== "ENOENT") throw error; });
}
