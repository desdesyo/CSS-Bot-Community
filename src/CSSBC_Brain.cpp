#include "CSSBC_Brain.h"
#include <algorithm>
namespace cssbc {
BrainIntent BotBrain::Tick(const BrainSnapshot& s,Economy& economy,bool terrorist){
 BrainIntent out{};
 if(s.player<0||s.player>=64){out.reason="invalid bot";return out;}
 TacticalInput input{};input.role=role_;input.health=s.health;input.armor=s.armor;
 input.distanceToThreat=s.distanceToThreat;input.threatPressure=s.threatPressure;
 input.alliesNearby=s.alliesNearby;input.enemiesKnown=s.enemiesKnown;input.secondsLeft=s.secondsLeft;
 input.seesThreat=s.seesThreat;input.hasCover=s.hasCover;input.bombCarried=s.bombCarried;
 input.bombPlanted=s.bombPlanted;input.siteThreatened=s.siteThreatened;
 input.teammateRecentlyKilled=s.teammateRecentlyKilled;input.canTrade=s.canTrade;
 input.objectiveDistance=s.objectiveDistance;
 auto tactical=DecideTactics(traits_,input);out.tactical=tactical.action;out.urgency=tactical.urgency;out.reason=tactical.reason;
 out.retreat=tactical.action==TacticalAction::Retreat;
 out.seekCover=tactical.action==TacticalAction::TakeCover;
 out.callSupport=tactical.action==TacticalAction::SupportFire;
 out.cooperation=economy.Cooperation(s.player,terrorist);
 // Bad-decision penalty is applied only once per round to avoid frame-loop farming.
 if(s.badDecision&&lastEventRound_!=s.round){
  auto m=economy.Apply({s.player,0,MoneyEvent::BadDecision,s.round},terrorist);
  out.moneyDelta+=m.actualDelta;lastEventRound_=s.round;
 }
 if(s.afk&&lastEventRound_!=s.round){
  auto m=economy.Apply({s.player,0,MoneyEvent::AFK,s.round},terrorist);
  out.moneyDelta+=m.actualDelta;lastEventRound_=s.round;
 }
 if(s.suicide){auto m=economy.Apply({s.player,0,MoneyEvent::Suicide,s.round},terrorist);out.moneyDelta+=m.actualDelta;}
 if(s.teamKill){auto m=economy.Apply({s.player,0,MoneyEvent::TeamKill,s.round},terrorist);out.moneyDelta+=m.actualDelta;}
 if(s.eventReward>0){auto m=economy.Apply({s.player,s.eventReward,MoneyEvent::Kill,s.round},terrorist);out.moneyDelta+=m.actualDelta;}
 lastRound_=s.round;
 return out;
}
}
