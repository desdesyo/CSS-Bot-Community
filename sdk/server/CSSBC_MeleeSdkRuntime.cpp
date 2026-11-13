#include "CSSBC_MeleeSdkRuntime.h"
#include <algorithm>
namespace cssbc {
MeleeCombatant* MeleeSdkRuntime::Find(int id){
 for(auto& p:players_)if(p.entIndex==id)return &p.combat;
 players_.emplace_back(id,static_cast<uint32_t>(id)*2654435761u+1u);
 return &players_.back().combat;
}
MeleeAttackResult MeleeSdkRuntime::TryAttack(const MeleePlayerFrame&p){
 if(!p.alive||!p.grounded||!p.hasEnemy)return {};
 return Find(p.entIndex)->Begin(modes_.Active(),p.faction,p.now,p.skill);
}
MeleeAttackResult MeleeSdkRuntime::Impact(const MeleePlayerFrame&p,const MeleeTargetFrame&t){
 if(!p.alive)return {};
 return Find(p.entIndex)->ResolveImpact({t.entIndex,t.distance,t.inFront,t.friendly},p.now);
}
void MeleeSdkRuntime::ResetPlayer(int id){
 auto it=std::remove_if(players_.begin(),players_.end(),[&](Slot&s){return s.entIndex==id;});
 players_.erase(it,players_.end());
}
}
