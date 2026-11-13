#pragma once
#include "CSSBC_Tactics.h"
#include "CSSBC_Economy.h"
#include <array>
#include <cstdint>
namespace cssbc {
// A high-level, engine-neutral brain tick. SDK adapter fills the snapshot and executes the intent.
struct BrainSnapshot {
 int player=-1,round=0,team=0;
 float health=100,armor=0,distanceToThreat=1200,threatPressure=0;
 int alliesNearby=0,enemiesKnown=0,secondsLeft=90;
 bool seesThreat=false,hasCover=false,bombCarried=false,bombPlanted=false;
 bool siteThreatened=false,teammateRecentlyKilled=false,canTrade=false;
 float objectiveDistance=0;
 bool badDecision=false,afk=false,suicide=false,teamKill=false;
 int eventReward=0;
};
struct BrainIntent {
 TacticalAction tactical=TacticalAction::Advance;
 float urgency=0,cooperation=1.f;
 int moneyDelta=0;
 bool retreat=false,seekCover=false,callSupport=false;
 const char* reason="";
};
class BotBrain {
public:
 explicit BotBrain(Traits traits={},BotRole role=BotRole::Entry):traits_(traits),role_(role){}
 BrainIntent Tick(const BrainSnapshot&,Economy&,bool terroristTeam);
 void SetRole(BotRole r){role_=r;}
 Traits& Personality(){return traits_;}
 const Traits& Personality()const{return traits_;}
private:
 Traits traits_;BotRole role_;int lastRound_=-1;int lastBadDecisionRound_=-1,lastAfkRound_=-1;
};
}
