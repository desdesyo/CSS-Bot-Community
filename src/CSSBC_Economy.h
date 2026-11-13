#pragma once
#include "CSSBC_Types.h"
#include <array>
#include <cstdint>
namespace cssbc {
enum class BuyItem:uint8_t { Pistol, SMG, Rifle, Sniper, Shotgun, Armor, Helmet, DefuseKit, Flash, Smoke, HE, Count };
struct BuyRequest { int player=-1,round=-1,money=0; bool inBuyZone=false,alive=true; BuyItem item=BuyItem::Rifle; };
struct BuyResult { bool accepted=false; int price=0,moneyAfter=0; const char* reason=""; };
struct BuyRule { int price=0; bool ctOnly=false,tOnly=false; };
inline constexpr std::array<BuyRule,(size_t)BuyItem::Count> kBuyRules{{
 {600,false,false},{1250,false,false},{2700,false,false},{4750,false,false},{2000,false,false},{650,false,false},{350,false,false},{400,true,false},{200,false,false},{300,false,false},{300,false,false}
}};
enum class MoneyEvent:uint8_t { Kill,Headshot,Assist,FirstBlood,Trade,Rescue,CoverSave,BombPlant,BombDefuse,ClutchWin,RoundWin,LastEnemy,GrenadeKill,Wallbang,BadDecision,Suicide,TeamKill,FriendlyDamage,AFK,LostExpensiveWeapon };
struct MoneyChange { int player=-1,amount=0;MoneyEvent event=MoneyEvent::BadDecision;int round=0; };
struct MoneyResult { bool applied=false;int balance=0,actualDelta=0,debt=0;const char* reason=""; };
struct DebtSettlement { int debtor=-1,contribution=0,remainingDebt=0; };
struct TeamMoneyResult { int paid=0,remainingDebt=0;std::array<DebtSettlement,64> shares{};int count=0; };
struct BotFinance { int balance=0,debt=0;float trust=1.f,tension=0.f;bool premiumBlocked=false;int recentBadDecisions=0; };
class Economy {
public:
 BuyResult Buy(const BuyRequest&);void ResetRound(int round);MoneyResult Apply(const MoneyChange&,bool terroristTeam=false);
 TeamMoneyResult SettleTeamDebt(int debtor,const std::array<int,64>& teammates,const std::array<int,64>& availableIncome,int teamSize,bool terroristTeam);
 const BotFinance& Finance(int player)const;float Cooperation(int player,bool terroristTeam)const;int Balance(int player)const;void ResetMatch();
 static int Reward(MoneyEvent);static int Penalty(MoneyEvent);
private:
 int round_=-1;std::array<bool,64>bought_{};std::array<BotFinance,64>finance_{};
 std::array<int,64>badCount_{},lastBadRound_{};
};
}
