#pragma once

class CCSBot;
class IGameEvent;

namespace CSSBCGame {
void OnRoundStart(IGameEvent* event);
void OnRoundEnd(IGameEvent* event);
void OnPlayerDeath(IGameEvent* event);
void OnBombPlanted(IGameEvent* event);
void OnBombDefused(IGameEvent* event);
void OnHostageRescuedAll(IGameEvent* event);
void OnBotCreated(CCSBot* bot);
void TickBot(CCSBot* bot);
}
