#include "CSSBC_SupportRoster.h"
namespace cssbc {
bool SupportRoster::Deploy(SupportTier tier){
 units_.clear();
 switch(tier){
 case SupportTier::Recon1000: units_.push_back({SupportRole::Sniper,100,false});break;
 case SupportTier::Tactical3000: units_.push_back({SupportRole::Assault,125,false});break;
 case SupportTier::Squad9000:
  units_={{SupportRole::Sniper,75,true},{SupportRole::Sniper,75,true},{SupportRole::Assault,100,true},{SupportRole::Assault,100,true}};break;
 case SupportTier::Juggernaut16000:units_.push_back({SupportRole::Juggernaut,500,true});break;
 }
 return !units_.empty();
}
}