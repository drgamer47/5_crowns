# Count Lines

Count all lines in the project excluding node_modules.

Run the PowerShell script:
```powershell
.\count-lines.ps1
```

Or use this one-liner:
```powershell
$total = 0; Get-ChildItem -Recurse -File | Where-Object { $_.FullName -notlike "*\node_modules\*" } | ForEach-Object { try { $total += (Get-Content $_.FullName -ErrorAction Stop | Measure-Object -Line).Lines } catch {} }; Write-Host $total
```

