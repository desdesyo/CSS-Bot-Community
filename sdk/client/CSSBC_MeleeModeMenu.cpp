#include "CSSBC_MeleeModeMenu.h"
#include <vgui_controls/Button.h>
#include <vgui_controls/Label.h>
#include <vgui/IVGui.h>
#include <vgui/VGUI.h>
#include <tier1/strtools.h>
#include <engine/iengine.h>

// The game client DLL provides the engine interface.
extern IVEngineClient* engine;

CSSBCMeleeModeMenu::CSSBCMeleeModeMenu(vgui::VPANEL parent)
    : vgui::Frame(nullptr, "CSSBCMeleeModeMenu") {
    SetParent(parent);
    SetTitle("CSS Bot Community — режим боя", true);
    SetSize(300, 210);
    SetSizeable(false);
    SetMoveable(true);
    SetCloseButtonVisible(true);
    SetDeleteSelfOnClose(false);

    int y = 42;
    const char* labels[] = {"Обычный режим", "Только ножи", "Кулачный бой"};
    const char* commands[] = {"mode_normal", "mode_knife", "mode_fists"};
    for (int i = 0; i < 3; ++i) {
        auto* button = new vgui::Button(this, labels[i], labels[i], this, commands[i]);
        button->SetBounds(24, y, 252, 38);
        y += 45;
    }
    LoadControlSettings(nullptr);
    MakePopup();
    SetVisible(false);
}

void CSSBCMeleeModeMenu::Toggle() { m_open ? Close() : Open(); }
void CSSBCMeleeModeMenu::Open() {
    m_open = true; SetVisible(true); MakePopup(); MoveToCenter();
}
void CSSBCMeleeModeMenu::Close() {
    m_open = false; SetVisible(false);
}
void CSSBCMeleeModeMenu::OnCommand(const char* command) {
    if (!command) return;
    const char* mode = nullptr;
    if (!V_stricmp(command, "mode_normal")) mode = "normal";
    else if (!V_stricmp(command, "mode_knife")) mode = "knife";
    else if (!V_stricmp(command, "mode_fists")) mode = "fists";
    if (mode && engine) {
        char request[96];
        V_snprintf(request, sizeof(request), "cssbc_melee_mode %s", mode);
        engine->ClientCmd(request); // Server queues; current round is not changed.
    }
    Close();
}
