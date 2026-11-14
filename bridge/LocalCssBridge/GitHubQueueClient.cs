using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;

namespace LocalCssBridge;

internal sealed class GitHubQueueClient : IDisposable
{
    private const string Repository = "desdesyo/CSS-Bot-Community";
    private readonly HttpClient http = new();

    public GitHubQueueClient(string token)
    {
        http.BaseAddress = new Uri("https://api.github.com/");
        http.DefaultRequestHeaders.UserAgent.ParseAdd("LocalCssBridge/0.1");
        http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        http.DefaultRequestHeaders.Add("X-GitHub-Api-Version", "2022-11-28");
        http.Timeout = TimeSpan.FromSeconds(30);
    }

    public async Task<List<QueueIssue>> GetQueuedIssuesAsync(CancellationToken ct)
    {
        using var response = await http.GetAsync($"repos/{Repository}/issues?state=open&labels=css-bridge-task&per_page=50", ct);
        response.EnsureSuccessStatusCode();
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
        var result = new List<QueueIssue>();
        foreach (var item in doc.RootElement.EnumerateArray())
        {
            if (item.TryGetProperty("pull_request", out _)) continue;
            if (!item.TryGetProperty("number", out var number) || !item.TryGetProperty("body", out var body)) continue;
            result.Add(new QueueIssue(number.GetInt32(), body.GetString() ?? ""));
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
