#include "CSSBC_Config.h"
namespace cssbc {
bool ValidateConfig(const ProjectConfig&c,const char**e){
 auto fail=[&](const char*m){if(e)*e=m;return false;};
 if(c.botDifficulty<0||c.botDifficulty>1)return fail("botDifficulty must be 0..1");
 const float a[]={c.botTraits.courage,c.botTraits.trust,c.botTraits.teamwork,c.botTraits.discipline,c.botTraits.independence,c.botTraits.adaptability};
 for(float v:a)if(v<0||v>1)return fail("bot traits must be 0..1");
 if(c.hud.crosshairSize<1||c.hud.crosshairSize>20)return fail("crosshairSize must be 1..20");
 if(c.hud.crosshairGap<0||c.hud.crosshairGap>20)return fail("crosshairGap must be 0..20");
 if(e)*e=nullptr;return true;
}
}
