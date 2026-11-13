#include "CSSBC_BotRuntime.h"
#include <algorithm>
namespace cssbc::sdk {
TacticalDecision BotRuntime::Evaluate(const BotSnapshot& b,const Callout* c,float reliability,
 const std::array<PlateState,(size_t)Plate::Count>& armor,const std::vector<MemoryEntry>& shared){
 TacticalDecision d;
 if(c)d.trustCallout=mind_.ShouldHeed(*c,reliability);
 d.targetPlate=mind_.ChoosePlate(armor,shared);
 // Conservative tactical fallback: low health and exposed threat -> retreat/cover.
 const float health=std::clamp(b.health,0.f,100.f);
 d.seekCover=b.seesThreat&&!b.hasCover&&health<72.f;
 d.retreat=b.alive&&b.seesThreat&&health<28.f&&b.distanceToThreat<900.f;
 return d;
}
}
