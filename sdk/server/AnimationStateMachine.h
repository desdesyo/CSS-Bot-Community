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
    const AnimState& Update(const AnimInput& input) {
        AnimAction next = AnimAction::Idle;
        if (!input.alive) next = AnimAction::Death;
        else if (input.hitReact) next = AnimAction::Flinch;
        else if (input.objectiveAction) next = input.objective;
        else if (input.reloading) next = AnimAction::Reload;
        else if (input.firing) next = AnimAction::Fire;
        else if (input.moving) next = AnimAction::Move;

        if (next != state_.action || input.stance != state_.stance || input.weapon != state_.weapon) {
            state_.action = next;
            state_.stance = input.stance;
            state_.weapon = input.weapon;
            state_.cycle = 0.0f;
            ++state_.transitionSerial;
        }
        return state_;
    }

    // Advance normalized sequence time. Looping locomotion wraps; one-shot actions clamp.
    void Advance(float dt, float sequenceDuration, bool looping) {
        if (dt <= 0.0f || sequenceDuration <= 0.0f) return;
        state_.cycle += (dt / sequenceDuration) * state_.playbackRate;
        if (looping) {
            while (state_.cycle >= 1.0f) state_.cycle -= 1.0f;
        } else if (state_.cycle > 1.0f) {
            state_.cycle = 1.0f;
        }
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
