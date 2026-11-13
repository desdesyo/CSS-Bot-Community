#include "CSSBC_System.h"
#include "CSSBC_SupportRoster.h"
#include "CSSBC_TeamMemory.h"
#include "CSSBC_Combat.h"
#include "CSSBC_CombatTeam.h"
#include "CSSBC_Tactics.h"
#include "CSSBC_Economy.h"
#include "CSSBC_GameModes.h"
#include "CSSBC_Config.h"
#include <cassert>
#include <iostream>
using namespace cssbc;
int main(){
 CSSBCSystem s;SupportOrder o{}; Economy eco;eco.ResetRound(1);
 // Economy: positive rewards, credit floor, CT collective debt and T-side tolerance.
 auto reward=eco.Apply({5,300,MoneyEvent::Kill,1},false);assert(reward.applied&&reward.balance==300);
 auto bad=eco.Apply({5,-2500,MoneyEvent::BadDecision,1},false);assert(bad.balance==-3000&&bad.debt==3000);
 std::array<int,64> teammates{},income{};teammates[1]=teammates[2]=teammates[3]=1;income[1]=income[2]=income[3]=1000;
 auto settle=eco.SettleTeamDebt(5,teammates,income,4,false);assert(settle.paid==3000&&settle.remainingDebt==0);
 assert(eco.Finance(5).balance==0&&eco.Finance(1).balance==-1000);
 Economy tEco; tEco.Apply({5,-200,MoneyEvent::BadDecision,1},true);
 auto ignored=tEco.SettleTeamDebt(5,teammates,income,4,true);assert(ignored.paid==0&&ignored.remainingDebt==200);
 auto buy=eco.Buy({2,1,800,true,true,BuyItem::Armor});assert(buy.accepted&&buy.moneyAfter==150);assert(!eco.Buy({2,1,800,true,true,BuyItem::Pistol}).accepted);assert(RulesFor(GameMode::Deathmatch).respawn);ProjectConfig pc;assert(ValidateConfig(pc));pc.botDifficulty=2;assert(!ValidateConfig(pc)); TacticalInput ti;ti.role=BotRole::Sniper;ti.seesThreat=true;ti.hasCover=true;ti.distanceToThreat=1400;assert(DecideTactics(Traits{},ti).action==TacticalAction::Hold); ti={};ti.health=15;ti.seesThreat=true;assert(DecideTactics(Traits{},ti).action==TacticalAction::Retreat); ti={};ti.bombCarried=true;ti.objectiveDistance=200;assert(DecideTactics(Traits{},ti).action==TacticalAction::Plant); ti={};ti.teammateRecentlyKilled=true;ti.canTrade=true;ti.health=80;assert(DecideTactics(Traits{},ti).action==TacticalAction::TradeKill);
 assert(!s.RequestSupport(SupportTier::Juggernaut16000,1,16000,2,o));
 assert(s.RequestSupport(SupportTier::Juggernaut16000,1,16000,3,o));
 assert(o.moneySpent==16000&&o.buyer==1);
 assert(s.CanPurchase(SupportTier::Squad9000,9000,0));
 JuggernautArmor armor;assert(!armor.ApplyHit(Plate::Chest,.4f));assert(armor.ApplyHit(Plate::Chest,.7f));assert(armor.Get(Plate::Chest).broken);
 s.MVP().Add(3,EventKind::Rescue,5);assert(s.MVP().Get(3)==11);
 assert(s.RetreatProbability(Traits{},1,3,0)<s.RetreatProbability(Traits{},.2f,0,1));
 assert(s.CoverReward(4,2)==16);
 SupportRoster roster;assert(roster.Deploy(SupportTier::Squad9000));assert(roster.Units().size()==4);assert(roster.IsAutonomous());
 assert(roster.Deploy(SupportTier::Juggernaut16000));assert(roster.Units().size()==1&&roster.Units()[0].role==SupportRole::Juggernaut);
 TeamMemory mem;mem.Publish({EventKind::PlateCracked,2,4,Plate::LeftArm,.9f,10.f,"left arm cracked"});assert(mem.Recent(11.f).size()==1);assert(mem.Recent(30.f,5.f).empty());
 JuggernautArmor combatArmor;CombatResolver combat;auto hit=combat.Resolve(combatArmor,Plate::Chest,100.f);
 assert(hit.armorDamage==72.f&&hit.healthDamage==28.f&&hit.broken);
 PlateLearning learn;learn.Observe(Plate::LeftArm,30.f,1.f);assert(learn.Confidence(Plate::LeftArm,2.f)>0.f);
 assert(learn.Confidence(Plate::LeftArm,40.f)<learn.Confidence(Plate::LeftArm,2.f));
 auto chosen=learn.Recommend(2.f,42u);assert((size_t)chosen<(size_t)Plate::Count);
 CombatTeamBridge bridge;JuggernautArmor bridgedArmor;PlateLearning sharedLearn;
 auto br=bridge.OnHit(bridgedArmor,{7,9,Plate::RightArm,100.f,4.f},combat,sharedLearn,mem);
 assert(br.healthDamage>0&&sharedLearn.Confidence(Plate::RightArm,5.f)>0);
 assert(!mem.Recent(5.f).empty());
 bridge.OnCallout(7,9,Plate::RightArm,.8f,5.f,mem);
 std::cout<<"CSSBC core tests: PASS\n";
}