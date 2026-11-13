#include "CSSBC_Economy.h"
namespace cssbc {
void Economy::ResetRound(int round){round_=round;bought_.fill(false);}
BuyResult Economy::Buy(const BuyRequest&r){
 if(r.player<0||r.player>=64)return {false,0,r.money,"invalid player"};
 if(!r.alive)return {false,0,r.money,"dead player"};
 if(!r.inBuyZone)return {false,0,r.money,"outside buy zone"};
 if(round_!=r.round)ResetRound(r.round);
 if(bought_[r.player])return {false,0,r.money,"already purchased this round"};
 const auto rule=kBuyRules[(size_t)r.item];
 if(r.money<rule.price)return {false,rule.price,r.money,"not enough money"};
 bought_[r.player]=true;
 return {true,rule.price,r.money-rule.price,"purchase accepted"};
}
}
