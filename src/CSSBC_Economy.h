#pragma once
#include "CSSBC_Types.h"
#include <array>
#include <cstdint>
namespace cssbc {
enum class BuyItem:uint8_t { Pistol, SMG, Rifle, Sniper, Shotgun, Armor, Helmet, DefuseKit, Flash, Smoke, HE, Count };
struct BuyRequest { int player=-1,round=-1,money=0; bool inBuyZone=false,alive=true; BuyItem item=BuyItem::Rifle; };
struct BuyResult { bool accepted=false; int price=0,moneyAfter=0; const char* reason=""; };
struct BuyRule { int price=0; bool ctOnly=false, tOnly=false; };
inline constexpr std::array<BuyRule,(size_t)BuyItem::Count> kBuyRules{{
 {600,false,false},{1250,false,false},{2700,false,false},{4750,false,false},{2000,false,false},
 {650,false,false},{350,false,false},{400,true,false},{200,false,false},{300,false,false},{300,false,false}
}};
class Economy {
public: BuyResult Buy(const BuyRequest&); void ResetRound(int round);
private: int round_=-1; std::array<bool,64> bought_{}; 
};
}
