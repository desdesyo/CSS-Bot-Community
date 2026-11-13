#pragma once

class CCSBot;

namespace cssbc {
namespace sdk {
// Called from CCSBot::Update on the authoritative server thread.
void OnBotUpdate(CCSBot* bot);
}
}
