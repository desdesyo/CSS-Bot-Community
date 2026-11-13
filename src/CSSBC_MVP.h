#pragma once
#include "CSSBC_Types.h"
#include <unordered_map>
#include <vector>
namespace cssbc {
struct MVPEntry { int player=-1; float score=0.f; };
struct MVPEvent { int actor=-1,target=-1; EventKind kind{}; float value=0.f,time=0.f; };
class MVPScore{
public:
 // Legacy weighted event API.
 void Add(int,EventKind,float);
 // Full event record: actor attribution survives death/disconnect and delayed effects.
 bool Record(int round,int actor,EventKind,float value,int target,float gameTime);
 float Get(int)const;
 std::vector<MVPEntry> Rank(const std::vector<int>& roster,std::size_t limit=3)const;
 const std::vector<MVPEvent>& Events()const{return events_;}
 void Reset(){score_.clear();events_.clear();round_=-1;}
private:
 std::unordered_map<int,float>score_;
 std::vector<MVPEvent>events_;
 int round_=-1;
};
}