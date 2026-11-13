#include <sourcemod>
#include <sdktools>
#include <sdkhooks>

#define PLUGIN_VERSION "0.1.0"

public Plugin myinfo =
{
    name = "CSS Bot Community",
    author = "CSSBC",
    description = "Русский серверный слой CSSBC: поддержка и Джаггернаут",
    version = PLUGIN_VERSION,
    url = "https://github.com/desdesyo/CSS-Bot-Community"
};

ConVar g_enabled, g_juggernautHp, g_supportEnabled;
int g_deadAllies[MAXPLAYERS + 1];
bool g_juggernaut[MAXPLAYERS + 1];

public void OnPluginStart()
{
    g_enabled = CreateConVar("cssbc_enabled", "1", "Включить CSSBC", FCVAR_NOTIFY, true, 0.0, true, 1.0);
    g_supportEnabled = CreateConVar("cssbc_support_enabled", "1", "Разрешить покупку поддержки", FCVAR_NOTIFY, true, 0.0, true, 1.0);
    g_juggernautHp = CreateConVar("cssbc_juggernaut_hp", "500", "Здоровье Джаггернаута", FCVAR_NOTIFY, true, 100.0, true, 2000.0);

    RegConsoleCmd("sm_cssbc", Cmd_Status, "Статус CSSBC");
    RegConsoleCmd("sm_support", Cmd_Support, "CSSBC: купить поддержку");
    RegConsoleCmd("sm_juggernaut", Cmd_Juggernaut, "CSSBC: купить Джаггернаута");
    HookEvent("player_death", Event_PlayerDeath, EventHookMode_Post);
    HookEvent("round_start", Event_RoundStart, EventHookMode_Post);
    HookEvent("round_end", Event_RoundEnd, EventHookMode_Post);
    AutoExecConfig(true, "cssbc");
}

public void OnClientPutInServer(int client)
{
    g_deadAllies[client] = 0;
    g_juggernaut[client] = false;
}

public Action Cmd_Status(int client, int args)
{
    if (client > 0) PrintToChat(client, "\x04[CSSBC]\x01 Серверный мод активен. Русский интерфейс включён.");
    return Plugin_Handled;
}

public Action Cmd_Support(int client, int args)
{
    if (!ValidBuyer(client)) return Plugin_Handled;
    if (!g_supportEnabled.BoolValue) { PrintToChat(client, "[CSSBC] Поддержка отключена администратором."); return Plugin_Handled; }

    int tier = 1;
    if (args > 0) {
        char arg[8]; GetCmdArg(1, arg, sizeof(arg)); tier = StringToInt(arg);
    }
    int cost, count;
    switch (tier) {
        case 1: { cost = 1000; count = 1; }
        case 2: { cost = 3000; count = 2; }
        case 3: { cost = 9000; count = 4; }
        default: { PrintToChat(client, "[CSSBC] Используй: sm_support 1|2|3"); return Plugin_Handled; }
    }
    int money = GetEntProp(client, Prop_Send, "m_iAccount");
    if (money < cost) { PrintToChat(client, "[CSSBC] Не хватает денег: нужно $%d.", cost); return Plugin_Handled; }
    SetEntProp(client, Prop_Send, "m_iAccount", money - cost);
    PrintToChatAll("[CSSBC] %N заказал поддержку уровня %d ($%d).", client, tier, cost);
    // Tier 3 currently announces the squad order; SDK-backed NPC spawning is a separate adapter.
    if (tier == 3) PrintToChatAll("[CSSBC] Отряд поддержки готовится к высадке.");
    else PrintToChatAll("[CSSBC] Поддержка вызвана.");
    return Plugin_Handled;
}

public Action Cmd_Juggernaut(int client, int args)
{
    if (!ValidBuyer(client)) return Plugin_Handled;
    if (g_juggernaut[client]) { PrintToChat(client, "[CSSBC] Ты уже Джаггернаут."); return Plugin_Handled; }
    if (g_deadAllies[client] < 3) { PrintToChat(client, "[CSSBC] Нужно минимум 3 погибших союзника в этом раунде."); return Plugin_Handled; }
    int money = GetEntProp(client, Prop_Send, "m_iAccount");
    if (money < 16000) { PrintToChat(client, "[CSSBC] Джаггернаут стоит $16000."); return Plugin_Handled; }
    SetEntProp(client, Prop_Send, "m_iAccount", money - 16000);
    g_juggernaut[client] = true;
    SetEntProp(client, Prop_Send, "m_iHealth", g_juggernautHp.IntValue);
    SetEntProp(client, Prop_Send, "m_iMaxHealth", g_juggernautHp.IntValue);
    PrintToChatAll("[CSSBC] %N стал Джаггернаутом! Бронепластины пока отображаются серверным статусом.", client);
    return Plugin_Handled;
}

bool ValidBuyer(int client)
{
    if (!g_enabled.BoolValue || client <= 0 || !IsClientInGame(client) || !IsPlayerAlive(client)) return false;
    return true;
}

public void Event_PlayerDeath(Event event, const char[] name, bool dontBroadcast)
{
    int victim = GetClientOfUserId(event.GetInt("userid"));
    int attacker = GetClientOfUserId(event.GetInt("attacker"));
    if (victim <= 0) return;
    int team = GetClientTeam(victim);
    for (int i = 1; i <= MaxClients; i++)
        if (IsClientInGame(i) && GetClientTeam(i) == team && i != victim && !IsPlayerAlive(i))
            g_deadAllies[i]++;
    if (attacker > 0 && g_juggernaut[attacker]) PrintToChat(attacker, "[CSSBC] Цель устранена. Держи позицию.");
}

public void Event_RoundStart(Event event, const char[] name, bool dontBroadcast)
{
    for (int i = 1; i <= MaxClients; i++) { g_deadAllies[i] = 0; g_juggernaut[i] = false; }
}
public void Event_RoundEnd(Event event, const char[] name, bool dontBroadcast)
{
    for (int i = 1; i <= MaxClients; i++) g_juggernaut[i] = false;
}
