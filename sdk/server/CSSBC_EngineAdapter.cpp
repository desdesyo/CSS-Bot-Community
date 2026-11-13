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
std::array<bool, kPlayerSlots> g_initialized{};
Economy g_economy{};

void InitializePersonality(int slot) {
    // Stable per-slot personality: bots do not all make identical risk decisions.
    Traits traits{};
    traits.courage = 0.28f + static_cast<float>((slot * 17) % 61) / 100.0f;
    traits.trust = 0.30f + static_cast<float>((slot * 29) % 61) / 100.0f;
    traits.teamwork = 0.25f + static_cast<float>((slot * 13) % 66) / 100.0f;
    traits.discipline = 0.30f + static_cast<float>((slot * 23) % 61) / 100.0f;
    traits.adaptability = 0.25f + static_cast<float>((slot * 31) % 66) / 100.0f;
    g_brains[slot].Personality() = traits;
    switch (slot % 5) {
        case 0: g_brains[slot].SetRole(BotRole::Entry); break;
        case 1: g_brains[slot].SetRole(BotRole::Support); break;
        case 2: g_brains[slot].SetRole(BotRole::Anchor); break;
        case 3: g_brains[slot].SetRole(BotRole::Sniper); break;
        default: g_brains[slot].SetRole(BotRole::IGL); break;
    }
    g_initialized[slot] = true;
}
float g_nextTacticalTick[kPlayerSlots]{};
}

void OnBotUpdate(CCSBot* bot) {
    if (!bot || !bot->IsAlive() || !gpGlobals) return;

    const int slot = bot->entindex();
    if (slot < 1 || slot >= kPlayerSlots) return;

    if (!g_initialized[slot]) InitializePersonality(slot);

    const float now = gpGlobals->curtime;
    if (now < g_nextTacticalTick[slot]) return;
    g_nextTacticalTick[slot] = now + 0.75f;

    BrainSnapshot snapshot{};
    snapshot.player = slot;
    snapshot.round = 0;
    snapshot.team = bot->GetTeamNumber();
    snapshot.health = static_cast<float>(bot->GetHealth());
    snapshot.armor = static_cast<float>(bot->ArmorValue());
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
