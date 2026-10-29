<#
.SYNOPSIS
  Smoke test of the workout flow against a running backend.

.DESCRIPTION
  Exercises the contract of SPEC.md section 7.8: programs, sessions and sets.
  Every check prints PASS or FAIL; the exit code is 1 when any check fails.

  The backend does not authenticate anyone: this script generates two random
  UUIDs and sends them in the identity header, exactly like the gateway does.
  Every user has its own data, so the isolation checks are real.

  Requires the backend running (scripts\backend.ps1 start) and the MongoDB
  replica set of the docker compose stack.

.PARAMETER BaseUrl
  Base URL of the API. Defaults to http://localhost:8080/api/v1.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File scripts\smoke-workouts.ps1
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
            $reader = New-Object System.IO.StreamReader($response.GetResponseStream(), [System.Text.Encoding]::UTF8)
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

# ---------------------------------------------------------------- identidade
$health = Invoke-Api -Method GET -Path '/health'
Write-Result 'API no ar' ($health.Status -eq 200) "status=$($health.Status)"
if ($health.Status -ne 200) {
    Write-Host "`nA API nao responde em $BaseUrl. Suba com scripts\backend.ps1 start" -ForegroundColor Yellow
    exit 1
}

# O gateway injeta este header; aqui geramos dois titulares distintos.
$userId = [guid]::NewGuid().ToString()
$auth = @{ 'X-User-UUID' = $userId }
Write-Result 'UUID valido sem dados enxerga lista vazia' `
    ((Get-Json (Invoke-Api -Method GET -Path '/programs' -Headers $auth).Content).totalElements -eq 0)
$anonymous = Invoke-Api -Method GET -Path '/programs'
Write-Result 'Sem header responde 401' ($anonymous.Status -eq 401) "status=$($anonymous.Status)"

# ---------------------------------------------------------------- catalogo
$catalog = Invoke-Api -Method GET -Path '/exercises?size=3' -Headers $auth
$exercises = (Get-Json $catalog.Content).content
Write-Result 'Catalogo de exercicios disponivel' ($exercises.Count -ge 3) "itens=$($exercises.Count)"
$exerciseId = $exercises[0].id
$secondExerciseId = $exercises[1].id

# ---------------------------------------------------------------- programa
$program = Invoke-Api -Method POST -Path '/programs' -Headers $auth -Body @{
    name        = 'Corpo inteiro'
    description = 'Um dia de corpo inteiro'
    goal        = 'HYPERTROPHY'
    splitType   = 'FULL_BODY'
    days        = @(
        @{
            name = 'Peito e triceps'
            exercises = @(
                @{ exerciseId = $exerciseId; targetSets = 3; targetRepsMin = 8; targetRepsMax = 12; restSeconds = 120 }
            )
        }
    )
}
$created = Get-Json $program.Content
Write-Result 'Programa criado' ($program.Status -eq 201) "status=$($program.Status)"
Write-Result 'Programa tem 1 dia' ($created.days.Count -eq 1) "dias=$($created.days.Count)"
Write-Result 'Dia tem 1 exercicio' ($created.days[0].exercises.Count -eq 1)
Write-Result 'Exercicio vem embutido no programa' ($created.days[0].exercises[0].exercise.id -eq $exerciseId)
Write-Result 'Posicao do dia e 1' ($created.days[0].position -eq 1)

$invalid = Invoke-Api -Method POST -Path '/programs' -Headers $auth -Body @{
    name = 'Programa invalido'
    days = @(@{ name = 'Dia'; exercises = @(@{ exerciseId = '11111111-1111-1111-1111-111111111111'; targetSets = 3; targetRepsMin = 8; targetRepsMax = 12; restSeconds = 120 }) })
}
$invalidBody = Get-Json $invalid.Content
Write-Result 'Exercicio inexistente e recusado' ($invalid.Status -eq 422) "status=$($invalid.Status) code=$($invalidBody.code)"

$list = Invoke-Api -Method GET -Path '/programs?page=0&size=20' -Headers $auth
$listBody = Get-Json $list.Content
Write-Result 'Listagem devolve o programa' ($listBody.totalElements -eq 1) "total=$($listBody.totalElements)"

# ---------------------------------------------------------------- sessao a partir do dia
$session = Invoke-Api -Method POST -Path '/workout-sessions' -Headers $auth -Body @{ programId = $created.id; programDayId = $created.days[0].id }
$started = Get-Json $session.Content
Write-Result 'Sessao iniciada' ($session.Status -eq 201) "status=$($session.Status)"
Write-Result 'Sessao comeca IN_PROGRESS' ($started.status -eq 'IN_PROGRESS')
Write-Result 'Sessao copiou os exercicios do dia' ($started.exercises.Count -eq 1) "exercicios=$($started.exercises.Count)"
Write-Result 'Exercicio copiado tem o mesmo id do catalogo' ($started.exercises[0].exerciseId -eq $exerciseId)
$sessionExerciseId = $started.exercises[0].id

# ---------------------------------------------------------------- serie
$key = [guid]::NewGuid().ToString()
$setBody = @{ sessionExerciseId = $sessionExerciseId; weightKg = 80.0; repetitions = 10; perceivedExertion = 8; restAfterSeconds = 90 }
$set = Invoke-Api -Method POST -Path "/workout-sessions/$($started.id)/sets" -Headers ($auth + @{ 'Idempotency-Key' = $key }) -Body $setBody
$firstSet = Get-Json $set.Content
Write-Result 'Serie registrada' ($set.Status -eq 201) "status=$($set.Status)"
Write-Result 'setNumber atribuido pelo servidor' ($firstSet.setNumber -eq 1) "setNumber=$($firstSet.setNumber)"

$replay = Invoke-Api -Method POST -Path "/workout-sessions/$($started.id)/sets" -Headers ($auth + @{ 'Idempotency-Key' = $key }) -Body $setBody
$replayedSet = Get-Json $replay.Content
Write-Result 'Repetir com a mesma chave devolve a mesma serie' `
    ($replay.Status -eq 200 -and $replayedSet.id -eq $firstSet.id) "status=$($replay.Status)"

