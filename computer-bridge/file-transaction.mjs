import { copyFile, mkdir, open, readFile, rename, stat, lstat, unlink } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { randomUUID, createHash } from "node:crypto";

const sha256 = value => createHash("sha256").update(value).digest("hex");

export async function applyFileTransaction(target, data, {
  expectedBeforeHash,
  backupRoot,
  maxExistingBytes = 5 * 1024 * 1024
}) {
  if (typeof target !== "string" || !Buffer.isBuffer(data)) throw new Error("Invalid file transaction input");
  const linkInfo = await lstat(target).catch(error => { if (error?.code === "ENOENT") return null; throw error; });
  if (linkInfo?.isSymbolicLink()) throw new Error("Symbolic-link targets are not allowed");
  const beforeInfo = await stat(target).catch(error => {
    if (error?.code === "ENOENT") return null;
    throw error;
  });
  if (beforeInfo && (!beforeInfo.isFile() || beforeInfo.size > maxExistingBytes))
    throw new Error("Existing target must be a regular file within the configured size limit");
  const beforeBytes = beforeInfo ? await readFile(target) : null;
  const beforeHash = beforeBytes ? sha256(beforeBytes) : "NEW";
  if (beforeHash.toLowerCase() !== String(expectedBeforeHash).toLowerCase())
    throw new Error("File changed after approval; refusing to overwrite a newer version.");

  const backupPath = beforeInfo
    ? resolve(backupRoot, new Date().toISOString().replace(/[:.]/g, "-") + "-" + randomUUID().slice(0, 8) + "-" + target.split(sep).pop() + ".bak")
    : null;
  if (backupPath) {
    await mkdir(dirname(backupPath), { recursive: true });
    await copyFile(target, backupPath);
    if (sha256(await readFile(backupPath)) !== beforeHash)
      throw new Error("Backup verification failed; original file was not changed.");
  }

  const temp = target + ".solo-" + randomUUID() + ".tmp";
  let renamed = false;
  const afterHash = sha256(data);
  try {
    const handle = await open(temp, "wx");
    try { await handle.writeFile(data); await handle.sync(); }
    finally { await handle.close(); }

    const currentNow = await stat(target).then(async () => sha256(await readFile(target))).catch(error => {
      if (error?.code === "ENOENT") return "NEW";
      throw error;
    });
    if (currentNow.toLowerCase() !== beforeHash.toLowerCase())
      throw new Error("File changed during transaction; refusing to overwrite a newer version.");

    await rename(temp, target);
    renamed = true;
    if (sha256(await readFile(target)) !== afterHash)
      throw new Error("Post-write SHA-256 verification failed.");
    return { beforeHash, afterHash, backupPath, status: "written_and_verified" };
  } catch (error) {
    await unlink(temp).catch(() => {});
    if (renamed) {
      try {
        if (backupPath) {
          await copyFile(backupPath, target);
          if (sha256(await readFile(target)) !== beforeHash) throw new Error("Rollback verification failed");
        } else {
          await unlink(target).catch(removeError => { if (removeError?.code !== "ENOENT") throw removeError; });
        }
      } catch (rollbackError) {
        throw new Error(error.message + " Rollback also failed: " + rollbackError.message);
      }
    }
    throw error;
  }
}

export async function restoreVerifiedBackup(target, backupPath, expectedCurrentHash, expectedBackupHash) {
  const [targetInfo, backupInfo] = await Promise.all([
    lstat(target), lstat(backupPath)
  ]);
  if (targetInfo.isSymbolicLink() || backupInfo.isSymbolicLink() || !targetInfo.isFile() || !backupInfo.isFile())
    throw new Error("Restore requires regular files; symbolic links are not allowed.");
  const current = await readFile(target);
  const backup = await readFile(backupPath);
  if (sha256(current) !== expectedCurrentHash) throw new Error("Current file hash does not match; refusing restore.");
  if (sha256(backup) !== expectedBackupHash) throw new Error("Backup hash does not match; refusing restore.");
  const temp = target + ".restore-" + randomUUID() + ".tmp";
  const handle = await open(temp, "wx");
  try { await handle.writeFile(backup); await handle.sync(); }
  finally { await handle.close(); }
  try {
    const currentNow = sha256(await readFile(target));
    if (currentNow !== expectedCurrentHash) throw new Error("Current file changed during restore; refusing overwrite.");
    await rename(temp, target);
    if (sha256(await readFile(target)) !== expectedBackupHash)
      throw new Error("Restored file verification failed.");
    return { restored: true, sha256: expectedBackupHash };
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
}
