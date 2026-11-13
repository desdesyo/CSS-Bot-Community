#pragma once
#include "CSSBC_Brain.h"
#include "CSSBC_Mind.h"
#include "CSSBC_CombatTeam.h"
#include "CSSBC_MVP.h"
#include "CSSBC_SupportRoster.h"
#include "CSSBC_System.h"
namespace cssbc::sdk {
struct BotSnapshot {
 int entityIndex=-1; int team=0; bool alive=false; float health=0,armor=0;
 float distanceToThreat=0,threatPressure=0; int alliesNearby=0,enemiesKnown=0,secondsLeft=90;
 bool hasCover=false,seesThreat=false,bombCarried=false,bombPlanted=false,siteThreatened=false;
 bool teammateRecentlyKilled=false,canTrade=false;float objectiveDistance=0;
 bool badDecision=false,afk=false,suicide=false,teamKill=false;int eventReward=0;
};
struct TacticalDecision { BrainIntent brain{}; bool trustCallout=false; Plate targetPlate=Plate::Chest; };
class BotRuntime {
 public:
  explicit BotRuntime(Traits traits={},BotRole role=BotRole::Entry):brain_(traits,role),mind_(traits){}
  TacticalDecision Evaluate(const BotSnapshot&,Economy&,bool terroristTeam,const Callout* callout,
    float reliability,const std::array<PlateState,(size_t)Plate::Count>& armor,
    const std::vector<MemoryEntry>& sharedMemory);
  BotBrain& Brain(){return brain_;} Mind& MindState(){return mind_;}
 private:BotBrain brain_;Mind mind_;
};
}