#include "CSSBC_BotRuntime.h"
namespace cssbc::sdk { SprayOutput BotRuntime::OnWeaponShot(WeaponId weapon,float now,bool moving,bool crouching,float skill){return FireSpray(weapon,spray_,now,moving,crouching,skill);} }
namespace cssbc::sdk {
TacticalDecision BotRuntime::Evaluate(const BotSnapshot& b,Economy& economy,bool terrorist,
 const Callout* c,float reliability,const std::array<PlateState,(size_t)Plate::Count>& armor,
 const std::vector<MemoryEntry>& shared){
 TacticalDecision d;if(c)d.trustCallout=mind_.ShouldHeed(*c,reliability);
 d.targetPlate=mind_.ChoosePlate(armor,shared);
 BrainSnapshot s;s.player=b.entityIndex;s.round=b.round;s.team=b.team;s.health=b.health;s.armor=b.armor;
 s.distanceToThreat=b.distanceToThreat;s.threatPressure=b.threatPressure;s.alliesNearby=b.alliesNearby;
 s.enemiesKnown=b.enemiesKnown;s.secondsLeft=b.secondsLeft;s.seesThreat=b.seesThreat;s.hasCover=b.hasCover;
 s.bombCarried=b.bombCarried;s.bombPlanted=b.bombPlanted;s.siteThreatened=b.siteThreatened;
 s.teammateRecentlyKilled=b.teammateRecentlyKilled;s.canTrade=b.canTrade;s.objectiveDistance=b.objectiveDistance;
 s.badDecision=b.badDecision;s.afk=b.afk;s.suicide=b.suicide;s.teamKill=b.teamKill;s.eventReward=b.eventReward;
 d.brain=brain_.Tick(s,economy,terrorist);return d;
}
}