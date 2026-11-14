using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace LocalCssBridge;

internal sealed class GitHubQueueClient : IDisposable
{
    private const string Repository = "desdesyo/CSS-Bot-Community";
    private const int PageSize = 100;
    private const int MaxPages = 10;
    private readonly HttpClient http = new();

    public GitHubQueueClient(string token)
    {
        http.BaseAddress = new Uri("https://api.github.com/");
        http.DefaultRequestHeaders.UserAgent.ParseAdd("LocalCssBridge/0.2");
        http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        http.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
        http.Timeout = TimeSpan.FromSeconds(30);
    }

    public async Task<List<QueueIssue>> GetQueuedIssuesAsync(CancellationToken ct)
    {
        var result = new List<QueueIssue>();
        for (var page = 1; page <= MaxPages; page++)
        {
            using var response = await http.GetAsync(
                $"repos/{Repository}/issues?state=open&per_page={PageSize}&page={page}", ct);
            response.EnsureSuccessStatusCode();
            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            var count = 0;
            foreach (var item in doc.RootElement.EnumerateArray())
            {
                count++;
                if (item.TryGetProperty("pull_request", out _)) continue;
                if (!item.TryGetProperty("number", out var number) ||
                    !item.TryGetProperty("title", out var title) ||
                    !title.GetString()!.StartsWith("Local CSS Bridge Task:", StringComparison.Ordinal) ||
                    !item.TryGetProperty("body", out var body)) continue;
                var bodyText = body.GetString() ?? "";
                if (bodyText.Length > 0 && bodyText.Length <= 8192 &&
                    bodyText.TrimStart().StartsWith("{", StringComparison.Ordinal))
                    result.Add(new QueueIssue(number.GetInt32(), bodyText));
            }
            if (count < PageSize) break;
        }
        return result;
    }

    public async Task PostCommentAsync(int issueNumber, string body, CancellationToken ct)
    {
        var payload = JsonSerializer.Serialize(new { body });
        using var content = new StringContent(payload, Encoding.UTF8, "application/json");
        using var response = await http.PostAsync($"repos/{Repository}/issues/{issueNumber}/comments", content, ct);
        response.EnsureSuccessStatusCode();
    }

    public void Dispose() => http.Dispose();
}

internal sealed record QueueIssue(int Number, string Body);
