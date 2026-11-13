#pragma once
#include "CSSBC_System.h"
#include "CSSBC_Economy.h"
#include "CSSBC_SupportRoster.h"
#include <array>
namespace cssbc {
// Round-level orchestration seam. The SDK adapter calls these methods from real game events.
struct RoundState {
 int round=-1; bool live=false; int deadT=0,deadCT=0;
 std::array<int,64> roster{}; std::size_t rosterSize=0;
};
struct SupportPurchaseResult { bool ok=false; int balance=0; const char* reason=""; };
class MatchCoordinator {
public:
 void BeginRound(int round,const int* players,std::size_t count);
 SupportPurchaseResult BuySupport(int player,SupportTier tier,int teamMoney,int deadAllies,
                                  bool isTerrorist,Economy& economy,SupportRoster& support);
 bool AwardEvent(int round,int actor,EventKind kind,float value,int target,float gameTime);
 std::vector<MVPEntry> EndRound(std::size_t podium=3);
 const RoundState& State()const{return state_;}
 CSSBCSystem& Rules(){return rules_;}
private:
 RoundState state_{};CSSBCSystem rules_;
};
}