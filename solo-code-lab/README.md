# SOLO Code Lab

A small local test runner for the SOLO repository. It replaces GitHub-hosted runner minutes for the checks it can execute on the computer where it is installed.

## Run on Windows

Download/extract this repository branch, then double-click `Start-SOLO-Code-Lab.bat` in the repository root. It runs the prerequisite check and starts the test sequence.

## Run manually

Requirements: Git, Node.js 20+, CMake, a C++17 compiler, and (on Windows) PowerShell.

```powershell
node .\solo-code-lab\lab.mjs doctor
node .\solo-code-lab\lab.mjs test
```

On Linux/macOS use `node ./solo-code-lab/lab.mjs doctor` and `node ./solo-code-lab/lab.mjs test`.

The runner clones the configured public repository and branch into a fresh temporary run folder, then runs a fixed list of checks: Computer Bridge syntax, Node file-policy tests, CMake configure/build, CTest, and PowerShell parser checks on Windows. It does not accept arbitrary shell commands or run task text from GitHub.

Reports and logs are stored under `%USERPROFILE%\SOLO-Code-Lab\runs\<timestamp>\` on Windows or `~/SOLO-Code-Lab/runs/<timestamp>/` elsewhere. Set `SOLO_LAB_HOME` to change that location.

## Why it is "unlimited"

There is no GitHub Actions minute meter: runs execute on the local computer. It can be run repeatedly while that computer is available. Compute time, electricity, disk space, and hardware performance remain finite.

## Isolation and safety

This is a bounded local runner, **not a virtual machine or security sandbox**. It executes the repository's build and test tools as the current OS user. Use it only for repositories and branches you trust. It clones into its own run folder and never targets the CSS game directory. Do not expose it as a public self-hosted runner or run untrusted pull-request code on it.

For stronger isolation, run it inside Windows Sandbox, a dedicated VM, or a container. That requires those facilities to be installed and available on the host.


## Distributed compute integration

The SOLO Code Lab self-test workflow also validates the SOLO Compute coordinator and worker syntax and exercises the coordinator queue lifecycle on both Windows and Linux. See `../solo-compute/COORDINATOR.md` for local coordinator and worker setup.
