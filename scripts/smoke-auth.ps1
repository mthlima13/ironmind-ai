<#
.SYNOPSIS
  Smoke test of the authentication flow against a running backend.

.DESCRIPTION
  Exercises the contract of SPEC.md section 7.7 end to end: registration,
  login, renewal, reuse detection, logout and password recovery. Every check
  prints PASS or FAIL; the exit code is 1 when any check fails.

  Requires the backend running (scripts\backend.ps1 start) and the PostgreSQL
  of the docker compose stack.

.PARAMETER BaseUrl
  Base URL of the API. Defaults to http://localhost:8080/api/v1.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\smoke-auth.ps1
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = 'http://localhost:8080/api/v1'
)

$ErrorActionPreference = 'Stop'
$script:failures = 0
$script:checks = 0

function Write-Result {
    param([string]$Name, [bool]$Ok, [string]$Detail = '')
    $script:checks++
    if (-not $Ok) { $script:failures++ }
    $label = if ($Ok) { 'PASS' } else { 'FAIL' }
    $color = if ($Ok) { 'Green' } else { 'Red' }
    Write-Host ("{0,-4} {1}{2}" -f $label, $Name, $(if ($Detail) { " - $Detail" } else { '' })) -ForegroundColor $color
}

function Invoke-Api {
    param(
        [string]$Method,
        [string]$Path,
        [object]$Body,
        [hashtable]$Headers = @{}
    )
    $uri = "$BaseUrl$Path"
    try {
        $params = @{ Uri = $uri; Method = $Method; Headers = $Headers; UseBasicParsing = $true; TimeoutSec = 20 }
        if ($null -ne $Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
            $params.ContentType = 'application/json'
        }
        $response = Invoke-WebRequest @params
        $content = if ($response.RawContentLength -gt 0) { $response.Content } else { '' }
        return @{ Status = [int]$response.StatusCode; Content = $content }
    } catch {
        $response = $_.Exception.Response
        if ($null -eq $response) {
            return @{ Status = 0; Content = $_.Exception.Message }
        }
        $status = [int]$response.StatusCode
        $content = ''
        try {
            $stream = $response.GetResponseStream()
            $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::UTF8)
            $content = $reader.ReadToEnd()
        } catch { }
        return @{ Status = $status; Content = $content }
    }
}

function Get-Json {
    param([string]$Content)
    if ([string]::IsNullOrWhiteSpace($Content)) { return $null }
    try { return $Content | ConvertFrom-Json } catch { return $null }
}

# ---------------------------------------------------------------- health
$health = Invoke-Api -Method GET -Path '/health'
Write-Result 'API no ar' ($health.Status -eq 200) "status=$($health.Status)"

if ($health.Status -ne 200) {
    Write-Host "`nA API nao responde em $BaseUrl. Suba com scripts\backend.ps1 start" -ForegroundColor Yellow
    exit 1
}

# ---------------------------------------------------------------- cadastro
$suffix = [guid]::NewGuid().ToString().Substring(0, 8)
$email = "smoke-$suffix@example.com"
$password = 'treino123'
$idempotencyKey = [guid]::NewGuid().ToString()

$register = Invoke-Api -Method POST -Path '/auth/register' -Body @{
    name     = 'Teste Smoke'
    email    = $email
    password = $password
} -Headers @{ 'Idempotency-Key' = $idempotencyKey }

$registered = Get-Json $register.Content
Write-Result 'Cadastro cria a conta' ($register.Status -eq 201) "status=$($register.Status)"
Write-Result 'Cadastro devolve accessToken' ([bool]($registered.accessToken))
Write-Result 'Cadastro devolve refreshToken' ([bool]($registered.refreshToken))
Write-Result 'Cadastro devolve o usuario' ($registered.user.email -eq $email) "email=$($registered.user.email)"

