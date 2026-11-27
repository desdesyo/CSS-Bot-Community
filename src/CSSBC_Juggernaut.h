#pragma once
#include "CSSBC_Types.h"
namespace cssbc{class JuggernautArmor{public:bool ApplyHit(Plate,float);const PlateState&Get(Plate p)const{return plates_[(size_t)p];}bool AllBroken()const;private:std::array<PlateState,(size_t)Plate::Count>plates_{};};struct JuggernautRules{static bool CanBuy(int money,int dead){return money>=16000&&dead>=3;}static constexpr int Cost=16000;};}