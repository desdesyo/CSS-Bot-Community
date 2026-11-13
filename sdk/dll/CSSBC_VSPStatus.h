#pragma once
#include <windows.h>
#include <string>

namespace cssbc::vsp {
struct BootstrapStatus {
    bool engineInterfaceFound{false};
    bool pluginLoaded{false};
    bool levelSeen{false};
    std::string mapName;
};
BootstrapStatus& Status();
}
