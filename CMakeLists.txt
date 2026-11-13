cmake_minimum_required(VERSION 3.16)
project(CSSBC_Core LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
add_library(cssbc_core
 src/CSSBC_Mind.cpp src/CSSBC_Juggernaut.cpp src/CSSBC_MVP.cpp
 src/CSSBC_System.cpp src/CSSBC_SupportRoster.cpp src/CSSBC_TeamMemory.cpp
 src/CSSBC_Combat.cpp src/CSSBC_CombatTeam.cpp src/CSSBC_UI.cpp src/CSSBC_Localization.cpp src/CSSBC_Tactics.cpp src/CSSBC_Economy.cpp src/CSSBC_GameModes.cpp src/CSSBC_Config.cpp src/CSSBC_Awards.cpp)
target_include_directories(cssbc_core PUBLIC src)
add_executable(cssbc_tests tests/core_tests.cpp)
target_link_libraries(cssbc_tests PRIVATE cssbc_core)
add_executable(cssbc_ui_tests tests/ui_tests.cpp)
target_link_libraries(cssbc_ui_tests PRIVATE cssbc_core)
enable_testing()
add_test(NAME cssbc_core_tests COMMAND cssbc_tests)
add_test(NAME cssbc_ui_tests COMMAND cssbc_ui_tests)
