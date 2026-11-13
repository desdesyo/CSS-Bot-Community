#include "CSSBC_TacticalRuntime.h"
namespace cssbc {
void TacticalRuntime::Tick(IBotGameAdapter& adapter)const {
 for(const auto& bot:bots_){if(!bot.enabled||bot.entityIndex<0)continue;TacticalInput input{};
 if(!adapter.ReadTacticalInput(bot.entityIndex,input))continue;
 TacticalBrain brain(bot.traits);auto decision=brain.Decide(input);
 decision.order=brain.SquadOrder(input,bot.role);
 adapter.ApplyBotGoal(bot.entityIndex,decision.goal,decision.order,decision.urgency);
 }
}
}
