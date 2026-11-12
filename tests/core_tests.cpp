#include "CSSBC_System.h"
#include "CSSBC_SupportRoster.h"
#include "CSSBC_TeamMemory.h"
#include "CSSBC_Combat.h"
#include <cassert>
#include <iostream>
using namespace cssbc;
int main(){
 CSSBCSystem s;SupportOrder o{};
 assert(!s.RequestSupport(SupportTier::Juggernaut16000,1,16000,2,o));
 assert(s.RequestSupport(SupportTier::Juggernaut16000,1,16000,3,o));
 assert(o.moneySpent==16000&&o.buyer==1);
 assert(s.CanPurchase(SupportTier::Squad9000,9000,0));
 JuggernautArmor armor;assert(!armor.ApplyHit(Plate::Chest,.4f));assert(armor.ApplyHit(Plate::Chest,.7f));assert(armor.Get(Plate::Chest).broken);
 s.MVP().Add(3,EventKind::Rescue,5);assert(s.MVP().Get(3)==5);
 assert(s.RetreatProbability(Traits{},1,3,0)<s.RetreatProbability(Traits{},.2f,0,1));
 assert(s.CoverReward(4,2)==16);
 SupportRoster roster;assert(roster.Deploy(SupportTier::Squad9000));assert(roster.Units().size()==4);assert(roster.IsAutonomous());
 assert(roster.Deploy(SupportTier::Juggernaut16000));assert(roster.Units().size()==1&&roster.Units()[0].role==SupportRole::Juggernaut);
 TeamMemory mem;mem.Publish({EventKind::PlateCracked,2,4,Plate::LeftArm,.9f,10.f,"left arm cracked"});assert(mem.Recent(11.f).size()==1);assert(mem.Recent(30.f,5.f).empty());
 JuggernautArmor combatArmor;CombatResolver combat;auto hit=combat.Resolve(combatArmor,Plate::Chest,100.f);
 assert(hit.armorDamage==72.f&&hit.healthDamage==28.f&&!hit.broken);
 auto exposed=combat.Resolve(combatArmor,Plate::Chest,100.f);assert(exposed.armorDamage==72.f);
 PlateLearning learn;learn.Observe(Plate::LeftArm,30.f,1.f);assert(learn.Confidence(Plate::LeftArm,2.f)>0.f);
 assert(learn.Confidence(Plate::LeftArm,40.f)<learn.Confidence(Plate::LeftArm,2.f));
 auto chosen=learn.Recommend(2.f,42u);assert((size_t)chosen<(size_t)Plate::Count);
 std::cout<<"CSSBC core tests: PASS\n";
}