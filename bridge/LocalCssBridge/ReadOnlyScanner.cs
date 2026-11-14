using System.Diagnostics;
using System.Security.Cryptography;

namespace LocalCssBridge;

internal static class ReadOnlyScanner
{
    public static Task<ScanReport> ScanAsync(BridgeTask task, string root, CancellationToken ct)
    {
        if (!Directory.Exists(root)) throw new DirectoryNotFoundException("Configured game directory does not exist.");
        var rootInfo = new DirectoryInfo(root);
        if ((rootInfo.Attributes & FileAttributes.ReparsePoint) != 0)
            throw new IOException("Configured game root is a reparse point; scanning is refused.");

        var canonicalRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var report = new ScanReport { TaskId = task.TaskId, StartedUtc = DateTimeOffset.UtcNow, Root = canonicalRoot.TrimEnd(Path.DirectorySeparatorChar) };
        var maxFiles = Math.Clamp(task.MaxFiles <= 0 ? 5000 : task.MaxFiles, 1, 20000);
        var maxHashBytes = Math.Clamp(task.MaxFileBytesForHash <= 0 ? 536870912 : task.MaxFileBytesForHash, 0, 1073741824);
        const int maxPendingDirectories = 10000;
        var pending = new Stack<string>();
        pending.Push(root);
        var seen = 0;
        long totalBytes = 0, hashed = 0, skipped = 0, unreadable = 0, empty = 0;
        var enumerationFailed = false;

        while (pending.Count > 0 && seen < maxFiles)
        {
            ct.ThrowIfCancellationRequested();
            var directory = pending.Pop();
            try
            {
                foreach (var entry in Directory.EnumerateFileSystemEntries(directory))
                {
                    ct.ThrowIfCancellationRequested();
                    try
                    {
                        var attributes = File.GetAttributes(entry);
                        if ((attributes & FileAttributes.ReparsePoint) != 0) continue;
                        var full = Path.GetFullPath(entry);
                        if (!full.StartsWith(canonicalRoot, StringComparison.OrdinalIgnoreCase)) continue;
                        if ((attributes & FileAttributes.Directory) != 0)
                        {
                            if (pending.Count >= maxPendingDirectories)
                                report.Errors.Add("Directory queue limit reached; some subdirectories were not scanned.");
                            else pending.Push(full);
                            continue;
                        }

                        var info = new FileInfo(full);
                        seen++;
                        totalBytes += info.Length;
                        var record = new FileRecord
                        {
                            RelativePath = Relative(canonicalRoot, full),
                            Length = info.Length,
                            LastWriteUtc = new DateTimeOffset(info.LastWriteTimeUtc, TimeSpan.Zero),
                            Extension = info.Extension.ToLowerInvariant()
                        };
                        if (info.Length == 0) { record.Status = "empty"; empty++; }
                        else if (info.Length > maxHashBytes) { record.Status = "hash_skipped_size_limit"; skipped++; }
                        else
                        {
                            try
                            {
                                using var input = new FileStream(full, FileMode.Open, FileAccess.Read,
                                    FileShare.ReadWrite | FileShare.Delete, 1024 * 1024, FileOptions.SequentialScan);
                                record.Sha256 = Convert.ToHexString(SHA256.HashData(input));
                                record.Status = "hashed";
                                hashed++;
                            }
                            catch (Exception ex)
                            {
                                record.Status = "unreadable";
                                unreadable++;
                                report.Errors.Add($"File read failed: {record.RelativePath} ({ex.GetType().Name})");
                            }
                        }
                        if (record.Extension is ".exe" or ".dll")
                        {
                            try { record.FileVersion = FileVersionInfo.GetVersionInfo(full).FileVersion; } catch { }
                            PeAnalyzer.Analyze(full, record);
                        }
                        TextFileAnalyzer.Analyze(full, record);
                        report.Files.Add(record);
                        if (seen >= maxFiles) break;
                    }
                    catch (Exception ex)
                    {
                        report.Errors.Add($"Entry skipped: {SafeRelative(canonicalRoot, entry)} ({ex.GetType().Name})");
                    }
                }
            }
            catch (Exception ex)
            {
                enumerationFailed = true;
                report.Errors.Add($"Directory read failed: {SafeRelative(canonicalRoot, directory)} ({ex.GetType().Name})");
            }
        }

        if (pending.Count > 0) report.Errors.Add($"File limit reached or directory queue capped; remaining directories: {pending.Count}.");
        report.Summary = new Dictionary<string, long>
        {
            ["filesSeen"] = seen, ["totalBytes"] = totalBytes, ["hashed"] = hashed,
            ["hashSkipped"] = skipped, ["unreadable"] = unreadable, ["empty"] = empty,
            ["directoriesRemaining"] = pending.Count
        };
        report.CompletedUtc = DateTimeOffset.UtcNow;
        report.Status = report.Errors.Count == 0 && !enumerationFailed ? "reported" : "partial";
        return Task.FromResult(report);
    }

    private static string Relative(string rootWithSeparator, string path) => Path.GetRelativePath(rootWithSeparator, path).Replace('\\', '/');
    private static string SafeRelative(string rootWithSeparator, string path)
    {
        try { return Relative(rootWithSeparator, path); }
        catch { return "[path unavailable]"; }
    }
}
