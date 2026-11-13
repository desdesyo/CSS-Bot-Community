#include <sourcemod>
#include <sdktools>

#define PLUGIN_VERSION "0.1.1"
#define TEAM_T 2
#define TEAM_CT 3

public Plugin myinfo =
{
    name = "CSS Bot Community",
    author = "CSSBC",
    description = "Русский серверный слой CSSBC: экономика и Джаггернаут",
    version = PLUGIN_VERSION,
    url = "https://github.com/desdesyo/CSS-Bot-Community"
};

ConVar g_enabled;
ConVar g_juggernautHp;
ConVar g_supportEnabled;
bool g_juggernaut[MAXPLAYERS + 1];

public void OnPluginStart()
{
    g_enabled = CreateConVar("cssbc_enabled", "1", "Включить CSSBC", FCVAR_NOTIFY, true, 0.0, true, 1.0);
    g_supportEnabled = CreateConVar("cssbc_support_enabled", "1", "Разрешить команды заказа поддержки", FCVAR_NOTIFY, true, 0.0, true, 1.0);
    g_juggernautHp = CreateConVar("cssbc_juggernaut_hp", "500", "Здоровье Джаггернаута", FCVAR_NOTIFY, true, 100.0, true, 2000.0);

    RegConsoleCmd("sm_cssbc", Cmd_Status, "Статус CSSBC");
    RegConsoleCmd("sm_support", Cmd_Support, "CSSBC: статус системы поддержки");
    RegConsoleCmd("sm_juggernaut", Cmd_Juggernaut, "CSSBC: купить Джаггернаута");

    HookEvent("player_death", Event_PlayerDeath, EventHookMode_Post);
    HookEvent("player_spawn", Event_PlayerSpawn, EventHookMode_Post);
    HookEvent("round_start", Event_RoundStart, EventHookMode_Post);
    HookEvent("round_end", Event_RoundEnd, EventHookMode_Post);

    AutoExecConfig(true, "cssbc");
}

public void OnClientPutInServer(int client)
{
    g_juggernaut[client] = false;
}

public void OnClientDisconnect(int client)
{
    g_juggernaut[client] = false;
}

public Action Cmd_Status(int client, int args)
{
    if (client > 0 && IsClientInGame(client))
    {
        PrintToChat(client, "\x04[CSSBC]\x01 Серверный мод активен. Версия %s.", PLUGIN_VERSION);
        PrintToChat(client, "[CSSBC] Доступно: Джаггернаут. NPC-отряд и полноценный AI ещё в разработке.");
    }
    return Plugin_Handled;
}

public Action Cmd_Support(int client, int args)
{
    if (client <= 0 || !IsClientInGame(client))
        return Plugin_Handled;

    if (!g_enabled.BoolValue || !g_supportEnabled.BoolValue)
    {
        PrintToChat(client, "[CSSBC] Заказ поддержки отключён.");
        return Plugin_Handled;
    }

    // Do not charge players for squad tiers until real NPC spawning is implemented.
    PrintToChat(client, "[CSSBC] Отряд поддержки пока не реализован. Деньги не списаны.");
    return Plugin_Handled;
}

public Action Cmd_Juggernaut(int client, int args)
{
    if (!ValidBuyer(client))
        return Plugin_Handled;

    if (g_juggernaut[client])
    {
        PrintToChat(client, "[CSSBC] Ты уже Джаггернаут.");
        return Plugin_Handled;
    }

    int deadAllies = CountDeadAllies(client);
    if (deadAllies < 3)
    {
        PrintToChat(client, "[CSSBC] Нужно минимум 3 погибших союзника в этом раунде. Сейчас: %d.", deadAllies);
        return Plugin_Handled;
    }

    int money = GetEntProp(client, Prop_Send, "m_iAccount");
    if (money < 16000)
    {
        PrintToChat(client, "[CSSBC] Джаггернаут стоит $16000. У тебя: $%d.", money);
        return Plugin_Handled;
    }

    int hp = g_juggernautHp.IntValue;
    SetEntProp(client, Prop_Send, "m_iAccount", money - 16000);
    if (HasEntProp(client, Prop_Send, "m_iMaxHealth"))
        SetEntProp(client, Prop_Send, "m_iMaxHealth", hp);
    SetEntityHealth(client, hp);
    g_juggernaut[client] = true;

    PrintToChatAll("\x04[CSSBC]\x01 %N стал Джаггернаутом! Здоровье: %d HP.", client, hp);
    return Plugin_Handled;
}

bool ValidBuyer(int client)
{
    if (!g_enabled.BoolValue || client <= 0 || !IsClientInGame(client) || !IsPlayerAlive(client))
        return false;

    int team = GetClientTeam(client);
    return (team == TEAM_T || team == TEAM_CT);
}

int CountDeadAllies(int client)
{
    int team = GetClientTeam(client);
    if (team != TEAM_T && team != TEAM_CT)
        return 0;

    int count = 0;
    for (int i = 1; i <= MaxClients; i++)
    {
        if (i == client || !IsClientInGame(i) || GetClientTeam(i) != team)
            continue;

        if (!IsPlayerAlive(i))
            count++;
    }
    return count;
}

public void Event_PlayerDeath(Event event, const char[] name, bool dontBroadcast)
{
    int attacker = GetClientOfUserId(event.GetInt("attacker"));
    if (attacker > 0 && attacker <= MaxClients && IsClientInGame(attacker) && g_juggernaut[attacker])
        PrintToChat(attacker, "[CSSBC] Цель устранена. Держи позицию.");
}

public void Event_PlayerSpawn(Event event, const char[] name, bool dontBroadcast)
{
    int client = GetClientOfUserId(event.GetInt("userid"));
    if (client > 0 && client <= MaxClients)
        g_juggernaut[client] = false;
}

public void Event_RoundStart(Event event, const char[] name, bool dontBroadcast)
{
    for (int i = 1; i <= MaxClients; i++)
        g_juggernaut[i] = false;
}

public void Event_RoundEnd(Event event, const char[] name, bool dontBroadcast)
{
    for (int i = 1; i <= MaxClients; i++)
    {
        if (g_juggernaut[i] && IsClientInGame(i))
        {
            if (HasEntProp(i, Prop_Send, "m_iMaxHealth"))
                SetEntProp(i, Prop_Send, "m_iMaxHealth", 100);
            if (GetClientHealth(i) > 100)
                SetEntityHealth(i, 100);
        }
        g_juggernaut[i] = false;
    }
}