$conflict = Invoke-Api -Method POST -Path "/workout-sessions/$($started.id)/sets" -Headers ($auth + @{ 'Idempotency-Key' = $key }) -Body @{ sessionExerciseId = $sessionExerciseId; weightKg = 100.0; repetitions = 5 }
Write-Result 'Mesma chave com corpo diferente e conflito' ($conflict.Status -eq 409) "status=$($conflict.Status)"

$second = Invoke-Api -Method POST -Path "/workout-sessions/$($started.id)/sets" -Headers $auth -Body @{ sessionExerciseId = $sessionExerciseId; weightKg = 80.0; repetitions = 8 }
Write-Result 'Segunda serie recebe setNumber 2' ((Get-Json $second.Content).setNumber -eq 2)

# ---------------------------------------------------------------- exercicio avulso
$added = Invoke-Api -Method POST -Path "/workout-sessions/$($started.id)/exercises" -Headers $auth -Body @{ exerciseId = $secondExerciseId; position = 2; notes = $null }
$addedBody = Get-Json $added.Content
Write-Result 'Exercicio avulso adicionado a sessao' ($added.Status -eq 201) "status=$($added.Status)"

# ---------------------------------------------------------------- pausar e retomar
$paused = Invoke-Api -Method PATCH -Path "/workout-sessions/$($started.id)" -Headers $auth -Body @{ status = 'PAUSED' }
Write-Result 'Sessao pode pausar' ((Get-Json $paused.Content).status -eq 'PAUSED') "status=$($paused.Status)"
$resumed = Invoke-Api -Method PATCH -Path "/workout-sessions/$($started.id)" -Headers $auth -Body @{ status = 'IN_PROGRESS' }
Write-Result 'Sessao pode retomar' ((Get-Json $resumed.Content).status -eq 'IN_PROGRESS')

# ---------------------------------------------------------------- concluir
$completed = Invoke-Api -Method POST -Path "/workout-sessions/$($started.id)/complete" -Headers $auth -Body @{}
$completedBody = Get-Json $completed.Content
Write-Result 'Sessao concluida' ($completed.Status -eq 200 -and $completedBody.status -eq 'COMPLETED') "status=$($completed.Status)"
Write-Result 'completedAt preenchido' ([bool]$completedBody.completedAt)

$immutable = Invoke-Api -Method POST -Path "/workout-sessions/$($started.id)/sets" -Headers $auth -Body @{ sessionExerciseId = $sessionExerciseId; weightKg = 80.0; repetitions = 10 }
$immutableBody = Get-Json $immutable.Content
Write-Result 'Sessao finalizada recusa nova serie' ($immutable.Status -eq 409) "status=$($immutable.Status) code=$($immutableBody.code)"

$completeTwice = Invoke-Api -Method POST -Path "/workout-sessions/$($started.id)/complete" -Headers $auth -Body @{}
Write-Result 'Concluir duas vezes e conflito' ($completeTwice.Status -eq 409) "status=$($completeTwice.Status)"

# ---------------------------------------------------------------- historico
$history = Invoke-Api -Method GET -Path '/workout-sessions?page=0&size=20' -Headers $auth
$historyBody = Get-Json $history.Content
Write-Result 'Historico paginado traz a sessao' ($historyBody.totalElements -eq 1) "total=$($historyBody.totalElements)"
Write-Result 'Historico traz os exercicios embutidos' ($historyBody.content[0].exercises.Count -eq 2) "exercicios=$($historyBody.content[0].exercises.Count)"
Write-Result 'Historico traz as series embutidas' ($historyBody.content[0].exercises[0].sets.Count -eq 2) "series=$($historyBody.content[0].exercises[0].sets.Count)"

# ---------------------------------------------------------------- isolamento
$otherAuth = @{ 'X-User-UUID' = ([guid]::NewGuid().ToString()) }

$foreignProgram = Invoke-Api -Method GET -Path "/programs/$($created.id)" -Headers $otherAuth
Write-Result 'Programa de outro usuario responde 404' ($foreignProgram.Status -eq 404) "status=$($foreignProgram.Status)"
$foreignSession = Invoke-Api -Method GET -Path "/workout-sessions/$($started.id)" -Headers $otherAuth
Write-Result 'Sessao de outro usuario responde 404' ($foreignSession.Status -eq 404) "status=$($foreignSession.Status)"
$otherHistory = Invoke-Api -Method GET -Path '/workout-sessions?page=0&size=20' -Headers $otherAuth
Write-Result 'Historico alheio vem vazio' ((Get-Json $otherHistory.Content).totalElements -eq 0)

# ---------------------------------------------------------------- resumo
Write-Host ""
if ($script:failures -gt 0) {
    Write-Host ("{0} de {1} verificacoes FALHARAM." -f $script:failures, $script:checks) -ForegroundColor Red
    exit 1
}
Write-Host ("Todas as {0} verificacoes passaram." -f $script:checks) -ForegroundColor Green
exit 0
