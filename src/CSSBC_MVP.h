#pragma once
#include "CSSBC_Types.h"
#include <unordered_map>
#include <vector>
namespace cssbc {
struct MVPEntry { int player=-1; float score=0.f; };
class MVPScore{
public:
 void Add(int,EventKind,float);
 float Get(int)const;
 // Rank the complete round roster: dead players and losing-team players remain eligible.
 std::vector<MVPEntry> Rank(const std::vector<int>& roster,std::size_t limit=3)const;
 void Reset(){score_.clear();}
private: std::unordered_map<int,float>score_;
};
}