#include "CSSBC_TacticalBrain.h"
#include <algorithm>
namespace cssbc {
TacticalDecision TacticalBrain::Decide(const TacticalInput& i) const {
 TacticalDecision d{}; const float hp=std::clamp(i.health,0.f,100.f)/100.f; const int alive=std::max(0,i.teammatesAlive);
 if(i.bombPlanted){d.goal=BotGoal::Retake;d.urgency=std::clamp(1.f-i.secondsLeft/45.f,0.f,1.f);d.reason="bomb planted: retake";if(i.secondsLeft<12.f&&alive>0)d.order=BotOrder::Push;else if(alive<=1)d.order=BotOrder::Regroup;return d;}
 if(i.lowAmmo&&hp<.35f&&alive>1){d.goal=BotGoal::Retreat;d.order=BotOrder::Save;d.urgency=.8f;d.reason="low ammo and critical health";return d;}
 if(i.teammateRecentlyDied&&i.hasEnemySight&&traits_.teamwork>.55f){d.goal=BotGoal::Attack;d.order=BotOrder::Trade;d.urgency=.72f;d.reason="trade fallen teammate";return d;}
 if(i.enemiesAlive<=0){d.goal=BotGoal::Hold;d.order=BotOrder::HoldPosition;d.urgency=.15f;d.reason="no known living enemies";return d;}
 if(i.hasEnemySight){d.goal=BotGoal::Attack;d.order=alive>=2?BotOrder::Push:BotOrder::HoldPosition;d.urgency=.55f+.35f*traits_.courage;d.reason="enemy contact";return d;}
 if(i.bombCarrierKnown){d.goal=BotGoal::Follow;d.order=BotOrder::Cover;d.urgency=.55f;d.reason="escort bomb carrier";return d;}
 if(i.bombAtSite){d.goal=BotGoal::DefendBomb;d.order=BotOrder::HoldPosition;d.urgency=.6f;d.reason="guard planted objective";return d;}
 if(hp<.25f&&alive>0){d.goal=BotGoal::Retreat;d.order=BotOrder::Regroup;d.urgency=.7f;d.reason="critical health regroup";return d;}
 d.goal=BotGoal::Attack;d.order=i.distanceToObjective>1200.f?BotOrder::Rotate:BotOrder::Push;d.urgency=.35f+.3f*traits_.discipline;d.reason="advance to objective";return d;
}
BotOrder TacticalBrain::SquadOrder(const TacticalInput&i,SquadRole r)const{auto d=Decide(i);switch(r){case SquadRole::Leader:return d.order==BotOrder::None?BotOrder::Regroup:d.order;case SquadRole::Entry:return(d.goal==BotGoal::Attack||d.goal==BotGoal::Retake)?BotOrder::Push:d.order;case SquadRole::Support:return d.goal==BotGoal::Attack?BotOrder::Cover:(d.order==BotOrder::None?BotOrder::Regroup:d.order);case SquadRole::Sniper:return(d.goal==BotGoal::Attack||d.goal==BotGoal::DefendBomb)?BotOrder::HoldPosition:d.order;}return BotOrder::None;}
}