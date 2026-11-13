#pragma once
#include <cstdint>
#include <string>

namespace cssbc {

// Portable event envelope. SDK adapter serializes this to one JSONL line.
// Keep this header free of Source SDK dependencies.
struct TelemetryEvent {
    uint32_t schema = 1;
    uint64_t sequence = 0;
    double gameTime = 0.0;
    const char* eventName = nullptr;
    const char* actor = nullptr;  // stable in-match userid, not Steam credentials
    const char* target = nullptr;
    const char* payloadJson = "{}"; // validated JSON object, supplied by caller
};

class ITelemetrySink {
public:
    virtual ~ITelemetrySink() = default;
    // Returns false on I/O/serialization failure; caller must not interrupt gameplay.
    virtual bool Write(const TelemetryEvent& event) = 0;
};

} // namespace cssbc
