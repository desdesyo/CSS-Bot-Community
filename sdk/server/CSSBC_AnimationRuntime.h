#pragma once

#include "AnimationStateMachine.h"
#include "AnimationDebug.h"

#include <string>
#include <functional>

namespace cssbc::sdk {

// Source-engine adapter callbacks. Bind these to CBaseAnimating methods in the game DLL.
// Keeping engine calls injected allows the state machine to be tested without Source headers.
struct AnimationEngineBindings {
    std::function<bool(const char*)> sequenceExists;
    std::function<int(const char*)> lookupSequence; // -1 if absent
    std::function<void(int)> resetSequence;
    std::function<void(float)> setCycle;
    std::function<void(float)> setPlaybackRate;
    std::function<void(const char*)> setWeaponGesture;
    std::function<void(const AnimationDebugFrame&)> debugFrame;
    std::function<void(const AnimationDiagnostic&)> debugIssue;
    std::function<bool()> weaponAttachmentExists;
};

class CSSBCAnimationRuntime {
public:
    explicit CSSBCAnimationRuntime(AnimationEngineBindings bindings)
        : bindings_(std::move(bindings)) {}

    // Call once per bot update. sequenceFor maps action/stance/weapon to model-specific sequence.
    bool Tick(const AnimInput& input, const char* sequence,
              const AnimationDebugFrame& frame, bool debugEnabled) {
        const AnimState& state = machine_.Update(input);
        if (!sequence || !bindings_.lookupSequence || !bindings_.resetSequence ||
            !bindings_.setCycle || !bindings_.setPlaybackRate) return false;

        const bool exists = bindings_.sequenceExists && bindings_.sequenceExists(sequence);
        const int index = exists ? bindings_.lookupSequence(sequence) : -1;
        if (index < 0) {
            Report({AnimationIssue::MissingSequence, frame.entityIndex, sequence});
            return false; // never silently play unrelated sequence
        }

        if (state.transitionSerial != appliedSerial_) {
            bindings_.resetSequence(index);
            appliedSerial_ = state.transitionSerial;
            if (bindings_.setWeaponGesture)
                bindings_.setWeaponGesture(GestureFor(input.weapon, state.action));
        }
        bindings_.setCycle(state.cycle);
        bindings_.setPlaybackRate(state.playbackRate);

        if (debugEnabled && bindings_.debugFrame) bindings_.debugFrame(frame);
        if (debugEnabled) {
            const bool attachment = bindings_.weaponAttachmentExists &&
                                   bindings_.weaponAttachmentExists();
            const auto issues = ValidateAnimationFrame(frame, exists, attachment,
                GestureCompatible(input.weapon, state.action), false, 0);
            for (const auto& issue : issues) Report(issue);
        }
        return true;
    }

    AnimationStateMachine& StateMachine() { return machine_; }

private:
    static const char* GestureFor(AnimWeapon weapon, AnimAction action) {
        if (action == AnimAction::Reload) return weapon == AnimWeapon::Pistol ? "ACT_GESTURE_RELOAD_PISTOL" : "ACT_GESTURE_RELOAD";
        if (action == AnimAction::Fire) return weapon == AnimWeapon::Pistol ? "ACT_GESTURE_RANGE_ATTACK_PISTOL" : "ACT_GESTURE_RANGE_ATTACK";
        if (action == AnimAction::Knife) return "ACT_GESTURE_MELEE_ATTACK1";
        if (action == AnimAction::Grenade) return "ACT_GESTURE_THROW";
        return "ACT_INVALID";
    }
    static bool GestureCompatible(AnimWeapon weapon, AnimAction action) {
        if (action == AnimAction::Reload || action == AnimAction::Fire)
            return weapon == AnimWeapon::Rifle || weapon == AnimWeapon::Pistol || weapon == AnimWeapon::Heavy;
        if (action == AnimAction::Knife) return weapon == AnimWeapon::Knife;
        if (action == AnimAction::Grenade) return weapon == AnimWeapon::Grenade;
        return true;
    }
    void Report(const AnimationDiagnostic& d) {
        if (bindings_.debugIssue) bindings_.debugIssue(d);
    }

    AnimationEngineBindings bindings_;
    AnimationStateMachine machine_;
    std::uint32_t appliedSerial_{0};
};

} // namespace cssbc::sdk
