#pragma once
#include "CSSBC_Melee.h"
#include <cstdint>

namespace cssbc {
// Engine-independent authoritative melee attack simulation. SDK glue supplies a
// trace result (one target max) and applies the returned damage to that entity.
struct MeleeTraceTarget {
    int entityIndex{-1};
    float distance{0.f};
    bool inFront{false};
    bool friendly{false};
};
struct MeleeAttackResult {
    bool started{false};
    bool hit{false};
    int targetEntity{-1};
    float damage{0.f};
    MeleeAction action{};
};
class MeleeCombatant {
public:
    explicit MeleeCombatant(uint32_t seed=1):seed_(seed){}
    // Begins an attack if cooldown allows. Attack is resolved at windup end.
    MeleeAttackResult Begin(MeleeMode mode, MeleeFaction faction, float now, float skill);
    // Called by SDK at attack's impact frame; target is from server hull trace.
    MeleeAttackResult ResolveImpact(const MeleeTraceTarget& target, float now);
    // Call on weapon switch/death/round reset to cancel pending strike.
    void Cancel();
    bool IsAttacking() const { return pending_; }
    float ImpactTime() const { return impactAt_; }
    const MeleeState& State() const { return state_; }
private:
    uint32_t seed_;
    MeleeState state_{};
    MeleeAction action_{};
    MeleeMode mode_{MeleeMode::Normal};
    bool pending_{false};
    float impactAt_{0.f};
};
}
