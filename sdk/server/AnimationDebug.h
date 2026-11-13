#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace cssbc::sdk {

// SDK-independent diagnostics payload. Source overlay/log adapter fills entity/model data.
struct AnimationDebugFrame {
    int entityIndex{-1};
    int userId{-1};
    std::string modelPath;
    std::string sequence;
    std::string activity;
    std::string weaponClass;
    std::string stance;
    float cycle{0.0f};
    float playbackRate{1.0f};
    bool alive{true};
    bool frozen{false};
    std::string lastTransition;
};

enum class AnimationIssue {
    MissingSequence,
    InvalidCycle,
    InvalidPlaybackRate,
    MissingAttachment,
    WeaponGestureMismatch,
    DeadBotAnimating,
    StuckAction,
    TransitionThrash,
    MissingModel
};

struct AnimationDiagnostic {
    AnimationIssue issue;
    int entityIndex{-1};
    std::string detail;
};

class AnimationDebugSink {
public:
    virtual ~AnimationDebugSink() = default;
    virtual void OnFrame(const AnimationDebugFrame& frame) = 0;
    virtual void OnIssue(const AnimationDiagnostic& issue) = 0;
};

// Validation is intentionally independent of Source engine headers.
// The SDK adapter supplies actual sequence/attachment existence checks.
inline std::vector<AnimationDiagnostic> ValidateAnimationFrame(
    const AnimationDebugFrame& f,
    bool sequenceExists,
    bool weaponAttachmentExists,
    bool weaponGestureMatches,
    bool actionTimerStuck,
    unsigned transitionsInLastSecond)
{
    std::vector<AnimationDiagnostic> out;
    const auto issue = [&](AnimationIssue code, const char* detail) {
        out.push_back({code, f.entityIndex, detail});
    };

    if (f.modelPath.empty()) issue(AnimationIssue::MissingModel, "empty model path");
    if (!sequenceExists) issue(AnimationIssue::MissingSequence, f.sequence.c_str());
    if (!(f.cycle >= 0.0f && f.cycle <= 1.0f))
        issue(AnimationIssue::InvalidCycle, "cycle outside [0,1] or NaN");
    if (!(f.playbackRate > 0.0f && f.playbackRate <= 4.0f))
        issue(AnimationIssue::InvalidPlaybackRate, "playback rate outside (0,4]");
    if (!weaponAttachmentExists)
        issue(AnimationIssue::MissingAttachment, "weapon attachment unavailable");
    if (!weaponGestureMatches)
        issue(AnimationIssue::WeaponGestureMismatch, f.weaponClass.c_str());
    if (!f.alive && f.activity != "death")
        issue(AnimationIssue::DeadBotAnimating, f.activity.c_str());
    if (actionTimerStuck)
        issue(AnimationIssue::StuckAction, f.activity.c_str());
    if (transitionsInLastSecond > 24)
        issue(AnimationIssue::TransitionThrash, "more than 24 transitions/sec");
    return out;
}

} // namespace cssbc::sdk