# ---------------------------------------------------------------- idempotencia
$replay = Invoke-Api -Method POST -Path '/auth/register' -Body @{
    name     = 'Teste Smoke'
    email    = $email
    password = $password
} -Headers @{ 'Idempotency-Key' = $idempotencyKey }
$replayed = Get-Json $replay.Content
Write-Result 'Cadastro repetido nao cria outra conta' `
    ($replayed.user.id -eq $registered.user.id) "idIgual=$($replayed.user.id -eq $registered.user.id)"

# ---------------------------------------------------------------- e-mail duplicado
$duplicate = Invoke-Api -Method POST -Path '/auth/register' -Body @{
    name     = 'Teste Smoke'
    email    = $email
    password = $password
}
$duplicateBody = Get-Json $duplicate.Content
Write-Result 'E-mail duplicado responde 409' ($duplicate.Status -eq 409) "status=$($duplicate.Status) code=$($duplicateBody.code)"

# ---------------------------------------------------------------- senha fraca
$weak = Invoke-Api -Method POST -Path '/auth/register' -Body @{
    name     = 'Teste Smoke'
    email    = "weak-$suffix@example.com"
    password = 'abc'
}
$weakBody = Get-Json $weak.Content
Write-Result 'Senha fraca e rejeitada' ($weak.Status -eq 422) "status=$($weak.Status) fieldErrors=$($weakBody.fieldErrors.Count)"

# ---------------------------------------------------------------- login
$login = Invoke-Api -Method POST -Path '/auth/login' -Body @{ email = $email; password = $password }
$logged = Get-Json $login.Content
Write-Result 'Login autentica' ($login.Status -eq 200) "status=$($login.Status)"
Write-Result 'Login devolve tokens' ([bool]($logged.accessToken -and $logged.refreshToken))

$wrongPassword = Invoke-Api -Method POST -Path '/auth/login' -Body @{ email = $email; password = 'senhaerrada1' }
$unknownEmail = Invoke-Api -Method POST -Path '/auth/login' -Body @{ email = "nada-$suffix@example.com"; password = $password }
$wrongBody = Get-Json $wrongPassword.Content
$unknownBody = Get-Json $unknownEmail.Content
Write-Result 'Senha errada responde 401' ($wrongPassword.Status -eq 401) "status=$($wrongPassword.Status)"
Write-Result 'E-mail inexistente responde 401 igual' `
    ($unknownEmail.Status -eq $wrongPassword.Status -and $unknownBody.code -eq $wrongBody.code) `
    "status=$($unknownEmail.Status) code=$($unknownBody.code)"

# ---------------------------------------------------------------- renovacao
$firstRefresh = Invoke-Api -Method POST -Path '/auth/refresh' -Body @{ refreshToken = $logged.refreshToken }
$renewed = Get-Json $firstRefresh.Content
Write-Result 'Renovacao emite token novo' ($firstRefresh.Status -eq 200 -and $renewed.refreshToken -ne $logged.refreshToken) "status=$($firstRefresh.Status)"
Write-Result 'Renovacao devolve novo accessToken' ($renewed.accessToken -ne $logged.accessToken)

# ---------------------------------------------------------------- deteccao de reuso
$reuse = Invoke-Api -Method POST -Path '/auth/refresh' -Body @{ refreshToken = $logged.refreshToken }
$reuseBody = Get-Json $reuse.Content
Write-Result 'Refresh token reutilizado e rejeitado' ($reuse.Status -eq 401) "status=$($reuse.Status) code=$($reuseBody.code)"

$familyRevoked = Invoke-Api -Method POST -Path '/auth/refresh' -Body @{ refreshToken = $renewed.refreshToken }
Write-Result 'Reuso revoga a familia inteira' ($familyRevoked.Status -eq 401) "status=$($familyRevoked.Status)"

# ---------------------------------------------------------------- recuperacao
$forgot = Invoke-Api -Method POST -Path '/auth/forgot-password' -Body @{ email = $email }
$forgotUnknown = Invoke-Api -Method POST -Path '/auth/forgot-password' -Body @{ email = "nada-$suffix@example.com" }
Write-Result 'Recuperacao responde 202' ($forgot.Status -eq 202) "status=$($forgot.Status)"
Write-Result 'Recuperacao nao revela se o e-mail existe' `
    ($forgotUnknown.Status -eq $forgot.Status -and $forgotUnknown.Content -eq $forgot.Content) `
    "status=$($forgotUnknown.Status)"

$badReset = Invoke-Api -Method POST -Path '/auth/reset-password' -Body @{ token = 'token-invalido'; newPassword = 'novasenha123' }
$badResetBody = Get-Json $badReset.Content
Write-Result 'Token de recuperacao invalido e rejeitado' ($badReset.Status -eq 401) "status=$($badReset.Status) code=$($badResetBody.code)"

# ---------------------------------------------------------------- logout
$loginAgain = Invoke-Api -Method POST -Path '/auth/login' -Body @{ email = $email; password = $password }
$toLogout = Get-Json $loginAgain.Content
$logout = Invoke-Api -Method POST -Path '/auth/logout' -Body @{ refreshToken = $toLogout.refreshToken }
Write-Result 'Logout revoga a sessao' ($logout.Status -eq 204) "status=$($logout.Status)"

$afterLogout = Invoke-Api -Method POST -Path '/auth/refresh' -Body @{ refreshToken = $toLogout.refreshToken }
Write-Result 'Sessao encerrada nao renova mais' ($afterLogout.Status -eq 401) "status=$($afterLogout.Status)"

# ---------------------------------------------------------------- resumo
Write-Host ""
if ($script:failures -gt 0) {
    Write-Host ("{0} de {1} verificacoes FALHARAM." -f $script:failures, $script:checks) -ForegroundColor Red
    exit 1
}
Write-Host ("Todas as {0} verificacoes passaram." -f $script:checks) -ForegroundColor Green
exit 0
