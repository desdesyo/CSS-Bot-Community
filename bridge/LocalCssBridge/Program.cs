using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace LocalCssBridge;

internal static class Program
{
    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true, WriteIndented = true };
    private static readonly string DataDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "LocalCssBridge");
    private static readonly string TokenPath = Path.Combine(DataDirectory, "github-token.dpapi");
    private static readonly string StatePath = Path.Combine(DataDirectory, "processed-tasks.json");

    public static async Task<int> Main(string[] args)
    {
        if (!OperatingSystem.IsWindows()) { Console.Error.WriteLine("Local CSS Bridge requires Windows."); return 2; }
        var rootArg = ReadArgument(args, "--root");
        var configuredRoot = Path.GetFullPath(rootArg ?? @"C:\Games\Counter-Strike Source v34");
        Directory.CreateDirectory(DataDirectory);
        var token = await LoadOrCreateTokenAsync();
        if (string.IsNullOrWhiteSpace(token)) return 3;
        var state = LoadState();
        using var client = new GitHubQueueClient(token);
        Console.WriteLine("Local CSS Bridge — READ ONLY");
        Console.WriteLine("Configured root: " + configuredRoot);
        Console.WriteLine("Polling GitHub Issues every 60 seconds. Ctrl+C to stop.");
        using var stop = new CancellationTokenSource();
        Console.CancelKeyPress += (_, e) => { e.Cancel = true; stop.Cancel(); };

        while (!stop.IsCancellationRequested)
        {
            try
            {
                foreach (var issue in await client.GetQueuedIssuesAsync(stop.Token))
                {
                    if (stop.IsCancellationRequested) break;
                    if (state.Contains(issue.Number)) continue;
                    await ProcessIssueAsync(client, issue, configuredRoot, state, stop.Token);
                }
            }
            catch (OperationCanceledException) when (stop.IsCancellationRequested) { break; }
            catch (Exception ex) { Console.Error.WriteLine("Queue error: " + SafeMessage(ex.Message)); }
            try { await Task.Delay(TimeSpan.FromSeconds(60), stop.Token); }
            catch (OperationCanceledException) { break; }
        }
        return 0;
    }

    private static async Task ProcessIssueAsync(GitHubQueueClient client, QueueIssue issue, string configuredRoot, ProcessedState state, CancellationToken ct)
    {
        BridgeTask? task;
        try
        {
            if (issue.Body.Length > 8192) return;
            using var payload = JsonDocument.Parse(issue.Body);
            if (!payload.RootElement.TryGetProperty("operation", out _)) return;
            var allowed = new HashSet<string>(StringComparer.Ordinal) { "schemaVersion", "taskId", "operation", "gameRoot", "maxFiles", "maxFileBytesForHash" };
            if (payload.RootElement.EnumerateObject().Any(p => !allowed.Contains(p.Name)))
                throw new InvalidDataException("Task contains unknown properties.");
            task = JsonSerializer.Deserialize<BridgeTask>(issue.Body, JsonOptions);
            if (task is null || task.SchemaVersion != 1 || task.Operation != "scan" ||
                string.IsNullOrWhiteSpace(task.TaskId) || task.TaskId.Length > 80 ||
                task.TaskId.Any(c => !(char.IsAsciiLetterOrDigit(c) || c == '.' || c == '_' || c == '-')) ||
                string.IsNullOrWhiteSpace(task.GameRoot) || task.GameRoot.Length > 512)
                throw new InvalidDataException("Task schema or operation is not allowed.");
        }
        catch (Exception ex)
        {
            await client.PostCommentAsync(issue.Number, "Local CSS Bridge rejected this task: " + SafeMessage(ex.Message), ct);
            state.Add(issue.Number); SaveState(state); return;
        }

        string requestedRoot;
        try { requestedRoot = Path.GetFullPath(task.GameRoot); }
        catch
        {
            await client.PostCommentAsync(issue.Number, "Task rejected: gameRoot is not a valid local path.", ct);
            state.Add(issue.Number); SaveState(state); return;
        }
        if (!string.Equals(requestedRoot.TrimEnd(Path.DirectorySeparatorChar), configuredRoot.TrimEnd(Path.DirectorySeparatorChar), StringComparison.OrdinalIgnoreCase))
        {
            await client.PostCommentAsync(issue.Number, "Task rejected: requested gameRoot does not match the configured allowlisted root.", ct);
            state.Add(issue.Number); SaveState(state); return;
        }

        ScanReport report;
        try { report = await ReadOnlyScanner.ScanAsync(task, configuredRoot, ct); }
        catch (Exception ex)
        {
            report = new ScanReport { TaskId = task.TaskId, Status = "failed", StartedUtc = DateTimeOffset.UtcNow,
                CompletedUtc = DateTimeOffset.UtcNow, Root = configuredRoot, Errors = [SafeMessage(ex.Message)] };
        }
        var json = JsonSerializer.Serialize(report, JsonOptions);
        if (json.Length > 42000)
        {
            foreach (var file in report.Files)
            {
                if (file.PeImports is { Count: > 32 }) file.PeImports = file.PeImports.Take(32).ToList();
                if (file.PeExports is { Count: > 32 }) file.PeExports = file.PeExports.Take(32).ToList();
            }
            var originalCount = report.Files.Count;
            var keep = Math.Min(originalCount, 400);
            do
            {
                report.Files = report.Files.Take(keep).ToList();
                report.Status = "partial";
                json = JsonSerializer.Serialize(report, JsonOptions);
                keep -= 50;
            } while (json.Length > 42000 && keep >= 0);
            report.Errors.Add($"Report shortened from {originalCount} records to {report.Files.Count} records to fit GitHub comment limits; summary counts cover the full scan.");
            json = JsonSerializer.Serialize(report, JsonOptions);
        }
        var comment = "## Local CSS Bridge scan report\n\n" + json;
        if (comment.Length > 60000) comment = "## Local CSS Bridge scan report\n\nReport metadata exceeded the safe comment size. Retry with a lower maxFiles value.";
        await client.PostCommentAsync(issue.Number, comment, ct);
        state.Add(issue.Number); SaveState(state);
        Console.WriteLine("Task " + task.TaskId + ": " + report.Status + "; " + report.Files.Count + " records posted.");
    }

    private static async Task<string?> LoadOrCreateTokenAsync()
    {
        if (File.Exists(TokenPath))
        {
            try { return Encoding.UTF8.GetString(ProtectedData.Unprotect(await File.ReadAllBytesAsync(TokenPath), null, DataProtectionScope.CurrentUser)); }
            catch { Console.Error.WriteLine("Stored token could not be decrypted. Re-enter it."); }
        }
        Console.Write("GitHub fine-grained token (input hidden): ");
        var chars = new List<char>();
        while (true)
        {
            var key = Console.ReadKey(true);
            if (key.Key == ConsoleKey.Enter) break;
            if (key.Key == ConsoleKey.Backspace) { if (chars.Count > 0) chars.RemoveAt(chars.Count - 1); continue; }
            if (!char.IsControl(key.KeyChar)) chars.Add(key.KeyChar);
        }
        Console.WriteLine();
        var token = new string(chars.ToArray()).Trim();
        if (token.Length < 20) { Console.Error.WriteLine("Token was empty or too short."); return null; }
        var encrypted = ProtectedData.Protect(Encoding.UTF8.GetBytes(token), null, DataProtectionScope.CurrentUser);
        await File.WriteAllBytesAsync(TokenPath, encrypted);
        return token;
    }

    private static ProcessedState LoadState()
    {
        try { return JsonSerializer.Deserialize<ProcessedState>(File.ReadAllText(StatePath), JsonOptions) ?? new(); }
        catch { return new(); }
    }
    private static void SaveState(ProcessedState state) => File.WriteAllText(StatePath, JsonSerializer.Serialize(state, JsonOptions));
    private static string? ReadArgument(string[] args, string name)
    {
        var index = Array.IndexOf(args, name);
        return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
    }
    private static string SafeMessage(string value)
    {
        var clean = value.Replace("\r", " ").Replace("\n", " ");
        return clean[..Math.Min(clean.Length, 500)];
    }
}

