#pragma once

class CCSBot;

namespace cssbc::sdk {
// Called from CCSBot::Update on the authoritative server thread.
void OnBotUpdate(CCSBot* bot);
}
