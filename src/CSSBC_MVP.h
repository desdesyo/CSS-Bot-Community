#pragma once
#include "CSSBC_Types.h"
#include <unordered_map>
namespace cssbc{class MVPScore{public:void Add(int,EventKind,float);float Get(int)const;private:std::unordered_map<int,float>score_;};}