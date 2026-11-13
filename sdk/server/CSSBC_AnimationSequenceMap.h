#pragma once
#include "AnimationStateMachine.h"
#include <string>

namespace cssbc::sdk {

// Sequence names are configurable per model family; these are the expected canonical names.
// Models lacking a sequence fail validation rather than silently animating incorrectly.
struct AnimationSequenceSet {
    const char* idleStand{"idle"};
    const char* idleCrouch{"crouch_idle"};
    const char* walk{"walk"};
    const char* run{"run"};
    const char* crouchWalk{"crouch_walk"};
    const char* fireRifle{"shoot"};
    const char* firePistol{"shoot"};
    const char* reloadRifle{"reload"};
    const char* reloadPistol{"reload"};
    const char* knife{"knife"};
    const char* grenade{"grenade_throw"};
    const char* plant{"plant"};
    const char* defuse{"defuse"};
    const char* flinch{"flinch"};
    const char* death{"death"};
};

inline const char* ResolveSequence(const AnimInput& in, const AnimationSequenceSet& s) {
    if (!in.alive) return s.death;
    if (in.hitReact) return s.flinch;
    if (in.objectiveAction) {
        if (in.objective == AnimAction::Plant) return s.plant;
        if (in.objective == AnimAction::Defuse) return s.defuse;
    }
    if (in.reloading) return in.weapon == AnimWeapon::Pistol ? s.reloadPistol : s.reloadRifle;
    if (in.firing) return in.weapon == AnimWeapon::Pistol ? s.firePistol : s.fireRifle;
    if (in.moving) {
        if (in.stance == AnimStance::Crouch) return s.crouchWalk;
        return in.weapon == AnimWeapon::Heavy ? s.walk : s.run;
    }
    return in.stance == AnimStance::Crouch ? s.idleCrouch : s.idleStand;
}

} // namespace cssbc::sdk
