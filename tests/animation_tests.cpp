#include "AnimationStateMachine.h"
#include "CSSBC_AnimationSequenceMap.h"
#include <cassert>
#include <cstring>

using namespace cssbc::sdk;

int main() {
    AnimationStateMachine machine;
    AnimInput input;
    const auto& idle = machine.Update(input);
    assert(idle.action == AnimAction::Idle);
    machine.Advance(.5f, 2.f, true);
    assert(machine.State().cycle == .25f);

    input.moving = true;
    const auto& move = machine.Update(input);
    assert(move.action == AnimAction::Move && move.cycle == 0.f);
    machine.Advance(3.f, 1.f, true);
    assert(machine.State().cycle == 0.f);

    input.firing = true;
    const auto& fire = machine.Update(input);
    assert(fire.action == AnimAction::Fire && fire.cycle == 0.f);
    machine.Advance(2.f, 1.f, false);
    assert(machine.State().cycle == 1.f);

    input.alive = false;
    assert(machine.Update(input).action == AnimAction::Death);

    AnimationSequenceSet sequences;
    input.alive = true;
    input.firing = false;
    input.moving = true;
    input.stance = AnimStance::Crouch;
    assert(std::strcmp(ResolveSequence(input, sequences), sequences.crouchWalk) == 0);

    input.moving = false;
    assert(std::strcmp(ResolveSequence(input, sequences), sequences.idleCrouch) == 0);
}
