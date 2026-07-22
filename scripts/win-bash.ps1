# Used by the justfile as `windows-shell` so recipes can keep using bash
# syntax on Windows without hardcoding a Git install path. A fixed path like
# "C:/Program Files/Git/bin/bash.exe" breaks on machines where Git was
# installed elsewhere (per-user under %LOCALAPPDATA%, a different drive,
# Program Files (x86), a portable install, etc). Instead this derives the
# Git root from wherever git.exe actually resolves on PATH on THIS machine,
# with a few common fallback locations if git.exe isn't on PATH.

$ErrorActionPreference = "Stop"

function Find-Bash {
    $gitCmd = Get-Command git.exe -ErrorAction SilentlyContinue
    if ($gitCmd) {
        $gitRoot = Split-Path (Split-Path $gitCmd.Source -Parent) -Parent
        foreach ($candidate in @("$gitRoot\bin\bash.exe", "$gitRoot\usr\bin\bash.exe")) {
            if (Test-Path $candidate) { return $candidate }
        }
    }

    $roots = @($env:ProgramFiles, ${env:ProgramFiles(x86)}, "$env:LOCALAPPDATA\Programs") | Where-Object { $_ }
    foreach ($root in $roots) {
        foreach ($candidate in @("$root\Git\bin\bash.exe", "$root\Git\usr\bin\bash.exe")) {
            if (Test-Path $candidate) { return $candidate }
        }
    }

    return $null
}

$bash = Find-Bash
if (-not $bash) {
    Write-Error "just: could not find Git Bash (bash.exe). Install Git for Windows: https://git-scm.com/download/win"
    exit 1
}

# Windows PowerShell 5.1 mangles arguments re-quoted through the `&` call
# operator when they mix double quotes with apostrophes (both appear in
# recipe bodies, e.g. "won't"). ProcessStartInfo.ArgumentList isn't available
# on the .NET Framework build PowerShell 5.1 runs on, so the command line is
# built by hand using the same escaping rules CommandLineToArgvW expects
# (what bash.exe, being a standard C-runtime program, parses its argv with).
function ConvertTo-WindowsArgv {
    param([string]$Argument)
    if ($Argument.Length -eq 0) { return '""' }
    if ($Argument -notmatch '[\s"]') { return $Argument }

    $result = New-Object System.Text.StringBuilder
    [void]$result.Append('"')
    $length = $Argument.Length
    $i = 0
    while ($i -lt $length) {
        $backslashCount = 0
        while ($i -lt $length -and $Argument[$i] -eq '\') {
            $backslashCount++
            $i++
        }
        if ($i -eq $length) {
            [void]$result.Append('\' * ($backslashCount * 2))
        } elseif ($Argument[$i] -eq '"') {
            [void]$result.Append('\' * ($backslashCount * 2 + 1))
            [void]$result.Append('"')
            $i++
        } else {
            [void]$result.Append('\' * $backslashCount)
            [void]$result.Append($Argument[$i])
            $i++
        }
    }
    [void]$result.Append('"')
    return $result.ToString()
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $bash
$allArgs = @("-cu") + $args
$psi.Arguments = ($allArgs | ForEach-Object { ConvertTo-WindowsArgv $_ }) -join ' '
$psi.UseShellExecute = $false

$proc = [System.Diagnostics.Process]::Start($psi)
$proc.WaitForExit()
exit $proc.ExitCode
