#pragma once
#include "CSSBC_Types.h"
#include <vector>
namespace cssbc {
enum class SupportRole:uint8_t { Sniper,Assault,Juggernaut };
struct SupportUnit { SupportRole role{}; int health=100; bool autonomous=false; };
class SupportRoster {
public:
 bool Deploy(SupportTier tier);
 void Clear(){units_.clear();}
 const std::vector<SupportUnit>& Units()const{return units_;}
 bool IsAutonomous()const{return !units_.empty()&&units_[0].autonomous;}
private:std::vector<SupportUnit>units_;
};
}