#include "CSSBC_System.h"
#include "CSSBC_SupportRoster.h"
#include "CSSBC_TeamMemory.h"
#include "CSSBC_Combat.h"
#include "CSSBC_Spray.h"
#include "CSSBC_CombatTeam.h"
#include "CSSBC_Tactics.h"
#include "CSSBC_Economy.h"
#include "CSSBC_GameModes.h"
#include "CSSBC_Config.h"
#include "CSSBC_Brain.h"
#include "CSSBC_Melee.h"
#include "CSSBC_MeleeCombat.h"
#include "CSSBC_MVP.h"
#include "CSSBC_Awards.h"
#include <cassert>
#include <limits>
#include <cmath>
#include <iostream>
using namespace cssbc;
int main(){
 CSSBCSystem s;SupportOrder o{}; Economy eco;eco.ResetRound(1);
 BotBrain brain(Traits{},BotRole::Entry);BrainSnapshot bs;bs.player=12;bs.round=1;bs.health=18;bs.seesThreat=true;
 auto intent=brain.Tick(bs,eco,false);assert(intent.tactical==TacticalAction::Retreat&&intent.retreat);
 bs.health=90;bs.seesThreat=false;bs.badDecision=true;bs.round=2;
 auto financeIntent=brain.Tick(bs,eco,false);assert(financeIntent.moneyDelta<0&&financeIntent.cooperation>.95f);
 bs.round=3;brain.Tick(bs,eco,false);bs.round=4;auto chronic=brain.Tick(bs,eco,false);assert(chronic.cooperation<financeIntent.cooperation);
 
 // Economy: positive rewards, credit floor, CT collective debt and T-side tolerance.
 auto reward=eco.Apply({5,300,MoneyEvent::Kill,1},false);assert(reward.applied&&reward.balance==300);
 auto bad=eco.Apply({5,-4000,MoneyEvent::BadDecision,1},false);assert(bad.balance==-3000&&bad.debt==3000);
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
 // Live-match MVP ledger: event attribution remains after a player dies.
 MVPScore roundMvp;
 assert(roundMvp.Record(4,9,EventKind::Kill,1.f,12,35.f));
 assert(roundMvp.Record(4,15,EventKind::Headshot,1.f,9,36.f));
 assert(roundMvp.Record(4,21,EventKind::GrenadeImpact,2.f,9,37.f));
 assert(!roundMvp.Record(5,9,EventKind::Kill,1.f,12,38.f));
 auto leaders=roundMvp.Rank({9,15,21},3);
 assert(leaders.size()==3&&leaders[0].player==9&&leaders[1].player==15);
 AwardEngine awards;
 auto firstBlood=awards.Process({9,4,AwardTrigger::Kill});
 assert(firstBlood.size()==1&&awards.XP(9)==20&&awards.MapScore(9)==100);
 auto penalty=awards.Process({9,4,AwardTrigger::TeamKill});
 assert(penalty.size()==1&&penalty[0].money==-300&&awards.MapScore(9)==-200);
 assert(s.RetreatProbability(Traits{},1,3,0)<s.RetreatProbability(Traits{},.2f,0,1));
 assert(s.CoverReward(4,2)==16);
 SupportRoster roster;assert(roster.Deploy(SupportTier::Squad9000));assert(roster.Units().size()==4);assert(roster.IsAutonomous());
 assert(roster.Deploy(SupportTier::Juggernaut16000));assert(roster.Units().size()==1&&roster.Units()[0].role==SupportRole::Juggernaut);
 TeamMemory mem;mem.Publish({EventKind::PlateCracked,2,4,Plate::LeftArm,.9f,10.f,"left arm cracked"});assert(mem.Recent(11.f).size()==1);assert(mem.Recent(30.f,5.f).empty());
 JuggernautArmor combatArmor;CombatResolver combat;auto hit=combat.Resolve(combatArmor,Plate::Chest,100.f);
 assert(std::fabs(hit.armorDamage-72.f)<0.01f&&std::fabs(hit.healthDamage-28.f)<0.01f&&hit.broken);
 PlateLearning learn;learn.Observe(Plate::LeftArm,30.f,1.f);assert(learn.Confidence(Plate::LeftArm,2.f)>0.f);
 assert(learn.Confidence(Plate::LeftArm,40.f)<learn.Confidence(Plate::LeftArm,2.f));
 auto chosen=learn.Recommend(2.f,42u);assert((size_t)chosen<(size_t)Plate::Count);
 // Mode changes are queued, then applied only at the following round start.
 MeleeModeController modes;assert(modes.Active()==MeleeMode::Normal);
 modes.Queue(MeleeMode::Fists);assert(modes.Active()==MeleeMode::Normal&&modes.HasPending());
 assert(modes.OnRoundStart(8)&&modes.Active()==MeleeMode::Fists&&!modes.HasPending());
 modes.Queue(MeleeMode::Knife);assert(modes.Active()==MeleeMode::Fists);
 assert(modes.OnRoundStart(9)&&modes.Active()==MeleeMode::Knife&&modes.Snapshot().appliedRound==9);
 MeleeState ctFist{},tFist{};auto ctPunch=SelectMeleeAction(MeleeMode::Fists,MeleeFaction::CT,ctFist,42,10.f,.8f);
 auto tPunch=SelectMeleeAction(MeleeMode::Fists,MeleeFaction::T,tFist,42,10.f,.8f);
 assert(ctPunch.animationVariant!=tPunch.animationVariant);
 assert(ctPunch.profile.range>0&&ctPunch.profile.recovery>0);
 // Melee combat: cooldown -> windup -> server trace impact, friendly blocked.
 MeleeCombatant fighter(123);auto started=fighter.Begin(MeleeMode::Fists,MeleeFaction::CT,20.f,.5f);
 assert(started.started&&fighter.IsAttacking());
 auto early=fighter.ResolveImpact({4,20.f,true,false},20.1f);assert(!early.hit&&fighter.IsAttacking());
 auto meleeHit=fighter.ResolveImpact({4,30.f,true,false},20.5f);assert(meleeHit.hit&&meleeHit.targetEntity==4&&meleeHit.damage>0&&!fighter.IsAttacking());
 auto blocked=fighter.Begin(MeleeMode::Knife,MeleeFaction::T,21.f,.5f);assert(blocked.started);
 auto friendly=fighter.ResolveImpact({8,10.f,true,true},21.3f);assert(!friendly.hit);
 fighter.Cancel();assert(!fighter.IsAttacking());
 // Defensive regression cases: invalid numeric input and malformed trace cannot create damage.
 auto badTime=fighter.Begin(MeleeMode::Fists,MeleeFaction::CT,std::numeric_limits<float>::quiet_NaN(),.5f);assert(!badTime.started);
 auto badSkill=fighter.Begin(MeleeMode::Fists,MeleeFaction::CT,22.f,std::numeric_limits<float>::infinity());assert(!badSkill.started);
 auto badMode=fighter.Begin(MeleeMode::Normal,MeleeFaction::CT,22.f,.5f);assert(!badMode.started);
 auto malformed=fighter.Begin(MeleeMode::Fists,MeleeFaction::CT,22.f,.5f);assert(malformed.started);
 auto nanTrace=fighter.ResolveImpact({4,std::numeric_limits<float>::quiet_NaN(),true,false},22.5f);assert(!nanTrace.hit&&!fighter.IsAttacking());
 auto cannotRetry=fighter.ResolveImpact({4,10.f,true,false},22.5f);assert(!cannotRetry.hit);

 // Per-weapon recoil is deterministic and differs between guns; recovery resets a burst.
 SprayState akSpray{},m4Spray{};auto ak1=FireSpray(WeaponId::AK12,akSpray,1.f,false,false);
 auto ak2=FireSpray(WeaponId::AK12,akSpray,1.08f,false,false);
 SprayState m4State{};auto m41=FireSpray(WeaponId::M4Sopmod,m4State,1.f,false,false);
 assert(ak1.shotIndex==0&&ak2.shotIndex==1&&m41.shotIndex==0);
 assert(ak2.pitch>ak1.pitch&&ak2.pitch!=m41.pitch);
 auto resetShot=FireSpray(WeaponId::AK12,akSpray,2.f,false,false);assert(resetShot.shotIndex==0);
 assert(GetSprayProfile(WeaponId::MAC10).kickScale>GetSprayProfile(WeaponId::M4Sopmod).kickScale);
 CombatTeamBridge bridge;JuggernautArmor bridgedArmor;PlateLearning sharedLearn;
 auto br=bridge.OnHit(bridgedArmor,{7,9,Plate::RightArm,100.f,4.f},combat,sharedLearn,mem);
 assert(br.healthDamage>0&&sharedLearn.Confidence(Plate::RightArm,5.f)>0);
 assert(!mem.Recent(5.f).empty());
 bridge.OnCallout(7,9,Plate::RightArm,.8f,5.f,mem);
 std::cout<<"CSSBC core tests: PASS\\n";
}