# ...existing code...
# Carica variabili da .env nella cartella dello script
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$envFile = Join-Path $scriptDir '.env'

if (-Not (Test-Path $envFile)) {
  Write-Error ".env non trovato in $scriptDir"
  return
}

Get-Content $envFile |
  Where-Object { $_ -and -not $_.TrimStart().StartsWith('#') } |
  ForEach-Object {
    $parts = $_ -split '=',2
    if ($parts.Count -eq 2) {
      Set-Item -Path "env:$($parts[0].Trim())" -Value $parts[1].Trim()
    } else {
      Write-Host "Salto riga non valida in .env: $_" -ForegroundColor Yellow
    }
  }

Write-Output "SPRING_DATASOURCE_URL = $env:SPRING_DATASOURCE_URL"

function Find-MvnWrapper {
  param($startDir, $maxLevels = 4)
  $dir = $startDir
  for ($i=0; $i -le $maxLevels; $i++) {
    $c1 = Join-Path $dir 'mvnw.cmd'
    $c2 = Join-Path $dir 'mvnw'
    if (Test-Path $c1) { return $c1 }
    if (Test-Path $c2) { return $c2 }
    $parent = Split-Path $dir -Parent
    if (-not $parent -or $parent -eq $dir) { break }
    $dir = $parent
  }
  return $null
}

$wrapper = Find-MvnWrapper -startDir $scriptDir
if ($wrapper) {
  Write-Output "Usando wrapper trovato: $wrapper"
  $wrapperDir = Split-Path -Parent $wrapper
  Push-Location $wrapperDir
  try {
    & $wrapper spring-boot:run
  } finally {
    Pop-Location
  }
} elseif (Get-Command mvn -ErrorAction SilentlyContinue) {
  Write-Output "Usando mvn dalla PATH"
  mvn spring-boot:run
} else {
  Write-Error "mvn non trovato. Installa Apache Maven o assicurati che il wrapper mvnw(.cmd) sia in un livello superiore del progetto."
}
# ...existing code...