#include "CSSBC_CombatTeam.h"
namespace cssbc {
HitResult CombatTeamBridge::OnHit(JuggernautArmor& armor,const CombatObservation& h,
 CombatResolver& resolver,PlateLearning& learning,TeamMemory& memory){
 auto result=resolver.Resolve(armor,h.plate,h.damage);
 learning.Observe(h.plate,h.damage,h.time);
 memory.Publish({EventKind::Damage,h.shooter,h.victim,h.plate,0.65f,h.time,"combat damage observed"});
 if(result.cracked)memory.Publish({EventKind::PlateCracked,h.shooter,h.victim,h.plate,0.85f,h.time,"armor plate cracked"});
 if(result.broken)memory.Publish({EventKind::PlateBroken,h.shooter,h.victim,h.plate,0.95f,h.time,"armor plate broken"});
 return result;
}
void CombatTeamBridge::OnCallout(int sender,int target,Plate p,float confidence,float now,TeamMemory& memory){
 memory.Publish({EventKind::Callout,sender,target,p,confidence,now,"reported armor weakness"});
}
}
