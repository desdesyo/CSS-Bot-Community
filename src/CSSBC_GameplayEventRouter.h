#pragma once
#include "CSSBC_MatchCoordinator.h"
#include "CSSBC_TeamMemory.h"
#include "CSSBC_Combat.h"
#include "CSSBC_Economy.h"
#include <unordered_map>
#include <vector>

namespace cssbc {
// SDK-independent event payloads. SDK hooks translate game events into these records.
struct PlayerDeathEvent { int round=-1,victim=-1,attacker=-1,assister=-1; bool headshot=false,grenade=false,teamKill=false; float time=0.f; };
struct BombRoundEvent { int round=-1,actor=-1; bool planted=false,defused=false; float time=0.f; };
struct GrenadeAttribution { int thrower=-1,team=-1; float thrownAt=0.f; bool valid=false; };
struct RoundPlayer { int id=-1,team=0; bool alive=true; };

class GameplayEventRouter {
public:
 explicit GameplayEventRouter(MatchCoordinator& match):match_(match){}
 void BeginRound(int round,const std::vector<RoundPlayer>& players);
 bool PlayerDeath(const PlayerDeathEvent& e);
 bool Bomb(const BombRoundEvent& e);
 bool GrenadeThrown(int entity,int thrower,int team,float time);
 bool GrenadeDetonated(int entity,int victim,float time);
 void ForgetGrenade(int entity);
 std::vector<MVPEntry> FinishRound();
 const std::vector<int>& Roster()const{return roster_;}
private:
 MatchCoordinator& match_;
 int round_=-1;
 std::vector<int> roster_;
 std::unordered_map<int,GrenadeAttribution> grenades_;
};
}
