#include "CSSBC_Melee.h"
#include <algorithm>
namespace cssbc {
bool CanMeleeAttack(const MeleeState&s,float now){return now>=s.nextAttackAt;}
MeleeAction SelectMeleeAction(MeleeMode mode,Faction f,MeleeState&s,uint32_t seed,float now,float skill){
 skill=std::clamp(skill,0.f,1.f); seed^=(++s.sequence*0x9E3779B9u); seed^=seed>>16; seed*=0x7FEB352Du; seed^=seed>>15;
 const unsigned pick=seed%4; MeleeAction a{};
 if(mode==MeleeMode::Knife){
  static constexpr MeleeMove ct[]={MeleeMove::KnifeStab,MeleeMove::KnifeSlash,MeleeMove::ReverseSlash,MeleeMove::Lunge};
  static constexpr MeleeMove t[]={MeleeMove::KnifeSlash,MeleeMove::KnifeStab,MeleeMove::ReverseSlash,MeleeMove::Lunge};
  a.move=f==Faction::CT?ct[pick]:t[pick];
  a.profile={a.move==MeleeMove::Lunge?82.f:68.f,a.move==MeleeMove::KnifeStab?65.f:38.f,.18f,.42f,a.move==MeleeMove::Lunge};
  a.animationVariant=(uint8_t)(pick+(f==Faction::T?4:0));
 } else {
  // CT: disciplined compact boxing; T: wider, less trained street-fight motions.
  static constexpr MeleeMove ct[]={MeleeMove::Jab,MeleeMove::Cross,MeleeMove::Hook,MeleeMove::Uppercut};
  static constexpr MeleeMove t[]={MeleeMove::Hook,MeleeMove::Jab,MeleeMove::Uppercut,MeleeMove::Cross};
  a.move=f==Faction::CT?ct[pick]:t[pick]; a.animationVariant=(uint8_t)(pick+(f==Faction::T?4:0));
  const bool heavy=a.move==MeleeMove::Hook||a.move==MeleeMove::Uppercut;
  a.profile={heavy?62.f:54.f,heavy?34.f:18.f,heavy?.32f:.16f,heavy?.62f:.34f,heavy};
 }
 // Better skill shortens recovery slightly; animation windup remains readable.
 a.profile.recovery*=1.f-.18f*skill; s.nextAttackAt=now+a.profile.windup+a.profile.recovery; return a;
}
}
