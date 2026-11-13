#pragma once
#include <cstdint>
namespace cssbc {
enum class MeleeMode : uint8_t { Normal, Knife, Fists };
enum class MeleeFaction : uint8_t { CT, T };
enum class MeleeModeState : uint8_t { Active, Pending };
struct MeleeModeSnapshot {
    MeleeMode active{MeleeMode::Normal};
    MeleeMode pending{MeleeMode::Normal};
    bool hasPending{false};
    uint32_t appliedRound{0};
};
class MeleeModeController {
public:
    // Menu selection never ends the live round or mutates its score/counter.
    void Queue(MeleeMode mode) { pending_=mode; hasPending_=true; }
    // Called only from the next round_start hook. Returns true if mode changed.
    bool OnRoundStart(uint32_t roundNumber) {
        if (!hasPending_) { appliedRound_=roundNumber; return false; }
        const bool changed=active_!=pending_;
        active_=pending_; hasPending_=false; appliedRound_=roundNumber;
        return changed;
    }
    MeleeMode Active() const { return active_; }
    bool HasPending() const { return hasPending_; }
    MeleeMode Pending() const { return pending_; }
    MeleeModeSnapshot Snapshot() const { return {active_,pending_,hasPending_,appliedRound_}; }
private:
    MeleeMode active_{MeleeMode::Normal};
    MeleeMode pending_{MeleeMode::Normal};
    bool hasPending_{false};
    uint32_t appliedRound_{0};
};
enum class MeleeMove : uint8_t { Jab, Cross, Hook, Uppercut, KnifeStab, KnifeSlash, ReverseSlash, Lunge };
struct MeleeProfile { float range, damage, windup, recovery; bool heavy; };
struct MeleeAction { MeleeMove move; MeleeProfile profile; uint8_t animationVariant; };
struct MeleeState { uint32_t sequence=0; float nextAttackAt=0; };

// Strict enum validation at every public boundary; never accept casted garbage.
inline bool IsValidMeleeMode(MeleeMode mode) {
    return mode==MeleeMode::Normal||mode==MeleeMode::Knife||mode==MeleeMode::Fists;
}
inline bool IsValidMeleeFaction(MeleeFaction faction) {
    return faction==MeleeFaction::CT||faction==MeleeFaction::T;
}
MeleeAction SelectMeleeAction(MeleeMode mode,MeleeFaction faction,MeleeState& state,uint32_t playerSeed,float now,float skill);
bool CanMeleeAttack(const MeleeState& state,float now);
}
