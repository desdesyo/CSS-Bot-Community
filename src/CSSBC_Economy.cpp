#include "CSSBC_Economy.h"
#include <algorithm>
#include <cmath>
namespace cssbc {
namespace {
constexpr int kCreditFloor=-3000;
constexpr float clamp01(float x){return x<0.f?0.f:(x>1.f?1.f:x);}
}
void Economy::ResetRound(int round){round_=round;bought_.fill(false);}
void Economy::ResetMatch(){round_=-1;bought_.fill(false);finance_.fill(BotFinance{});}
int Economy::Reward(MoneyEvent e){
 switch(e){
 case MoneyEvent::Kill:return 300; case MoneyEvent::Headshot:return 100;
 case MoneyEvent::Assist:return 150;case MoneyEvent::FirstBlood:return 500;
 case MoneyEvent::Trade:return 300;case MoneyEvent::Rescue:return 500;
 case MoneyEvent::CoverSave:return 250;case MoneyEvent::BombPlant:return 300;
 case MoneyEvent::BombDefuse:return 600;case MoneyEvent::ClutchWin:return 1000;
 case MoneyEvent::RoundWin:return 3250;case MoneyEvent::LastEnemy:return 300;
 case MoneyEvent::GrenadeKill:return 400;case MoneyEvent::Wallbang:return 150;
 default:return 0;
 }
}
int Economy::Penalty(MoneyEvent e){
 switch(e){
 case MoneyEvent::BadDecision:return 200;case MoneyEvent::Suicide:return 1000;
 case MoneyEvent::TeamKill:return 1500;case MoneyEvent::FriendlyDamage:return 300;
 case MoneyEvent::AFK:return 250;case MoneyEvent::LostExpensiveWeapon:return 300;
 default:return 0;
 }
}
MoneyResult Economy::Apply(const MoneyChange& e,bool terroristTeam){
 if(e.player<0||e.player>=64)return {false,0,0,0,"invalid player"};
 auto& f=finance_[e.player]; int delta=Reward(e.event)-Penalty(e.event);
 // Outstanding debt absorbs every positive award; no premium cash while indebted.
 if(delta>0&&f.debt>0){int paid=std::min(delta,f.debt);f.debt-=paid;delta-=paid;}
 const int next=std::max(kCreditFloor,f.balance+delta);
 const int actual=next-f.balance;f.balance=next;
 f.debt=std::max(0,-f.balance);
 const float debtRatio=clamp01(float(f.debt)/3000.f);
 f.tension=clamp01(f.tension*.75f+debtRatio*.35f+(actual<0?.04f:0.f));
 // CTs react to debt; T side is more tolerant, but still withholds positive awards.
 const float penalty=terroristTeam?.18f:.55f;
 f.trust=clamp01(1.f-debtRatio*penalty-f.tension*(terroristTeam?.12f:.35f));
 f.premiumBlocked=f.debt>0;
 return {true,f.balance,actual,f.debt,"applied"};
}
TeamMoneyResult Economy::SettleTeamDebt(int debtor,const std::array<int,64>& teammates,
 const std::array<int,64>& income,int teamSize,bool terroristTeam){
 TeamMoneyResult out{};if(debtor<0||debtor>=64||teamSize<=0)return out;
 auto& d=finance_[debtor];int debt=d.debt;if(debt<=0)return out;
 // T-side can ignore the debt: no collective deductions, debtor's premiums remain blocked.
 if(terroristTeam){out.remainingDebt=debt;return out;}
 int eligible=0;for(int i=0;i<64;++i)if(i!=debtor&&teammates[i]&&income[i]>0)++eligible;
 if(!eligible){out.remainingDebt=debt;return out;}
 // Split the outstanding amount evenly, capped by each teammate's available income.
 int remaining=debt;
 for(int i=0;i<64&&remaining>0;++i){
  if(i==debtor||!teammates[i]||income[i]<=0)continue;
  int share=(debt+eligible-1)/eligible;
  int take=std::min({share,income[i],remaining});
  if(take<=0)continue;
  out.shares[out.count++]={debtor,take,remaining-take};
  finance_[i].balance-=take;finance_[i].debt=std::max(0,-finance_[i].balance);
  remaining-=take;--eligible;
 }
 out.paid=debt-remaining;d.balance+=out.paid;d.debt=std::max(0,-d.balance);
 out.remainingDebt=d.debt;d.premiumBlocked=d.debt>0;
 float ratio=clamp01(float(d.debt)/3000.f);
 d.tension=clamp01(d.tension*.8f+ratio*.2f);
 d.trust=clamp01(1.f-ratio*(terroristTeam?.18f:.55f)-d.tension*(terroristTeam?.12f:.35f));
 return out;
}
const BotFinance& Economy::Finance(int p)const {static const BotFinance invalid{};return p<0||p>=64?invalid:finance_[p];}
int Economy::Balance(int p)const{return p<0||p>=64?0:finance_[p].balance;}
float Economy::Cooperation(int p,bool terroristTeam)const{
 if(p<0||p>=64)return 0.f;const auto& f=finance_[p];
 float debt=clamp01(float(f.debt)/3000.f);
 return clamp01(1.f-debt*(terroristTeam?.15f:.65f)-f.tension*(terroristTeam?.1f:.4f));
}
BuyResult Economy::Buy(const BuyRequest&r){
 if(r.player<0||r.player>=64)return {false,0,r.money,"invalid player"};
 if(!r.alive)return {false,0,r.money,"dead player"};
 if(!r.inBuyZone)return {false,0,r.money,"outside buy zone"};
 if(round_!=r.round)ResetRound(r.round);
 if(bought_[r.player])return {false,0,r.money,"already purchased this round"};
 const auto rule=kBuyRules[(size_t)r.item];
 const int wallet=finance_[r.player].balance;
 const int available=std::max(r.money,wallet);
 if(available<rule.price)return {false,rule.price,r.money,"not enough money"};
 bought_[r.player]=true;finance_[r.player].balance-=rule.price;
 finance_[r.player].debt=std::max(0,-finance_[r.player].balance);
 return {true,rule.price,finance_[r.player].balance,"purchase accepted"};
}
}
