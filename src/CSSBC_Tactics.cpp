#include "CSSBC_Tactics.h"
#include <algorithm>
namespace cssbc {
TacticalOutput DecideTactics(const Traits& t,const TacticalInput& i){
 auto out=[](TacticalAction a,float u,const char*r){return TacticalOutput{a,std::clamp(u,0.f,1.f),r};};
 if(i.bombPlanted && i.siteThreatened && i.objectiveDistance<700 && i.secondsLeft>0) return out(TacticalAction::Defuse,1.f,"urgent objective");
 if(i.bombCarried && !i.bombPlanted && i.objectiveDistance<350 && i.secondsLeft>12) return out(TacticalAction::Plant,.95f,"plant opportunity");
 if(i.teammateRecentlyKilled && i.canTrade && i.health>35 && t.teamwork>.35f) return out(TacticalAction::TradeKill,.82f,"trade teammate");
 const float danger=(i.seesThreat?.35f:0.f)+i.threatPressure*.45f+(i.enemiesKnown>i.alliesNearby+1?.2f:0.f);
 const float survival=(100.f-i.health)/100.f+(i.armor<25?.12f:0.f);
 if(i.health<24||(survival+danger>1.05f&&t.courage<.72f)) return out(TacticalAction::Retreat,.9f,"critical survival");
 if(i.seesThreat&&!i.hasCover&&(i.health<72||danger>.45f)) return out(TacticalAction::TakeCover,.78f,"exposed under fire");
 if(i.role==BotRole::Sniper&&i.seesThreat&&i.hasCover&&i.distanceToThreat>900) return out(TacticalAction::Hold,.68f,"sniper lane");
 if(i.role==BotRole::Anchor&&i.siteThreatened&&i.alliesNearby<2) return out(TacticalAction::Hold,.8f,"anchor site");
 if(i.role==BotRole::Support&&i.alliesNearby>0&&i.seesThreat) return out(TacticalAction::SupportFire,.7f,"cover teammates");
 if(i.secondsLeft<18&&!i.bombPlanted&&!i.bombCarried) return out(TacticalAction::Advance,.75f,"time pressure");
 if(i.role==BotRole::IGL&&i.enemiesKnown>i.alliesNearby+1&&i.objectiveDistance>500) return out(TacticalAction::Rotate,.65f,"outnumbered route");
 if(i.hasCover&&i.seesThreat&&t.discipline>.65f) return out(TacticalAction::Hold,.6f,"disciplined cover");
 return out(TacticalAction::Advance,.45f,"default push");
}}
