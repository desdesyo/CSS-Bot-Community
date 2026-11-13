#include <sourcemod>
#define PLUGIN_VERSION "0.1.0"
#define LOG_FILE "logs/cssbc_ai.jsonl"
ConVar g_enabled;
char g_map[PLATFORM_MAX_PATH], g_logPath[PLATFORM_MAX_PATH];
public Plugin myinfo = { name = "CSSBC AI Event Logger", author = "CSSBC", description = "Structured gameplay events for AI analysis", version = PLUGIN_VERSION, url = "https://github.com/desdesyo/CSS-Bot-Community" };

public void OnPluginStart()
{
    g_enabled = CreateConVar("cssbc_ai_logger_enabled", "1", "Enable CSSBC AI event logging", FCVAR_NOTIFY, true, 0.0, true, 1.0);
    AutoExecConfig(true, "cssbc_ai_logger");
    HookEvent("round_start", Event_RoundStart);
    HookEvent("round_end", Event_RoundEnd);
    HookEvent("player_death", Event_PlayerDeath);
    HookEvent("player_hurt", Event_PlayerHurt);
    HookEvent("player_spawn", Event_PlayerSpawn);
    HookEvent("bomb_planted", Event_Bomb);
    HookEvent("bomb_defused", Event_Bomb);
    HookEvent("bomb_dropped", Event_Bomb);
    HookEvent("bomb_pickup", Event_Bomb);
    HookEvent("weapon_fire", Event_WeaponFire);
    GetCurrentMap(g_map, sizeof(g_map));
    BuildPath(Path_SM, g_logPath, sizeof(g_logPath), LOG_FILE);
    EmitEvent("plugin_start", 0, 0, 0, 0, "none");
}
public void OnMapStart()
{
    GetCurrentMap(g_map, sizeof(g_map));
    EmitEvent("map_start", 0, 0, 0, 0, "none");
}
public void OnMapEnd() { EmitEvent("map_end", 0, 0, 0, 0, "none"); }

void EmitEvent(const char[] eventName, int userid, int attacker, int value, int aux, const char[] detail)
{
    if (g_enabled != null && !g_enabled.BoolValue) return;
    File output = OpenFile(g_logPath, "a");
    if (output == null) { LogError("[CSSBC AI] Cannot open event log: %s", g_logPath); return; }
    // Deliberately omit player names, Steam identifiers and IP addresses.
    output.WriteLine("{\"ts\":%d,\"map\":\"%s\",\"event\":\"%s\",\"userid\":%d,\"attacker\":%d,\"value\":%d,\"aux\":%d,\"detail\":\"%s\"}",
        GetTime(), g_map, eventName, userid, attacker, value, aux, detail);
    delete output;
}
public void Event_RoundStart(Event e, const char[] n, bool d) { EmitEvent("round_start",0,0,0,0,"none"); }
public void Event_RoundEnd(Event e, const char[] n, bool d) { EmitEvent("round_end",0,0,e.GetInt("winner"),e.GetInt("reason"),"none"); }
public void Event_PlayerDeath(Event e, const char[] n, bool d) { EmitEvent("player_death",e.GetInt("userid"),e.GetInt("attacker"),e.GetInt("headshot"),e.GetInt("weaponid"),"death"); }
public void Event_PlayerHurt(Event e, const char[] n, bool d) { EmitEvent("player_hurt",e.GetInt("userid"),e.GetInt("attacker"),e.GetInt("dmg_health"),e.GetInt("health"),"damage"); }
public void Event_PlayerSpawn(Event e, const char[] n, bool d) { EmitEvent("player_spawn",e.GetInt("userid"),0,0,0,"spawn"); }
public void Event_Bomb(Event e, const char[] n, bool d) { EmitEvent(n,e.GetInt("userid"),0,0,0,"objective"); }
public void Event_WeaponFire(Event e, const char[] n, bool d)
{
    char weapon[64]; e.GetString("weapon", weapon, sizeof(weapon));
    if (StrContains(weapon, "grenade", false) != -1)
        EmitEvent("grenade_throw",e.GetInt("userid"),0,0,0,weapon);
}
