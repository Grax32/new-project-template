param(
    [Parameter(Position = 0, Mandatory = $true)]
    [string]$Ports
)

$ErrorActionPreference = "Stop"

# Normalize Ports into an integer array regardless of how they were passed
if (-not $Ports) {
    Write-Host "No ports provided. Use -Ports 4200,4500"
    exit 0
}

try {
    if ($Ports -is [string]) {
        $portsArray = $Ports -split ',' | ForEach-Object { [int]($_.Trim()) }
    }
    else {
        # Ensure we have an enumerable and convert each item to int
        $portsArray = @($Ports) | ForEach-Object { [int]$_ }
    }
}
catch {
    Write-Host "Failed to parse Ports parameter: $_"
    exit 1
}

$ok = $true

foreach ($port in $portsArray) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) {
        Write-Host "Port $port is available."
        continue
    }

    foreach ($c in $conns) {
        $procId = $c.OwningProcess
        $proc = Get-Process -Id $procId
        Write-Host "Port: $port  PID: $($proc.Id)  Process: $($proc.ProcessName)  Path: $($proc.Path)"
        $ok = $false
    }
}

if (-not $ok) {
    Write-Host "Please close the above processes."
    exit 1
}
