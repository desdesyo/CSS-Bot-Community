#pragma once
#include <vgui_controls/Frame.h>
class CSSBCMeleeModeMenu final : public vgui::Frame {
    DECLARE_CLASS_SIMPLE(CSSBCMeleeModeMenu, vgui::Frame);
public:
    explicit CSSBCMeleeModeMenu(vgui::VPANEL parent);
    void Toggle();
    void Open();
    void Close();
protected:
    void OnCommand(const char* command) override;
private:
    bool m_open{false};
};
