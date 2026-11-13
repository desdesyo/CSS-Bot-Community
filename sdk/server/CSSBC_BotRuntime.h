# CSSBC SDK integration boundary (server-side)
#pragma once
// Include this from the CS:S server DLL project after adapting SDK types.
// Core remains engine-independent; adapter is the only layer touching Source entities.
#include "CSSBC_Mind.h"
#include "CSSBC_CombatTeam.h"
#include "CSSBC_MVP.h"
#include "CSSBC_SupportRoster.h"
#include "CSSBC_System.h"
namespace cssbc::sdk {
struct BotSnapshot {
 int entityIndex=-1; int team=0; bool alive=false; float health=0;
 float distanceToThreat=0; bool hasCover=false; bool seesThreat=false;
};
struct TacticalDecision { bool retreat=false; bool seekCover=false; bool trustCallout=false; Plate targetPlate=Plate::Chest; };
class BotRuntime {
 public:
  explicit BotRuntime(Traits traits={}):mind_(traits){}
  TacticalDecision Evaluate(const BotSnapshot& bot,const Callout* callout,float reliability,
    const std::array<PlateState,(size_t)Plate::Count>& armor,const std::vector<MemoryEntry>& sharedMemory);
  Mind& MindState(){return mind_;}
 private: Mind mind_;
};
// Integration TODO in actual SDK game DLL:
// - map BotSnapshot from CBasePlayer/CBaseEntity, never store raw entity pointers in core
// - execute decisions through NextBot/CS:S bot command interfaces and frame budget
// - connect weapon models via precache/model paths, retain stock collision and hitboxes
// - call core event handlers on damage, death, round start/end and MVP
}
