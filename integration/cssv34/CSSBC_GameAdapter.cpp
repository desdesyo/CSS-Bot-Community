#define NOMINMAX
#include "cbase.h"
#include "cs_player.h"
#include "cs_bot.h"
#include "cs_bot_manager.h"
#include "CSSBC_GameAdapter.h"
#ifdef min
#undef min
#endif
#ifdef max
#undef max
#endif
#ifdef clamp
#undef clamp
#endif
#include "CSSBC_Brain.h"
#include "CSSBC_System.h"
#include "CSSBC_SupportRoster.h"
#include <algorithm>
#include <cstdlib>
#include <cmath>
#include <vector>
#include "tier0/memdbgon.h"

namespace {
cssbc::CSSBCSystem g_cssbcSystem;
cssbc::Economy g_cssbcEconomy;
std::vector<int> g_mvpRoster;
int g_roundNumber = 0;
float g_lastTeamDeathAt[4] = {0.f, 0.f, 0.f, 0.f};

struct BotRuntime {
    bool initialized = false;
    int team = 0;
    float nextThinkAt = 0.f;
    bool isSupport = false;
    bool isJuggernaut = false;
    int ownerUserId = 0;
    int botUserId = 0;
    cssbc::BotRole role = cssbc::BotRole::Entry;
    cssbc::BotBrain brain;
};
BotRuntime g_botRuntime[MAX_PLAYERS + 1];

struct PendingSupportSpawn {
    bool active = false;
    bool created = false;
    int ownerUserId = 0;
    cssbc::SupportRole role = cssbc::SupportRole::Assault;
    int health = 100;
    bool juggernaut = false;
};
PendingSupportSpawn g_pendingSupportSpawn;
ConVar cssbc_ai_enable("cssbc_ai_enable", "1", FCVAR_GAMEDLL, "Enable the CSSBC tactical bot brain adapter.");

void AddMvpEvent(int userId, cssbc::EventKind kind, float value) {
    if (userId <= 0) return;
    g_cssbcSystem.MVP().Add(userId, kind, value);
    if (std::find(g_mvpRoster.begin(), g_mvpRoster.end(), userId) == g_mvpRoster.end()) {
        g_mvpRoster.push_back(userId);
    }
}
int CountDeadAllies(CCSPlayer* buyer, int team) {
    int deadAllies = 0;
    for (int i = 1; i <= gpGlobals->maxClients; ++i) {
        CBasePlayer* player = UTIL_PlayerByIndex(i);
        if (!player || player == buyer || player->GetTeamNumber() != team) continue;
        if (!player->IsAlive()) ++deadAllies;
    }
    return deadAllies;
}

bool SpawnSupportTier(CCSPlayer* buyer, cssbc::SupportTier tier) {
    if (!buyer || !buyer->IsAlive() || !TheCSBots()) return false;

    const int team = buyer->GetTeamNumber();
    if (team != TEAM_CT && team != TEAM_TERRORIST) return false;

    const int buyerUserId = engine->GetPlayerUserId(buyer->edict());
    cssbc::SupportOrder order;
    if (!g_cssbcSystem.RequestSupport(tier, buyerUserId, buyer->m_iAccount,
                                      CountDeadAllies(buyer, team), order)) {
        ClientPrint(buyer, HUD_PRINTTALK, "[CSSBC] Purchase denied: insufficient money or not enough dead teammates.");
        return false;
    }

    cssbc::SupportRoster roster;
    if (!roster.Deploy(tier)) return false;
    const std::vector<cssbc::SupportUnit>& units = roster.Units();

    int spawned = 0;
    for (const cssbc::SupportUnit& unit : units) {
        g_pendingSupportSpawn.active = true;
        g_pendingSupportSpawn.created = false;
        g_pendingSupportSpawn.ownerUserId = buyerUserId;
        g_pendingSupportSpawn.role = unit.role;
        g_pendingSupportSpawn.health = unit.health;
        g_pendingSupportSpawn.juggernaut = unit.role == cssbc::SupportRole::Juggernaut;

        CSWeaponType weaponType = WEAPONTYPE_RIFLE;
        if (unit.role == cssbc::SupportRole::Sniper) weaponType = WEAPONTYPE_SNIPER_RIFLE;
        else if (unit.role == cssbc::SupportRole::Juggernaut) weaponType = WEAPONTYPE_MACHINEGUN;

        TheCSBots()->BotAddCommand(team, true, NULL, weaponType, BOT_EXPERT);
        const bool created = g_pendingSupportSpawn.created;
        g_pendingSupportSpawn.active = false;
        if (!created) break;
        ++spawned;
    }

    if (spawned == 0) {
        ClientPrint(buyer, HUD_PRINTTALK, "[CSSBC] No support unit could be spawned. Check team capacity and bot profiles.");
        return false;
    }

    const int unitCount = static_cast<int>(units.size());
    const int unitCost = order.moneySpent / unitCount;
    const int charge = spawned == unitCount ? order.moneySpent : unitCost * spawned;
    buyer->AddAccount(-charge);
    ClientPrint(buyer, HUD_PRINTTALK, "[CSSBC] Support deployed. The successfully spawned units have been charged.");
    return true;
}

}

