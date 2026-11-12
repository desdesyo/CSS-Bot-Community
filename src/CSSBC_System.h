#pragma once
#include "CSSBC_Mind.h"
#include "CSSBC_Juggernaut.h"
#include "CSSBC_MVP.h"
namespace cssbc{struct SupportOrder{SupportTier tier{};int buyer=-1,moneySpent=0,deadAlliesAtPurchase=0;};class CSSBCSystem{public:bool CanPurchase(SupportTier,int,int)const;bool RequestSupport(SupportTier,int,int,int,SupportOrder&)const;float RetreatProbability(const Traits&,float hp,float allies,float pressure)const;float CoverReward(float seconds,int protectedAllies)const;MVPScore&MVP(){return mvp_;}private:MVPScore mvp_;};}