#include "CSSBC_Economy.h"
#include <algorithm>
namespace cssbc {
namespace { constexpr int kCreditFloor=-3000;constexpr float clamp01(float x){return x<0?0.f:(x>1?1.f:x);} }
void Economy::ResetRound(int r){round_=r;bought_.fill(false);}
void Economy::ResetMatch(){round_=-1;bought_.fill(false);finance_.fill(BotFinance{});badCount_.fill(0);lastBadRound_.fill(-1000);}
int Economy::Reward(MoneyEvent e){switch(e){case MoneyEvent::Kill:return 300;case MoneyEvent::Headshot:return 100;case MoneyEvent::Assist:return 150;case MoneyEvent::FirstBlood:return 500;case MoneyEvent::Trade:return 300;case MoneyEvent::Rescue:return 500;case MoneyEvent::CoverSave:return 250;case MoneyEvent::BombPlant:return 300;case MoneyEvent::BombDefuse:return 600;case MoneyEvent::ClutchWin:return 1000;case MoneyEvent::RoundWin:return 3250;case MoneyEvent::LastEnemy:return 300;case MoneyEvent::GrenadeKill:return 400;case MoneyEvent::Wallbang:return 150;default:return 0;}}
int Economy::Penalty(MoneyEvent e){switch(e){case MoneyEvent::BadDecision:return 200;case MoneyEvent::Suicide:return 1000;case MoneyEvent::TeamKill:return 1500;case MoneyEvent::FriendlyDamage:return 300;case MoneyEvent::AFK:return 250;case MoneyEvent::LostExpensiveWeapon:return 300;default:return 0;}}
MoneyResult Economy::Apply(const MoneyChange&e,bool terrorist){
 if(e.player<0||e.player>=64)return {false,0,0,0,"invalid player"};
 auto&f=finance_[e.player];int delta=e.amount?e.amount:Reward(e.event)-Penalty(e.event);
 if(e.event==MoneyEvent::BadDecision){if(e.round-lastBadRound_[e.player]<=5)badCount_[e.player]++;else badCount_[e.player]=1;lastBadRound_[e.player]=e.round;f.recentBadDecisions=badCount_[e.player];}
 if(delta>0&&f.debt>0){int paid=std::min(delta,f.debt);f.debt-=paid;delta-=paid;}
 int next=std::max(kCreditFloor,f.balance+delta),actual=next-f.balance;f.balance=next;f.debt=std::max(0,-f.balance);
 float ratio=clamp01(float(f.debt)/3000.f);
 // An isolated mistake is normal gameplay. CT social pressure starts only after repeated errors while in debt.
 const bool chronic=badCount_[e.player]>=3;
 f.tension=clamp01(f.tension*.82f+(chronic&&f.debt>0?.10f:0.f)+(e.event==MoneyEvent::TeamKill?.18f:0.f));
 f.trust=clamp01(1.f-(chronic&&f.debt>0?ratio*(terrorist?.18f:.45f):0.f)-f.tension*(terrorist?.08f:.18f));
 f.premiumBlocked=f.debt>0;return {true,f.balance,actual,f.debt,"applied"};
}
TeamMoneyResult Economy::SettleTeamDebt(int debtor,const std::array<int,64>&mates,const std::array<int,64>&income,int teamSize,bool terrorist){
 TeamMoneyResult out{};if(debtor<0||debtor>=64||teamSize<=0)return out;auto&d=finance_[debtor];int debt=d.debt;if(debt<=0)return out;if(terrorist){out.remainingDebt=debt;return out;}
 int eligible=0;for(int i=0;i<64;i++)if(i!=debtor&&mates[i]&&income[i]>0&&finance_[i].balance>-3000)eligible++;
 if(!eligible){out.remainingDebt=debt;return out;}int rem=debt;
 for(int i=0;i<64&&rem>0;i++){if(i==debtor||!mates[i]||income[i]<=0)continue;int share=(rem+eligible-1)/eligible;int room=finance_[i].balance+3000;int take=std::min({share,income[i],rem,std::max(0,room)});if(!take)continue;
 out.shares[out.count++]={debtor,take,rem-take};finance_[i].balance-=take;finance_[i].debt=std::max(0,-finance_[i].balance);rem-=take;--eligible;}
 out.paid=debt-rem;d.balance+=out.paid;d.debt=std::max(0,-d.balance);out.remainingDebt=d.debt;d.premiumBlocked=d.debt>0;return out;
}
const BotFinance&Economy::Finance(int p)const{static const BotFinance invalid{};return p<0||p>=64?invalid:finance_[p];}
int Economy::Balance(int p)const{return p<0||p>=64?0:finance_[p].balance;}
float Economy::Cooperation(int p,bool terrorist)const{if(p<0||p>=64)return 0;const auto&f=finance_[p];float chronic=badCount_[p]>=3&&f.debt>0?clamp01(float(badCount_[p]-2)/4.f):0.f;return clamp01(1.f-chronic*(terrorist?.12f:.35f)-f.tension*(terrorist?.06f:.12f));}
BuyResult Economy::Buy(const BuyRequest&r){if(r.player<0||r.player>=64)return{false,0,r.money,"invalid player"};if(!r.alive)return{false,0,r.money,"dead player"};if(!r.inBuyZone)return{false,0,r.money,"outside buy zone"};if(round_!=r.round)ResetRound(r.round);if(bought_[r.player])return{false,0,r.money,"already purchased this round"};auto rule=kBuyRules[(size_t)r.item];int wallet=finance_[r.player].balance;int available=std::max(r.money,wallet);if(available<rule.price)return{false,rule.price,r.money,"not enough money"};int after=std::max(kCreditFloor,available-rule.price);bought_[r.player]=true;finance_[r.player].balance=after;finance_[r.player].debt=std::max(0,-after);finance_[r.player].premiumBlocked=finance_[r.player].debt>0;return{true,rule.price,after,"purchase accepted"};}
}
