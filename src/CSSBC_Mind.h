#pragma once
#include "CSSBC_Types.h"
#include <random>
namespace cssbc {class Mind{public:explicit Mind(Traits t={});bool ShouldHeed(const Callout&,float reliability);Plate ChoosePlate(const std::array<PlateState,(size_t)Plate::Count>&,const std::vector<MemoryEntry>&);void Learn(const MemoryEntry&);const std::vector<MemoryEntry>&Memory()const{return memory_;}Traits traits;private:std::mt19937 rng_;std::vector<MemoryEntry>memory_;};}