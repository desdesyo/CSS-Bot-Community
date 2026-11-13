#include "CSSBC_MeleeCombat.h"
#include <algorithm>
#include <cmath>
namespace cssbc {
namespace {
bool ValidMode(MeleeMode m){return m==MeleeMode::Knife||m==MeleeMode::Fists;}
bool Finite(float v){return std::isfinite(v)!=0;}
}
MeleeAttackResult MeleeCombatant::Begin(MeleeMode mode,MeleeFaction faction,float now,float skill){
    MeleeAttackResult out{};
    // Reject NaN/Inf: comparisons with NaN are false and can otherwise bypass cooldowns.
    if(!Finite(now)||!Finite(skill)||!ValidMode(mode)||pending_||!CanMeleeAttack(state_,now))return out;
    skill=std::max(0.f,std::min(1.f,skill));
    action_=SelectMeleeAction(mode,faction,state_,seed_,now,skill);
    if(!Finite(action_.profile.windup)||!Finite(action_.profile.recovery)||!Finite(action_.profile.range)||!Finite(action_.profile.damage)||action_.profile.windup<0.f||action_.profile.recovery<0.f||action_.profile.range<=0.f||action_.profile.damage<=0.f){Cancel();return out;}
    mode_=mode;pending_=true;impactAt_=now+action_.profile.windup;
    if(!Finite(impactAt_)){Cancel();return out;}
    out.started=true;out.action=action_;return out;
}
MeleeAttackResult MeleeCombatant::ResolveImpact(const MeleeTraceTarget&t,float now){
    MeleeAttackResult out{};out.action=action_;
    if(!pending_||!Finite(now)||now+0.001f<impactAt_)return out;
    // Consume the attack before validating target: a miss cannot be retried as a second hit.
    pending_=false;impactAt_=0.f;
    if(t.entityIndex<0||!Finite(t.distance)||t.distance<0.f||!t.inFront||t.friendly||t.distance>action_.profile.range)return out;
    out.hit=true;out.targetEntity=t.entityIndex;out.damage=action_.profile.damage;return out;
}
void MeleeCombatant::Cancel(){pending_=false;impactAt_=0.f;}
}
