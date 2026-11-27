#include "CSSBC_TacticalRuntime.h"
namespace cssbc {
void TacticalRuntime::Tick(IBotGameAdapter& adapter) {
 const unsigned frame=tick_++;
 for(size_t i=0;i<bots_.size();++i){const auto& bot=bots_[i];if(!bot.enabled||bot.entityIndex<0)continue;
 // Bootstrap every bot once, then stagger refreshes to avoid a full squad think every frame.
 if(frame!=0 && frame%DecisionIntervalTicks!=i%DecisionIntervalTicks)continue;TacticalInput input{};
 if(!adapter.ReadTacticalInput(bot.entityIndex,input))continue;
 TacticalBrain brain(bot.traits);auto decision=brain.Decide(input);
 decision.order=brain.SquadOrder(input,bot.role);
 adapter.ApplyBotGoal(bot.entityIndex,decision.goal,decision.order,decision.urgency);
 }
}
}
