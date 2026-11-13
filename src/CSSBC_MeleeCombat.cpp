#include "CSSBC_MeleeCombat.h"
#include <algorithm>
namespace cssbc {
MeleeAttackResult MeleeCombatant::Begin(MeleeMode mode,MeleeFaction faction,float now,float skill){
    MeleeAttackResult out{};
    if(mode==MeleeMode::Normal||pending_||!CanMeleeAttack(state_,now))return out;
    action_=SelectMeleeAction(mode,faction,state_,seed_,now,skill);
    mode_=mode;pending_=true;impactAt_=now+action_.profile.windup;
    out.started=true;out.action=action_;return out;
}
MeleeAttackResult MeleeCombatant::ResolveImpact(const MeleeTraceTarget&t,float now){
    MeleeAttackResult out{};out.action=action_;
    if(!pending_||now+0.001f<impactAt_)return out;
    pending_=false;
    if(t.entityIndex<0||!t.inFront||t.friendly||t.distance>action_.profile.range)return out;
    out.hit=true;out.targetEntity=t.entityIndex;out.damage=action_.profile.damage;return out;
}
void MeleeCombatant::Cancel(){pending_=false;impactAt_=0.f;}
}
