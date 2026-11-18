#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const REPO_URL = "https://github.com/desdesyo/CSS-Bot-Community.git";
const DEFAULT_BRANCH = "feature/solo-mod-workshop-foundation";
const ROOT = path.resolve(process.env.SOLO_LAB_HOME || path.join(os.homedir(), "SOLO-Code-Lab"));
const TIMEOUT_MS = 10 * 60 * 1000;
const MAX_LOG = 2 * 1024 * 1024;

function run(command, args, cwd, logFile) {
  const result = spawnSync(command, args, {
    cwd, encoding: "utf8", timeout: TIMEOUT_MS, maxBuffer: MAX_LOG,
    windowsHide: true, shell: false
  });
  const output = [result.stdout || "", result.stderr || ""].join("\n");
  return writeFile(logFile, output.slice(0, MAX_LOG), "utf8").then(() => ({
    command: [command, ...args].join(" "),
    exitCode: result.status ?? 1,
    timedOut: Boolean(result.error && result.error.code === "ETIMEDOUT"),
    error: result.error?.message || null,
    log: logFile
  }));
}

async function doctor() {
  await mkdir(ROOT, { recursive: true });
  const checks = [
    ["git", ["--version"]],
    ["node", ["--version"]],
    ["cmake", ["--version"]],
    [process.platform === "win32" ? "powershell" : "bash", process.platform === "win32" ? ["-NoProfile","-Command","$PSVersionTable.PSVersion.ToString()"] : ["--version"]]
  ];
  let failed = false;
  for (const [cmd,args] of checks) {
    const r = spawnSync(cmd,args,{encoding:"utf8",timeout:10000,windowsHide:true,shell:false});
    const ok = !r.error && r.status === 0;
    console.log((ok ? "OK  " : "MISS") + " " + cmd + " " + (r.stdout || r.stderr || r.error?.message || "").trim().split("\n")[0]);
    if (!ok) failed = true;
  }
  const compilerNames = process.platform === "win32" ? ["cl.exe","g++.exe","clang++.exe"] : ["c++","g++","clang++"];
  let compilerFound = "";
  for (const name of compilerNames) {
    const probe = spawnSync(process.platform === "win32" ? "where.exe" : "which",
      [name], {encoding:"utf8",timeout:10000,windowsHide:true,shell:false});
    if (!probe.error && probe.status === 0) { compilerFound = (probe.stdout || "").trim().split("\\n")[0] || name; break; }
  }
  console.log((compilerFound ? "OK  " : "MISS") + " C++ compiler " + compilerFound);
  if (!compilerFound) failed = true;
  console.log("\nLab folder: " + ROOT);
  console.log("This is a local test runner, not a hypervisor. It uses your computer's CPU and disk.");
  process.exitCode = failed ? 1 : 0;
}

async function test(branch = DEFAULT_BRANCH) {
  if (!/^[A-Za-z0-9._/-]{1,120}$/.test(branch) || branch.startsWith("-") || branch.includes("..")) {
    throw new Error("Invalid branch name.");
  }
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  const runDir = path.join(ROOT, "runs", stamp);
  const checkout = path.join(runDir, "repo");
  const logs = path.join(runDir, "logs");
  await mkdir(logs,{recursive:true});
  const results = [];
  const record = async (name, cmd, args, cwd=checkout) => {
    console.log("\n[" + name + "] " + cmd + " " + args.join(" "));
    const r = await run(cmd,args,cwd,path.join(logs,name.replace(/[^a-z0-9-]/gi,"-")+".log"));
    results.push({name,...r});
    console.log("  " + (r.exitCode===0 ? "PASS" : "FAIL") + (r.timedOut ? " (timeout)" : ""));
    return r.exitCode===0;
  };
  try {
    if (!await record("checkout","git",["clone","--depth","1","--no-tags","--single-branch","--branch",branch,REPO_URL,checkout],runDir)) {
      throw new Error("Git clone failed; inspect logs.");
    }
    let ok = true;
    ok = await record("bridge-syntax","node",["--check","computer-bridge/agent.mjs"]) && ok;
    ok = await record("bridge-policy-tests","node",["--test","computer-bridge/tests/file-policy.test.mjs"]) && ok;
    ok = await record("cmake-configure","cmake",["-S",".","-B","build-solo-lab","-DCMAKE_BUILD_TYPE=Release"]) && ok;
    ok = await record("cpp-build","cmake",["--build","build-solo-lab","--config","Release","--parallel","2"]) && ok;
    if (ok) ok = await record("cpp-tests","ctest",["--test-dir","build-solo-lab","-C","Release","--output-on-failure"]) && ok;
    if (process.platform === "win32") {
      const ps = "$ErrorActionPreference='Stop'; $files=@('Setup-SOLO-Local.ps1','workshop/Initialize-SoloModWorkspace.ps1','workshop/Get-SoloModInventory.ps1','workshop/Invoke-SoloToolchain.ps1','workshop/New-SoloModPackage.ps1'); foreach($f in $files){$t=$null;$e=$null;[System.Management.Automation.Language.Parser]::ParseFile((Join-Path $PWD $f),[ref]$t,[ref]$e)|Out-Null;if($e.Count){throw ($e|Out-String)}}";
      ok = await record("powershell-parse","powershell",["-NoProfile","-Command",ps]) && ok;
    }
    const report = {
      product:"SOLO Code Lab", createdAt:new Date().toISOString(),
      host:{platform:process.platform,arch:process.arch,node:process.version},
      repository:REPO_URL,branch,success:ok,results
    };
    await writeFile(path.join(runDir,"report.json"),JSON.stringify(report,null,2));
    const md = ["# SOLO Code Lab report","", "Result: "+(ok?"PASS":"FAIL"),"Branch: "+branch,"Host: "+process.platform+" / "+process.arch,"",...results.map(x=>"- "+(x.exitCode===0?"PASS":"FAIL")+" **"+x.name+"** — "+x.command+" (log: "+path.relative(runDir,x.log)+")")].join("\n");
    await writeFile(path.join(runDir,"report.md"),md);
    console.log("\nReport: " + path.join(runDir,"report.md"));
    console.log("Logs:   " + logs);
    if (!ok) process.exitCode=1;
  } catch (e) {
    console.error("\nLab failed: " + e.message);
    console.error("Logs: " + logs);
    process.exitCode=1;
  }
}

const [action,...args]=process.argv.slice(2);
if (action==="doctor") await doctor();
else if (action==="test") await test(args[0] || DEFAULT_BRANCH);
else {
  console.log("SOLO Code Lab — local, no GitHub Actions minutes");
  console.log("Usage: node lab.mjs doctor");
  console.log("       node lab.mjs test [branch]");
  console.log("Default reports folder: " + ROOT);
}