namespace CSSBCGame {

void OnRoundStart(IGameEvent*) {
    ++g_roundNumber;
    g_cssbcSystem.MVP().Reset();
    g_mvpRoster.clear();
    g_cssbcEconomy.ResetRound(g_roundNumber);
    for (int i = 1; i <= MAX_PLAYERS; ++i) {
        g_botRuntime[i].initialized = false;
        g_botRuntime[i].nextThinkAt = 0.f;
    }
    for (int team = 0; team < 4; ++team) g_lastTeamDeathAt[team] = 0.f;
}

void OnRoundEnd(IGameEvent*) {
    const std::vector<cssbc::MVPEntry> ranked = g_cssbcSystem.MVP().Rank(g_mvpRoster, 3);
    for (std::size_t i = 0; i < ranked.size(); ++i) {
        Msg("[CSSBC] Round %d MVP #%d userid=%d score=%.2f\n",
            g_roundNumber, static_cast<int>(i + 1), ranked[i].player, ranked[i].score);
    }
}

void OnPlayerDeath(IGameEvent* event) {
    if (!event) return;
    const int victim = event->GetInt("userid", 0);
    const int attacker = event->GetInt("attacker", 0);
    const int assister = event->GetInt("assister", 0);

    if (victim > 0) {
        CCSPlayer* victimPlayer = static_cast<CCSPlayer*>(UTIL_PlayerByUserId(victim));
        if (victimPlayer) {
            const int team = victimPlayer->GetTeamNumber();
            if (team >= 0 && team < 4) g_lastTeamDeathAt[team] = gpGlobals->curtime;
        }
    }

    if (attacker > 0 && attacker != victim) {
        AddMvpEvent(attacker, cssbc::EventKind::Kill, 1.f);
        if (event->GetBool("headshot", false)) {
            AddMvpEvent(attacker, cssbc::EventKind::Headshot, 1.f);
        }
    }
    if (assister > 0 && assister != attacker && assister != victim) {
        AddMvpEvent(assister, cssbc::EventKind::Assist, 1.f);
    }
}

void OnBombPlanted(IGameEvent* event) {
    if (event) AddMvpEvent(event->GetInt("userid", 0), cssbc::EventKind::ObjectivePlant, 1.f);
}

void OnBombDefused(IGameEvent* event) {
    if (event) AddMvpEvent(event->GetInt("userid", 0), cssbc::EventKind::ObjectiveDefuse, 1.f);
}

void OnHostageRescuedAll(IGameEvent* event) {
    if (event) AddMvpEvent(event->GetInt("userid", 0), cssbc::EventKind::Rescue, 1.f);
}

void OnBotCreated(CCSBot* bot) {
    if (!bot || !g_pendingSupportSpawn.active) return;
    const int slot = bot->entindex();
    if (slot < 1 || slot > MAX_PLAYERS) return;

    BotRuntime& runtime = g_botRuntime[slot];
    runtime.initialized = false;
    runtime.team = bot->GetTeamNumber();
    runtime.nextThinkAt = 0.f;
    runtime.isSupport = true;
    runtime.isJuggernaut = g_pendingSupportSpawn.juggernaut;
    runtime.ownerUserId = g_pendingSupportSpawn.ownerUserId;
    runtime.botUserId = engine->GetPlayerUserId(bot->edict());

    switch (g_pendingSupportSpawn.role) {
        case cssbc::SupportRole::Sniper: runtime.role = cssbc::BotRole::Sniper; break;
        case cssbc::SupportRole::Assault: runtime.role = cssbc::BotRole::Entry; break;
        case cssbc::SupportRole::Juggernaut: runtime.role = cssbc::BotRole::Support; break;
    }

    bot->SetHealth(g_pendingSupportSpawn.health);
    if (runtime.isJuggernaut) bot->SetArmorValue(200);

    CCSPlayer* leader = static_cast<CCSPlayer*>(UTIL_PlayerByUserId(runtime.ownerUserId));
    if (leader) {
        leader->AllowAutoFollow();
        bot->Follow(leader);
    }

    g_pendingSupportSpawn.created = true;
    g_pendingSupportSpawn.active = false;
}

void TickBot(CCSBot* bot) {
    if (!cssbc_ai_enable.GetBool() || !bot || !bot->IsAlive()) return;

    const int slot = bot->entindex();
    if (slot < 1 || slot > MAX_PLAYERS) return;

    const int team = bot->GetTeamNumber();
    if (team != TEAM_CT && team != TEAM_TERRORIST) return;

    BotRuntime& runtime = g_botRuntime[slot];
    if (gpGlobals->curtime < runtime.nextThinkAt) return;
    runtime.nextThinkAt = gpGlobals->curtime + 0.75f;

    if (runtime.isSupport) {
        const int currentBotUserId = engine->GetPlayerUserId(bot->edict());
        if ((runtime.botUserId > 0 && currentBotUserId != runtime.botUserId) ||
            (runtime.ownerUserId > 0 && UTIL_PlayerByUserId(runtime.ownerUserId) == NULL)) {
            runtime.isSupport = false;
            runtime.isJuggernaut = false;
            runtime.ownerUserId = 0;
        }
    }

    const BotProfile* profile = bot->GetProfile();
    const float skill = profile ? profile->GetSkill() : 0.5f;
    const float aggression = profile ? profile->GetAggression() : 0.5f;

    cssbc::BotRole role = cssbc::BotRole::Entry;
    if (runtime.isSupport) role = runtime.role;
    else if (bot->IsSniper()) role = cssbc::BotRole::Sniper;
    else if (bot->IsHiding() || bot->IsAtHidingSpot()) role = cssbc::BotRole::Anchor;
    else if (bot->GetNearbyFriendCount() >= 2) role = cssbc::BotRole::Support;

    if (!runtime.initialized || runtime.team != team) {
        cssbc::Traits traits;
        traits.courage = 0.25f + 0.60f * aggression;
        traits.trust = 0.45f + 0.25f * skill;
        traits.teamwork = 0.40f + 0.40f * (1.f - aggression);
        traits.discipline = 0.20f + 0.75f * skill;
        traits.independence = 0.25f + 0.50f * aggression;
        traits.adaptability = 0.30f + 0.60f * skill;
        if (runtime.isJuggernaut) {
            traits.courage = 0.98f;
            traits.trust = 0.80f;
            traits.teamwork = 0.75f;
            traits.discipline = 0.95f;
            traits.independence = 0.65f;
            traits.adaptability = 0.75f;
        }
        runtime.brain = cssbc::BotBrain(traits, role);
        runtime.initialized = true;
        runtime.team = team;
    } else {
        runtime.brain.SetRole(role);
    }

    CCSPlayer* threat = bot->GetRecognizedEnemy();
    const int allies = bot->GetNearbyFriendCount();
    const int enemies = bot->GetNearbyEnemyCount();
    float distance = threat ? bot->GetRangeToNearestRecognizedEnemy() : 5000.f;
    if (!std::isfinite(distance) || distance < 0.f || distance > 10000.f) distance = 5000.f;

    cssbc::BrainSnapshot snapshot;
    snapshot.player = slot;
    snapshot.round = g_roundNumber;
    snapshot.team = team;
    snapshot.health = static_cast<float>(bot->GetHealth());
    snapshot.armor = static_cast<float>(bot->ArmorValue());
    snapshot.distanceToThreat = distance;
    snapshot.threatPressure = static_cast<float>(enemies) / static_cast<float>(std::max(1, allies + 1));
    snapshot.alliesNearby = allies;
    snapshot.enemiesKnown = enemies;
    snapshot.secondsLeft = TheCSBots()
        ? std::max(0, 90 - static_cast<int>(TheCSBots()->GetElapsedRoundTime())) : 90;
    snapshot.seesThreat = threat != NULL && bot->IsEnemyVisible();
    snapshot.hasCover = bot->IsHiding() || bot->IsAtHidingSpot();
    snapshot.bombPlanted = TheCSBots() && TheCSBots()->IsBombPlanted();
    snapshot.siteThreatened = snapshot.bombPlanted && bot->CanSeePlantedBomb();
    snapshot.teammateRecentlyKilled = team < 4 && g_lastTeamDeathAt[team] > 0.f &&
        (gpGlobals->curtime - g_lastTeamDeathAt[team]) < 3.0f;
    snapshot.canTrade = threat != NULL && allies > 0;
    snapshot.objectiveDistance = bot->GetPathDistanceRemaining();

    const cssbc::BrainIntent intent = runtime.brain.Tick(
        snapshot, g_cssbcEconomy, team == TEAM_TERRORIST);

    if (intent.retreat && !bot->IsDefusingBomb()) {
        if (bot->TryToRetreat(1000.f, 1.25f)) return;
    }
    if (intent.seekCover && !bot->IsDefusingBomb()) {
        bot->TryToHide(bot->GetLastKnownArea(), 1.25f, 650.f, false, true);
    }
}

} // namespace CSSBCGame

