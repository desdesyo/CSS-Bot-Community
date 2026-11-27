#include "CSSBC_Juggernaut.h"
#include <algorithm>
namespace cssbc{bool JuggernautArmor::ApplyHit(Plate p,float d){auto&s=plates_[(size_t)p];if(s.broken||d<=0)return false;s.integrity=std::max(0.f,s.integrity-d);if(s.integrity<=0){s.broken=true;s.exposure=1;return true;}return false;}bool JuggernautArmor::AllBroken()const{for(auto&p:plates_)if(!p.broken)return false;return true;}}