#pragma once
#include <cstdint>

namespace cssbc::sdk {

enum class AnimAction : std::uint8_t {
    Idle, Move, Fire, Reload, Draw, Holster, Knife, Grenade,
    Plant, Defuse, Flinch, Death
};
enum class AnimStance : std::uint8_t { Stand, Crouch };
enum class AnimWeapon : std::uint8_t { Rifle, Pistol, Knife, Grenade, Heavy };

struct AnimInput {
    bool alive{true};
    bool hitReact{false};
    bool objectiveAction{false};
    AnimAction objective{AnimAction::Idle};
    bool reloading{false};
    bool firing{false};
    bool moving{false};
    AnimStance stance{AnimStance::Stand};
    AnimWeapon weapon{AnimWeapon::Rifle};
};

struct AnimState {
    AnimAction action{AnimAction::Idle};
    AnimStance stance{AnimStance::Stand};
    AnimWeapon weapon{AnimWeapon::Rifle};
    float cycle{0.0f};
    float playbackRate{1.0f};
    std::uint32_t transitionSerial{0};
};

class AnimationStateMachine {
public:
    const AnimState& Update(const AnimInput& in) {
        AnimAction next = AnimAction::Idle;
        // Interrupt priority: death > hit > objective > reload/fire > locomotion.
        if (!in.alive) next = AnimAction::Death;
        else if (in.hitReact) next = AnimAction::Flinch;
        else if (in.objectiveAction) next = in.objective;
        else if (in.reloading) next = AnimAction::Reload;
        else if (in.firing) next = AnimAction::Fire;
        else if (in.moving) next = AnimAction::Move;

        if (next != state_.action || in.stance != state_.stance || in.weapon != state_.weapon) {
            state_.action = next;
            state_.stance = in.stance;
            state_.weapon = in.weapon;
            state_.cycle = 0.0f; // interrupted actions cannot retain stale cycle
            ++state_.transitionSerial;
        }
        return state_;
    }

    void SetCycleForDebug(float cycle) {
        if (cycle >= 0.0f && cycle <= 1.0f) state_.cycle = cycle;
    }
    void SetPlaybackRateForDebug(float rate) {
        if (rate >= 0.1f && rate <= 2.0f) state_.playbackRate = rate;
    }
    const AnimState& State() const { return state_; }

private:
    AnimState state_{};
};

} // namespace cssbc::sdk
