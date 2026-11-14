using System.Text;

namespace LocalCssBridge;

internal static class TextFileAnalyzer
{
    private static readonly HashSet<string> ConfigExtensions = new(StringComparer.OrdinalIgnoreCase)
        { ".cfg", ".ini", ".vdf", ".txt", ".res", ".kv" };
    private static readonly string[] ErrorTerms = ["error", "failed", "missing", "cannot", "could not", "not found", "unable", "exception"];
    private const int MaxReadBytes = 1024 * 1024;

    public static void Analyze(string path, FileRecord record)
    {
        if (!ConfigExtensions.Contains(record.Extension) && !record.RelativePath.Contains("log", StringComparison.OrdinalIgnoreCase))
            return;
        try
        {
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            var length = (int)Math.Min(stream.Length, MaxReadBytes);
            var bytes = new byte[length];
            var read = stream.Read(bytes, 0, length);
            var text = Encoding.UTF8.GetString(bytes, 0, read).Replace("\0", "");
            var lines = text.Split('\n');
            record.TextKind = record.RelativePath.Contains("log", StringComparison.OrdinalIgnoreCase) ? "log_or_text" : "config_or_text";
            record.TextLines = lines.Length;
            record.TextErrorMatches = lines.Count(line => ErrorTerms.Any(term => line.Contains(term, StringComparison.OrdinalIgnoreCase)));
            record.TextTruncated = stream.Length > MaxReadBytes;
            record.TextAnalysisStatus = "analyzed";
        }
        catch (Exception ex) { record.TextAnalysisStatus = "error:" + ex.GetType().Name; }
    }
}
