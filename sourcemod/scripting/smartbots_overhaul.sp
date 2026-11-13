#pragma semicolon 1
#pragma newdecls required

#include <sourcemod>

#define SBO_VERSION "0.1.0"

ConVar g_cvEnabled;
ConVar g_cvDifficulty;
ConVar g_cvQuota;
ConVar g_cvQuotaMode;

bool g_enabled = true;
bool g_bombPlanted;
int g_roundDeaths;

public Plugin myinfo =
{
    name = "Smart Bots Overhaul",
    author = "CSS Bot Community",
    description = "First playable server-side prototype: bot configuration and round-state telemetry.",
    version = SBO_VERSION,
    url = "https://github.com/desdesyo/CSS-Bot-Community"
};

public void OnPluginStart()
{
    g_cvEnabled = CreateConVar("sbo_enabled", "1", "Enable Smart Bots Overhaul prototype.", FCVAR_NOTIFY, true, 0.0, true, 1.0);
    g_cvDifficulty = CreateConVar("sbo_bot_difficulty", "2", "Stock CS:S bot difficulty (0-3).", FCVAR_NOTIFY, true, 0.0, true, 3.0);
    g_cvQuota = CreateConVar("sbo_bot_quota", "10", "Target bot quota.", FCVAR_NOTIFY, true, 0.0, true, 32.0);
    g_cvQuotaMode = CreateConVar("sbo_bot_quota_mode", "fill", "Bot quota mode.", FCVAR_NOTIFY);

    HookEvent("round_start", Event_RoundStart, EventHookMode_Post);
    HookEvent("round_end", Event_RoundEnd, EventHookMode_Post);
    HookEvent("bomb_planted", Event_BombPlanted, EventHookMode_Post);
    HookEvent("bomb_defused", Event_BombDefused, EventHookMode_Post);
    HookEvent("player_death", Event_PlayerDeath, EventHookMode_Post);

    RegAdminCmd("sm_sbo_status", Command_Status, ADMFLAG_GENERIC, "Show Smart Bots Overhaul prototype status.");
    RegAdminCmd("sm_sbo_apply", Command_Apply, ADMFLAG_CONFIG, "Apply Smart Bots Overhaul bot settings.");
    AutoExecConfig(true, "smartbots_overhaul");
    ApplyBotSettings();
}

public void OnConfigsExecuted()
{
    ApplyBotSettings();
}

void ApplyBotSettings()
{
    g_enabled = g_cvEnabled.BoolValue;
    if (!g_enabled)
        return;

    ServerCommand("bot_difficulty %d", g_cvDifficulty.IntValue);
    ServerCommand("bot_quota %d", g_cvQuota.IntValue);
    ServerCommand("bot_quota_mode %s", g_cvQuotaMode.StringValue);
}

public Action Command_Apply(int client, int args)
{
    ApplyBotSettings();
    ReplyToCommand(client, "[SBO] Settings applied. difficulty=%d quota=%d mode=%s",
        g_cvDifficulty.IntValue, g_cvQuota.IntValue, g_cvQuotaMode.StringValue);
    return Plugin_Handled;
}

public Action Command_Status(int client, int args)
{
    ReplyToCommand(client, "[SBO %s] enabled=%d | phase=%s | deaths=%d | bots=%d/%d",
        SBO_VERSION, g_enabled, g_bombPlanted ? "bomb-planted" : "normal",
        g_roundDeaths, CountBots(), g_cvQuota.IntValue);
    return Plugin_Handled;
}

int CountBots()
{
    int count;
    for (int i = 1; i <= MaxClients; i++)
        if (IsClientInGame(i) && IsFakeClient(i))
            count++;
    return count;
}

public void Event_RoundStart(Event event, const char[] name, bool dontBroadcast)
{
    g_bombPlanted = false;
    g_roundDeaths = 0;
}

public void Event_RoundEnd(Event event, const char[] name, bool dontBroadcast)
{
    // Round summary is intentionally telemetry-only in v0.1.
    PrintToServer("[SBO] Round ended; deaths=%d, bombPlanted=%d", g_roundDeaths, g_bombPlanted);
}

public void Event_BombPlanted(Event event, const char[] name, bool dontBroadcast)
{
    g_bombPlanted = true;
    PrintToServer("[SBO] Bomb planted: tactical phase changed.");
}

public void Event_BombDefused(Event event, const char[] name, bool dontBroadcast)
{
    g_bombPlanted = false;
    PrintToServer("[SBO] Bomb defused.");
}

public void Event_PlayerDeath(Event event, const char[] name, bool dontBroadcast)
{
    g_roundDeaths++;
}