internal sealed class BridgeTask
{
    public int SchemaVersion { get; set; }
    public string TaskId { get; set; } = "";
    public string Operation { get; set; } = "";
    public string GameRoot { get; set; } = "";
    public int MaxFiles { get; set; } = 5000;
    public long MaxFileBytesForHash { get; set; } = 536870912;
}
internal sealed class ProcessedState
{
    public HashSet<int> IssueNumbers { get; set; } = [];
    public bool Contains(int number) => IssueNumbers.Contains(number);
    public void Add(int number) => IssueNumbers.Add(number);
}
internal sealed class ScanReport
{
    public int SchemaVersion { get; set; } = 1;
    public string TaskId { get; set; } = "";
    public string Status { get; set; } = "partial";
    public DateTimeOffset StartedUtc { get; set; }
    public DateTimeOffset CompletedUtc { get; set; }
    public string Root { get; set; } = "";
    public Dictionary<string, long> Summary { get; set; } = [];
    public List<FileRecord> Files { get; set; } = [];
    public List<string> Errors { get; set; } = [];
}
internal sealed class FileRecord
{
    public string RelativePath { get; set; } = "";
    public long Length { get; set; }
    public DateTimeOffset LastWriteUtc { get; set; }
    public string? Sha256 { get; set; }
    public string Status { get; set; } = "";
    public string Extension { get; set; } = "";
    public string? FileVersion { get; set; }
    public string? PeArchitecture { get; set; }
    public string? PeSubsystem { get; set; }
    public bool? PeIsDll { get; set; }
    public List<string>? PeImports { get; set; }
    public int? PeExportCount { get; set; }
    public List<string>? PeExports { get; set; }
    public string? PeAnalysisStatus { get; set; }
    public string? TextKind { get; set; }
    public int? TextLines { get; set; }
    public int? TextErrorMatches { get; set; }
    public int? TextWarningMatches { get; set; }
    public int? TextKeyValueLines { get; set; }
    public int? TextSyntaxIssues { get; set; }
    public bool? TextTruncated { get; set; }
    public string? TextAnalysisStatus { get; set; }
}
