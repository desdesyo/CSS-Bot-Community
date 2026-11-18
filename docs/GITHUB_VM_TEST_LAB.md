# SOLO Repository VM Test Lab

The repository's disposable test machines are provided by GitHub Actions hosted runners. A new clean VM is allocated for each run and discarded afterward. This is not a persistent remote desktop or a server that stays online.

## Start a test manually

1. Open the repository's Actions tab.
2. Select **SOLO Repository VM Test Lab**.
3. Press **Run workflow**, choose Release or Debug, then start it.
4. Open the run to see the Ubuntu and Windows VM jobs.
5. Download `solo-vm-report-ubuntu-latest` or `solo-vm-report-windows-latest` under Artifacts for environment details and test logs.

The workflow also runs automatically for pull requests and pushes to the two main development branches configured in the workflow.

## What each VM checks

- Checks the Computer Bridge JavaScript syntax and Node test suite.
- Configures and compiles the repository's C++ core with CMake.
- Runs all registered CTest tests.
- On Windows, parses the PowerShell scripts, initializes a disposable SOLO workspace, verifies its manifest and inventory, and confirms that a fake game folder was not created or modified.
- Uploads diagnostic reports even if a test fails.

## Security and cost

- Jobs use short-lived GitHub-hosted runners, not a self-hosted machine.
- Workflow permissions are read-only for repository contents; no deployment or game installation is performed.
- No repository secrets are needed.
- GitHub Actions usage is subject to the repository/account plan's included minutes and usage limits. Windows and Linux jobs consume runner minutes. This is not an unlimited free VM.

## Limits

This lab validates source builds and automated tests. It does not launch Counter-Strike: Source v34, prove SourcePawn compilation without a supplied SourceMod SDK, or validate 3D/audio/video generation tools. Those need dedicated toolchain assets and later integration tests.
