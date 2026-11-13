@echo off
chcp 65001 >nul
title CSSBC AI Logger Setup
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
