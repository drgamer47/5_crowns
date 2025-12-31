# Count all lines in the project excluding node_modules
# Tracks per-file counts and shows changes from previous run

$resultsFile = ".line-counts.json"
$currentCounts = @{}
$total = 0

# Get all files excluding node_modules and the results file itself
$files = Get-ChildItem -Recurse -File | Where-Object { 
    $_.FullName -notlike "*\node_modules\*" -and 
    $_.Name -ne $resultsFile
}

# Count lines for each file
foreach ($file in $files) {
    try {
        $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
        $lines = (Get-Content $file.FullName -ErrorAction Stop | Measure-Object -Line).Lines
        $currentCounts[$relativePath] = $lines
        $total += $lines
    } catch {
        # Skip files that can't be read (binary files, etc.)
    }
}

# Load previous counts if they exist
$previousCounts = @{}
if (Test-Path $resultsFile) {
    try {
        $json = Get-Content $resultsFile -Raw | ConvertFrom-Json
        $json.PSObject.Properties | ForEach-Object {
            $previousCounts[$_.Name] = $_.Value
        }
    } catch {
        Write-Host "Warning: Could not read previous counts file" -ForegroundColor Yellow
    }
}

# Create ranked list of current files (sorted by line count, descending)
$rankedFiles = $currentCounts.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object {
    [PSCustomObject]@{
        File = $_.Key
        Lines = $_.Value
    }
}

# Display ranked results
Write-Host "`n=== Line Count Report (Ranked by Size) ===" -ForegroundColor Cyan
Write-Host ""

$rank = 1
foreach ($item in $rankedFiles) {
    $file = $item.File
    $current = $item.Lines
    $previous = $previousCounts[$file]
    
    $rankStr = "#$rank".PadLeft(4)
    
    if ($null -eq $previous) {
        # New file
        Write-Host "  $rankStr [NEW]     $file : $current lines" -ForegroundColor Green
    } elseif ($current -ne $previous) {
        # Changed
        $diff = $current - $previous
        $sign = if ($diff -gt 0) { "+" } else { "" }
        Write-Host "  $rankStr [CHANGED] $file : $previous -> $current lines ($sign$diff)" -ForegroundColor Yellow
    } else {
        # Unchanged
        Write-Host "  $rankStr [SAME]    $file : $current lines" -ForegroundColor Gray
    }
    $rank++
}

# Show deleted files separately
$deletedFiles = @()
foreach ($file in $previousCounts.Keys) {
    if ($null -eq $currentCounts[$file]) {
        $deletedFiles += [PSCustomObject]@{
            File = $file
            Lines = $previousCounts[$file]
        }
    }
}

if ($deletedFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "  === Deleted Files ===" -ForegroundColor Red
    foreach ($item in $deletedFiles) {
        Write-Host "  [DELETED] $($item.File) : $($item.Lines) lines" -ForegroundColor Red
    }
}

# Count statistics
$changedFiles = 0
$newFiles = 0
foreach ($file in $currentCounts.Keys) {
    $current = $currentCounts[$file]
    $previous = $previousCounts[$file]
    
    if ($null -eq $previous) {
        $newFiles++
    } elseif ($current -ne $previous) {
        $changedFiles++
    }
}

# Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "  Total files: $($currentCounts.Count)" -ForegroundColor White
Write-Host "  New files: $newFiles" -ForegroundColor Green
Write-Host "  Changed files: $changedFiles" -ForegroundColor Yellow
Write-Host "  Deleted files: $deletedFiles" -ForegroundColor Red
Write-Host "  Total lines: $total" -ForegroundColor Cyan
Write-Host ""

# Calculate total change
$previousTotal = ($previousCounts.Values | Measure-Object -Sum).Sum
if ($null -ne $previousTotal) {
    $totalDiff = $total - $previousTotal
    $sign = if ($totalDiff -gt 0) { "+" } else { "" }
    Write-Host "  Previous total: $previousTotal lines" -ForegroundColor Gray
    Write-Host "  Change: $sign$totalDiff lines" -ForegroundColor $(if ($totalDiff -gt 0) { "Green" } elseif ($totalDiff -lt 0) { "Red" } else { "Gray" })
    Write-Host ""
}

# Save current counts for next run
$currentCounts | ConvertTo-Json | Set-Content $resultsFile
Write-Host "Results saved to $resultsFile" -ForegroundColor Gray

