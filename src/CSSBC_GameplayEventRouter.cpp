#include "CSSBC_GameplayEventRouter.h"
#include <algorithm>
namespace cssbc {
void GameplayEventRouter::BeginRound(int round,const std::vector<RoundPlayer>& players){
 round_=round;roster_.clear();grenades_.clear();
 for(const auto&p:players) if(p.id>=0 && std::find(roster_.begin(),roster_.end(),p.id)==roster_.end()) roster_.push_back(p.id);
 match_.BeginRound(round,roster_.data(),roster_.size());
}
bool GameplayEventRouter::PlayerDeath(const PlayerDeathEvent&e){
 if(e.round!=round_||e.victim<0)return false;
 // Death is attributed to the killer; victim stays in full roster for posthumous MVP.
 if(e.attacker>=0&&!e.teamKill){
  match_.AwardEvent(round_,e.attacker,EventKind::Kill,1.f,e.victim,e.time);
  if(e.headshot)match_.AwardEvent(round_,e.attacker,EventKind::Headshot,1.f,e.victim,e.time);
  if(e.grenade)match_.AwardEvent(round_,e.attacker,EventKind::GrenadeImpact,1.f,e.victim,e.time);
 }
 if(e.assister>=0&&e.assister!=e.attacker)match_.AwardEvent(round_,e.assister,EventKind::Assist,.5f,e.victim,e.time);
 match_.AwardEvent(round_,e.victim,EventKind::Death,0.f,e.attacker,e.time);
 return true;
}
bool GameplayEventRouter::Bomb(const BombRoundEvent&e){
 if(e.round!=round_||e.actor<0||(!e.planted&&!e.defused))return false;
 return match_.AwardEvent(round_,e.actor,e.planted?EventKind::ObjectivePlant:EventKind::ObjectiveDefuse,1.f,-1,e.time);
}
bool GameplayEventRouter::GrenadeThrown(int entity,int thrower,int team,float time){
 if(entity<0||thrower<0)return false;
 grenades_[entity]={thrower,team,time,true};return true;
}
bool GameplayEventRouter::GrenadeDetonated(int entity,int victim,float time){
 auto it=grenades_.find(entity);if(it==grenades_.end()||!it->second.valid)return false;
 const auto g=it->second;
 if(victim>=0)match_.AwardEvent(round_,g.thrower,EventKind::GrenadeImpact,1.f,victim,time);
 return true;
}
void GameplayEventRouter::ForgetGrenade(int entity){grenades_.erase(entity);}
std::vector<MVPEntry> GameplayEventRouter::FinishRound(){return match_.EndRound();}
}
