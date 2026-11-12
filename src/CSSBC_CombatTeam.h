#pragma once
#include "CSSBC_Combat.h"
#include "CSSBC_TeamMemory.h"
namespace cssbc {
struct CombatObservation { int shooter=-1,victim=-1; Plate plate=Plate::Chest; float damage=0,time=0; };
class CombatTeamBridge {
public:
 HitResult OnHit(JuggernautArmor& armor,const CombatObservation& hit,
                 CombatResolver& resolver,PlateLearning& learning,TeamMemory& memory);
 void OnCallout(int sender,int target,Plate plate,float confidence,float now,TeamMemory& memory);
};
}
