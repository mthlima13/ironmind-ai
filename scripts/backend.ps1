<#
.SYNOPSIS
  Compila e executa o backend do IronMind AI fora da pasta target.

.DESCRIPTION
  No Windows, um jar em execucao fica travado pelo sistema de arquivos: o
  `mvn clean` falha ao tentar apagar `target/`. Este script empacota o jar,
  copia para `.run/` (ignorado pelo Git) e executa a partir de la, deixando o
  `target/` livre para builds.

.PARAMETER Action
  build   - empacota o jar e copia para .run (sem executar)
  start   - empacota, copia e executa em segundo plano
  stop    - encerra o processo do backend
  status  - mostra o estado do processo e do health check
  logs    - mostra as ultimas linhas do log

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\backend.ps1 start
  powershell -ExecutionPolicy Bypass -File scripts\backend.ps1 status
#>
[CmdletBinding()]
param(
    [ValidateSet('build', 'start', 'stop', 'status', 'logs')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot 'backend'
$runDir = Join-Path $repoRoot '.run'
$jarPath = Join-Path $runDir 'ironmind-backend.jar'
$pidFile = Join-Path $runDir 'backend.pid'
$logFile = Join-Path $runDir 'backend.log'
$errFile = Join-Path $runDir 'backend.err'

function Get-BackendProcess {
    if (-not (Test-Path $pidFile)) { return $null }
    $savedPid = (Get-Content $pidFile -Raw).Trim()
    if (-not $savedPid) { return $null }
    $proc = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
    if (-not $proc) { return $null }
    return $proc
}

function Invoke-Build {
    Write-Host "Empacotando o backend..." -ForegroundColor Cyan
    Push-Location $backendDir
    try {
        & mvn -B -q clean package -DskipTests
        if ($LASTEXITCODE -ne 0) { throw "Falha no empacotamento do backend." }
    } finally {
        Pop-Location
    }

    New-Item -ItemType Directory -Force -Path $runDir | Out-Null
    $built = Get-ChildItem (Join-Path $backendDir 'target\ironmind-backend-*.jar') |
        Where-Object { $_.Name -notlike '*.original' } |
        Select-Object -First 1
    if (-not $built) { throw "Jar nao encontrado em backend/target." }
    Copy-Item $built.FullName $jarPath -Force
    Write-Host ("Jar copiado para {0}" -f $jarPath) -ForegroundColor Green
}

switch ($Action) {
    'build' {
        Invoke-Build
    }

    'start' {
        $running = Get-BackendProcess
        if ($running) {
            Write-Host ("Backend ja esta em execucao (PID {0})." -f $running.Id) -ForegroundColor Yellow
            break
        }

        Invoke-Build

        # Credenciais padrao de desenvolvimento. Sobrescreva com variaveis de
        # ambiente antes de chamar este script em qualquer outro ambiente.
        if (-not $env:MONGODB_URI) {
            $env:MONGODB_URI = 'mongodb://ironmind:changeme@localhost:27017/ironmind?authSource=admin&replicaSet=rs0'
        }

        # Win32_Process.Create inicia o processo sem herdar o console de quem
        # chamou: o script retorna na hora e o backend continua rodando.
        # Start-Process nao serve aqui, porque no Windows ele mantem o processo
        # filho preso ao pipeline do shell.
        $commandLine = 'cmd.exe /c java -jar "{0}" 1>"{1}" 2>"{2}"' -f $jarPath, $logFile, $errFile
        $created = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
            CommandLine     = $commandLine
            CurrentDirectory = $backendDir
        }
        if ($created.ReturnValue -ne 0) {
            throw "Falha ao iniciar o backend (codigo $($created.ReturnValue))."
        }

        $procId = $created.ProcessId
        $procId | Set-Content $pidFile -NoNewline
        Write-Host ("Backend iniciado (PID {0})." -f $procId) -ForegroundColor Green

        for ($i = 0; $i -lt 40; $i++) {
            Start-Sleep -Seconds 1
            try {
                $health = Invoke-WebRequest 'http://localhost:8080/api/v1/health' -UseBasicParsing -TimeoutSec 3
                Write-Host ("API no ar: {0}" -f $health.Content) -ForegroundColor Green
                Write-Host "Swagger UI: http://localhost:8080/swagger-ui.html" -ForegroundColor Cyan
                break
            } catch { }
        }
    }

    'stop' {
        $running = Get-BackendProcess
        if (-not $running) {
            Write-Host "Backend nao esta em execucao." -ForegroundColor Yellow
            break
        }
        # /T encerra a arvore inteira: o PID salvo e do wrapper cmd.exe, que
        # por sua vez lanca a JVM.
        & taskkill /PID $running.Id /T /F | Out-Null
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
        Write-Host ("Backend encerrado (PID {0})." -f $running.Id) -ForegroundColor Green
    }

    'status' {
        $running = Get-BackendProcess
        if ($running) {
            Write-Host ("Backend em execucao (PID {0})." -f $running.Id) -ForegroundColor Green
        } else {
            Write-Host "Backend parado." -ForegroundColor Yellow
        }
        try {
            $health = Invoke-WebRequest 'http://localhost:8080/api/v1/health' -UseBasicParsing -TimeoutSec 3
            Write-Host ("Health: {0}" -f $health.Content) -ForegroundColor Green
        } catch {
            Write-Host "Health: sem resposta." -ForegroundColor Yellow
        }
    }

    'logs' {
        if (Test-Path $logFile) {
            Get-Content $logFile -Tail 40
        } else {
            Write-Host "Sem log em $logFile" -ForegroundColor Yellow
        }
    }
}
