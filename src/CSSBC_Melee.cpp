#include "CSSBC_Melee.h"
#include <algorithm>
#include <cmath>

namespace cssbc {
bool CanMeleeAttack(const MeleeState& state, float now) {
    return std::isfinite(now) && std::isfinite(state.nextAttackAt) && now >= state.nextAttackAt;
}

MeleeAction SelectMeleeAction(MeleeMode mode, MeleeFaction faction, MeleeState& state,
                              uint32_t seed, float now, float skill) {
    MeleeAction invalid{};
    if (!IsValidMeleeMode(mode) || mode == MeleeMode::Normal ||
        !IsValidMeleeFaction(faction) || !std::isfinite(now) || !std::isfinite(skill)) {
        return invalid;
    }

    skill = std::clamp(skill, 0.f, 1.f);
    seed ^= (++state.sequence * 0x9E3779B9u);
    seed ^= seed >> 16;
    seed *= 0x7FEB352Du;
    seed ^= seed >> 15;

    const unsigned pick = seed % 4;
    MeleeAction action{};
    if (mode == MeleeMode::Knife) {
        static constexpr MeleeMove ct[] = {
            MeleeMove::KnifeStab, MeleeMove::KnifeSlash, MeleeMove::ReverseSlash, MeleeMove::Lunge
        };
        static constexpr MeleeMove t[] = {
            MeleeMove::KnifeSlash, MeleeMove::KnifeStab, MeleeMove::ReverseSlash, MeleeMove::Lunge
        };
        action.move = faction == MeleeFaction::CT ? ct[pick] : t[pick];
        action.profile = {
            action.move == MeleeMove::Lunge ? 82.f : 68.f,
            action.move == MeleeMove::KnifeStab ? 65.f : 38.f,
            .18f, .42f, action.move == MeleeMove::Lunge
        };
        action.animationVariant = static_cast<uint8_t>(pick + (faction == MeleeFaction::T ? 4 : 0));
    } else {
        // CT: disciplined compact boxing; T: wider, less trained street-fight motions.
        static constexpr MeleeMove ct[] = {
            MeleeMove::Jab, MeleeMove::Cross, MeleeMove::Hook, MeleeMove::Uppercut
        };
        static constexpr MeleeMove t[] = {
            MeleeMove::Hook, MeleeMove::Jab, MeleeMove::Uppercut, MeleeMove::Cross
        };
        action.move = faction == MeleeFaction::CT ? ct[pick] : t[pick];
        action.animationVariant = static_cast<uint8_t>(pick + (faction == MeleeFaction::T ? 4 : 0));
        const bool heavy = action.move == MeleeMove::Hook || action.move == MeleeMove::Uppercut;
        action.profile = {
            heavy ? 62.f : 54.f, heavy ? 34.f : 18.f,
            heavy ? .32f : .16f, heavy ? .62f : .34f, heavy
        };
    }

    // Better skill shortens recovery slightly; animation windup remains readable.
    action.profile.recovery *= 1.f - .18f * skill;
    state.nextAttackAt = now + action.profile.windup + action.profile.recovery;
    return action;
}
}
