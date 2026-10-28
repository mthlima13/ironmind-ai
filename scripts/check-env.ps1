<#
.SYNOPSIS
  Valida os pre-requisitos do ambiente de desenvolvimento do IronMind AI.

.DESCRIPTION
  Verifica as ferramentas necessarias, compara com as versoes minimas
  exigidas e aponta o que falta. Nao instala nada e nao altera o sistema.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\check-env.ps1
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Continue'

$requirements = @(
    @{ Name = 'java';   Min = '25.0';  Args = '-version'; Hint = 'JDK 25 (temurin)' },
    @{ Name = 'mvn';    Min = '3.10';  Args = '-version'; Hint = 'Maven 3.10+' },
    @{ Name = 'node';   Min = '24.0';  Args = '-v';       Hint = 'Node.js 24+' },
    @{ Name = 'npm';    Min = '11.0';  Args = '-v';       Hint = 'npm 11+' },
    @{ Name = 'git';    Min = '2.40';  Args = '--version'; Hint = 'Git 2.40+' },
    @{ Name = 'docker'; Min = '20.0';  Args = '--version'; Hint = 'Docker Desktop 20+' }
)

function Get-VersionString {
    param([string]$Text)
    if (-not $Text) { return $null }
    $m = [regex]::Match($Text, '\d+(\.\d+)*')
    if ($m.Success) { return $m.Value }
    return $null
}

function Test-Version {
    param([string]$Current, [string]$Minimum)
    if (-not $Current) { return $false }
    try {
        return ([version]$Current -ge [version]$Minimum)
    } catch {
        return $false
    }
}

$failures = @()

foreach ($req in $requirements) {
    $cmd = Get-Command $req.Name -ErrorAction SilentlyContinue

    if (-not $cmd) {
        Write-Host ("FALTA  {0,-8} nao encontrado no PATH. Requer: {1}" -f $req.Name, $req.Hint) -ForegroundColor Red
        $failures += $req.Name
        continue
    }

    $raw   = (& $req.Name @($req.Args) 2>&1 | Select-Object -First 1 | Out-String).Trim()
    $ver   = Get-VersionString -Text $raw
    $ok    = Test-Version -Current $ver -Minimum $req.Min

    if ($ok) {
        Write-Host ("OK     {0,-8} {1}" -f $req.Name, $ver) -ForegroundColor Green
    } else {
        Write-Host ("BAIXO  {0,-8} {1} (minimo {2}). Requer: {3}" -f $req.Name, $ver, $req.Min, $req.Hint) -ForegroundColor Yellow
        $failures += $req.Name
    }
}

Write-Host ""

# O daemon do Docker e opcional para compilar, mas obrigatorio para o MongoDB
# local e para a suite de contrato em Python.
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
    $daemon = $null
    try { $daemon = (& docker info --format '{{.ServerVersion}}' 2>&1 | Out-String).Trim() } catch { }
    if ($daemon -and $daemon -match '^\d+\.\d+') {
        Write-Host ("OK     docker daemon em execucao (v{0})" -f $daemon) -ForegroundColor Green
    } else {
        Write-Host "AVISO  Docker daemon nao esta rodando. Abra o Docker Desktop para usar o" -ForegroundColor Yellow
        Write-Host "       MongoDB local e a suite de contrato em Python." -ForegroundColor Yellow
    }
}

Write-Host ""

if ($failures.Count -gt 0) {
    Write-Host ("Pre-requisitos ausentes ou desatualizados: {0}" -f ($failures -join ', ')) -ForegroundColor Red
    exit 1
}

Write-Host "Todos os pre-requisitos minimos estao presentes." -ForegroundColor Green
exit 0
