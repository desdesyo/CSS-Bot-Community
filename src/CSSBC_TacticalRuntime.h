#pragma once
#include "CSSBC_TacticalBrain.h"
#include <vector>
namespace cssbc {
// Engine boundary: Source adapter implements observations and translates orders to bot navigation/actions.
class IBotGameAdapter {
public:
 virtual ~IBotGameAdapter()=default;
 virtual bool ReadTacticalInput(int botIndex,TacticalInput& out)=0;
 virtual void ApplyBotGoal(int botIndex,BotGoal goal,BotOrder order,float urgency)=0;
};
struct BotRuntimeSlot { int entityIndex=-1; Traits traits{}; SquadRole role=SquadRole::Entry; bool enabled=true; };
class TacticalRuntime {
public:
 void AddBot(BotRuntimeSlot bot){bots_.push_back(bot);}
 void Clear(){bots_.clear();}
 size_t Count()const{return bots_.size();}
 void Tick(IBotGameAdapter& adapter)const;
private: std::vector<BotRuntimeSlot> bots_;
};
}
