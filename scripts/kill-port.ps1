param(
	[Parameter(Mandatory=$false, Position=0)]
	[int]$Port = 0
)

if ($Port -le 0 -or $Port -gt 65535) {
	Write-Error "Invalid port: $Port"
	exit 1
}

$conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue


if (-not $conns) {
	Write-Output "No process is listening on port $Port"
	exit 0
}

$pids = $conns | Select-Object -ExpandProperty OwningProcess | Sort-Object -Unique

foreach ($id in $pids) {
	try {
		$proc = Get-Process -Id $id -ErrorAction Stop
		Write-Output "Stopping process $($proc.ProcessName) (PID $id) listening on port $Port"
		Stop-Process -Id $id -Force -ErrorAction Stop
	} catch {
		Write-Error "Failed to stop PID $id $($_.Exception.Message)"
		exit 1
	}
}