CON_COMMAND_F(cssbc_support, "Purchase CSSBC support: cssbc_support 1 (recon), 2 (tactical), 3 (four-unit squad).", FCVAR_GAMEDLL)
{
    CCSPlayer* buyer = static_cast<CCSPlayer*>(UTIL_GetCommandClient());
    if (!buyer) return;
    if (args.ArgC() < 2) {
        ClientPrint(buyer, HUD_PRINTTALK, "[CSSBC] Usage: cssbc_support 1, 2 or 3.");
        return;
    }

    const int tier = atoi(args.Arg(1));
    if (tier == 1) SpawnSupportTier(buyer, cssbc::SupportTier::Recon1000);
    else if (tier == 2) SpawnSupportTier(buyer, cssbc::SupportTier::Tactical3000);
    else if (tier == 3) SpawnSupportTier(buyer, cssbc::SupportTier::Squad9000);
    else ClientPrint(buyer, HUD_PRINTTALK, "[CSSBC] Unknown tier. Use 1, 2 or 3.");
}

CON_COMMAND_F(cssbc_juggernaut, "Purchase a 500 HP Juggernaut for $16000. Requires three dead teammates.", FCVAR_GAMEDLL)
{
    CCSPlayer* buyer = static_cast<CCSPlayer*>(UTIL_GetCommandClient());
    if (!buyer) return;
    SpawnSupportTier(buyer, cssbc::SupportTier::Juggernaut16000);
}
