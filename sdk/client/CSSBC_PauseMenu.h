#pragma once
#include <vgui_controls/Frame.h>
class CSSBCPauseMenu final : public vgui::Frame {
    DECLARE_CLASS_SIMPLE(CSSBCPauseMenu, vgui::Frame);
public:
    explicit CSSBCPauseMenu(vgui::VPANEL parent);
    void Toggle(); void Open(); void Close();
protected:
    void OnKeyCodePressed(vgui::KeyCode code) override;
    void OnCommand(const char* command) override;
private: bool m_open=false;
};
