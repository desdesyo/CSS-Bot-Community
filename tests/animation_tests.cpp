#include "AnimationStateMachine.h"
#include "CSSBC_AnimationSequenceMap.h"
#include <cassert>
using namespace cssbc::sdk;
int main() {
 AnimationStateMachine m;
 AnimInput in;
 const auto &idle=m.Update(in); assert(idle.action==AnimAction::Idle);
 m.Advance(.5f,2.f,true); assert(m.State().cycle==.25f);
 in.moving=true; const auto &move=m.Update(in); assert(move.action==AnimAction::Move&&move.cycle==0.f);
 m.Advance(3.f,1.f,true); assert(m.State().cycle==0.f);
 in.firing=true; const auto &fire=m.Update(in); assert(fire.action==AnimAction::Fire&&fire.cycle==0.f);
 m.Advance(2.f,1.f,false); assert(m.State().cycle==1.f);
 in.alive=false; assert(m.Update(in).action==AnimAction::Death);
 AnimationSequenceSet seq; in.alive=true;in.firing=false;in.moving=true;in.stance=AnimStance::Crouch;
 assert(ResolveSequence(in,seq)==seq.crouchWalk);
 in.moving=false; assert(ResolveSequence(in,seq)==seq.idleCrouch);
}
