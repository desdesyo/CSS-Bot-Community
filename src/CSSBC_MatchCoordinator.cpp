#include "CSSBC_MatchCoordinator.h"
#include <algorithm>
namespace cssbc {
void MatchCoordinator::BeginRound(int round,const int* players,std::size_t count){
 state_={};state_.round=round;state_.live=true;
 state_.rosterSize=std::min(count,state_.roster.size());
 for(std::size_t i=0;i<state_.rosterSize;++i)state_.roster[i]=players[i];
 rules_.MVP().Reset();
}
SupportPurchaseResult MatchCoordinator::BuySupport(int player,SupportTier tier,int teamMoney,int dead,
 bool terrorist,Economy& economy,SupportRoster& support){
 SupportPurchaseResult result;result.balance=teamMoney;
 SupportOrder order;
 if(!state_.live){result.reason="round_not_live";return result;}
 if(!rules_.RequestSupport(tier,player,teamMoney,dead,order)){result.reason="requirements_not_met";return result;}
 MoneyChange charge{player,-order.moneySpent,MoneyEvent::BadDecision,state_.round};
 auto debit=economy.Apply(charge,terrorist);
 if(!debit.applied){result.reason=debit.reason;return result;}
 if(!support.Deploy(tier)){result.reason="support_deploy_failed";return result;}
 result.ok=true;result.balance=debit.balance;result.reason="ok";
 rules_.MVP().Add(player,EventKind::SupportBought,1.f);
 return result;
}
bool MatchCoordinator::AwardEvent(int round,int actor,EventKind kind,float value,int target,float time){
 return state_.live&&round==state_.round&&rules_.MVP().Record(round,actor,kind,value,target,time);
}
std::vector<MVPEntry> MatchCoordinator::EndRound(std::size_t podium){
 if(!state_.live)return {};
 state_.live=false;
 std::vector<int> roster(state_.roster.begin(),state_.roster.begin()+state_.rosterSize);
 return rules_.MVP().Rank(roster,podium);
}
}