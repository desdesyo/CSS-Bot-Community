#include "cbase.h"
#include "cs_gamerules.h"
#include "cs_bot.h"
#include "CSSBC_EngineAdapter.h"
#include "CSSBC_Brain.h"
#include "CSSBC_Economy.h"
#include <array>

namespace cssbc::sdk {
namespace {
constexpr int kPlayerSlots = 65;
std::array<BotBrain, kPlayerSlots> g_brains{};
Economy g_economy{};
float g_nextTacticalTick[kPlayerSlots]{};
}

void OnBotUpdate(CCSBot* bot) {
    if (!bot || !bot->IsAlive() || !gpGlobals) return;

    const int slot = bot->entindex();
    if (slot < 1 || slot >= kPlayerSlots) return;

    const float now = gpGlobals->curtime;
    if (now < g_nextTacticalTick[slot]) return;
    g_nextTacticalTick[slot] = now + 0.75f;

    BrainSnapshot snapshot{};
    snapshot.player = slot;
    snapshot.round = 0;
    snapshot.team = bot->GetTeamNumber();
    snapshot.health = static_cast<float>(bot->GetHealth());
    snapshot.armor = 0.0f;
    snapshot.secondsLeft = 90;
    snapshot.seesThreat = bot->IsEnemyVisible();
    snapshot.hasCover = bot->IsHiding();
    snapshot.alliesNearby = bot->GetNearbyFriendCount();
    snapshot.enemiesKnown = bot->GetNearbyEnemyCount();
    snapshot.threatPressure = snapshot.seesThreat ? 0.72f : 0.12f;
    snapshot.distanceToThreat = 2000.0f;

    if (CCSPlayer* enemy = bot->GetBotEnemy()) {
        const Vector delta = enemy->GetAbsOrigin() - bot->GetAbsOrigin();
        snapshot.distanceToThreat = delta.Length();
    }

    const bool terrorist = bot->GetTeamNumber() == TEAM_TERRORIST;
    const BrainIntent intent = g_brains[slot].Tick(snapshot, g_economy, terrorist);

    // Preserve the native CCSBot state machine; CSSBC only injects high-level
    // retreat/cover decisions and never creates entities or bypasses server traces.
    if (intent.retreat && !bot->IsHiding() && !bot->IsMovingTo()) {
        bot->TryToRetreat(900.0f, 1.5f);
    } else if (intent.seekCover && !bot->IsHiding() && !bot->IsMovingTo()) {
        bot->TryToHide(bot->GetLastKnownArea(), 1.0f, 600.0f, false);
    }
}
}
