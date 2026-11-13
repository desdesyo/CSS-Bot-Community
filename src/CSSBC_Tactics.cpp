#include "CSSBC_Tactics.h"
#include <algorithm>
namespace cssbc {
TacticalOutput DecideTactics(const Traits&t,const TacticalInput&i){
 auto out=[&](TacticalAction a,float u,const char*r){float skill=.78f+.22f*std::clamp(t.discipline*.5f+t.adaptability*.5f,0.f,1.f);return TacticalOutput{a,std::clamp(u*skill,.25f,.88f),r};};
 // Objectives are priorities, not flawless reflexes: require time and proximity.
 if(i.bombPlanted&&i.siteThreatened&&i.objectiveDistance<520&&i.secondsLeft>3)return out(TacticalAction::Defuse,.82f,"attempt retake/defuse");
 if(i.bombCarried&&!i.bombPlanted&&i.objectiveDistance<260&&i.secondsLeft>18)return out(TacticalAction::Plant,.78f,"nearby plant opportunity");
 if(i.teammateRecentlyKilled&&i.canTrade&&i.health>42&&t.teamwork>.48f&&t.courage>.35f)return out(TacticalAction::TradeKill,.66f,"possible trade");
 const float danger=(i.seesThreat?.28f:0.f)+i.threatPressure*.38f+(i.enemiesKnown>i.alliesNearby+1?.16f:0.f);
 const float survival=(100.f-i.health)/100.f+(i.armor<20?.08f:0.f);
 // Avoid robotic instant retreat at low-but-playable HP; courage changes risk tolerance.
 if(i.health<16||(survival+danger>1.12f&&t.courage<.58f))return out(TacticalAction::Retreat,.76f,"survival instinct");
 if(i.seesThreat&&!i.hasCover&&(i.health<58||danger>.62f))return out(TacticalAction::TakeCover,.64f,"exposed; seek cover");
 if(i.role==BotRole::Sniper&&i.seesThreat&&i.hasCover&&i.distanceToThreat>1200&&t.discipline>=.5f)return out(TacticalAction::Hold,.56f,"hold long lane");
 if(i.role==BotRole::Anchor&&i.siteThreatened&&i.alliesNearby<1)return out(TacticalAction::Hold,.62f,"anchor site");
 if(i.role==BotRole::Support&&i.alliesNearby>0&&i.seesThreat&&t.teamwork>.4f)return out(TacticalAction::SupportFire,.55f,"support nearby teammate");
 if(i.secondsLeft<12&&!i.bombPlanted&&!i.bombCarried)return out(TacticalAction::Advance,.62f,"late-round pressure");
 if(i.role==BotRole::IGL&&i.enemiesKnown>i.alliesNearby+1&&i.objectiveDistance>700&&t.adaptability>.45f)return out(TacticalAction::Rotate,.52f,"consider safer route");
 if(i.hasCover&&i.seesThreat&&t.discipline>.72f)return out(TacticalAction::Hold,.48f,"use cover");
 return out(TacticalAction::Advance,.38f,"move toward objective");
}}
