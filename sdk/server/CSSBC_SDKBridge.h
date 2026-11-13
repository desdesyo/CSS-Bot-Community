#ifndef CSSBC_SDK_BRIDGE_H
#define CSSBC_SDK_BRIDGE_H

// Thin Source SDK-facing adapter contract.
// Include this from the mod's server game DLL after adding ../src to include paths.
// Keep SDK headers out of the portable CSSBC core.

#include "CSSBC_Types.h"
#include "CSSBC_Mind.h"
#include "CSSBC_Combat.h"
#include "CSSBC_CombatTeam.h"
#include "CSSBC_TeamMemory.h"
#include "CSSBC_SupportRoster.h"
#include "CSSBC_Juggernaut.h"
#include "CSSBC_MVP.h"
#include "CSSBC_System.h"

namespace cssbc {
struct SdkBotSnapshot {
    int entIndex;
    int team;
    bool alive;
    bool seesEnemy;
    float health;
    float armor;
    float distanceToEnemy;
    float morale;
};

// SDK integration seam: game code translates CBasePlayer/CCSBot state into this
// POD snapshot, runs CSSBC decisions, then applies the result back to engine.
class SdkServerBridge {
public:
    void OnRoundStart();
    void OnBotTick(const SdkBotSnapshot& bot, float dt);
    void OnDamage(int victim, int attacker, float amount, int hitgroup);
    void OnPlayerDeath(int victim, int attacker);
    void OnBombEvent(int actor, EventKind kind);
    void OnRoundEnd();
};
}
#endif
