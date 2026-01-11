# Script to install pandoc without admin rights
# Download and install pandoc to user directory

Write-Host "Installing pandoc for PDF generation..." -ForegroundColor Green

# Create user directory for pandoc
$pandocDir = "$env:USERPROFILE\pandoc"
if (!(Test-Path $pandocDir)) {
    New-Item -ItemType Directory -Path $pandocDir -Force
    Write-Host "Created directory: $pandocDir"
}

# Download pandoc
$pandocUrl = "https://github.com/jgm/pandoc/releases/download/3.8.3/pandoc-3.8.3-windows-x86_64.zip"
$zipPath = "$env:TEMP\pandoc.zip"
$extractPath = "$env:TEMP\pandoc-extracted"

Write-Host "Downloading pandoc..."
try {
    Invoke-WebRequest -Uri $pandocUrl -OutFile $zipPath -UseBasicParsing
    Write-Host "Downloaded pandoc"
} catch {
    Write-Host "Failed to download pandoc: $_" -ForegroundColor Red
    exit 1
}

# Extract
Write-Host "Extracting pandoc..."
try {
    if (Test-Path $extractPath) {
        Remove-Item -Recurse -Force $extractPath
    }
    Expand-Archive -Path $zipPath -DestinationPath $extractPath
    Write-Host "Extracted pandoc"
} catch {
    Write-Host "Failed to extract pandoc: $_" -ForegroundColor Red
    exit 1
}

# Copy to user directory
$sourceDir = Get-ChildItem $extractPath | Where-Object { $_.PSIsContainer } | Select-Object -First 1
Copy-Item -Recurse -Force "$($sourceDir.FullName)\*" $pandocDir

# Add to PATH for current session
$env:PATH = "$pandocDir;$env:PATH"

# Add to permanent PATH
$userPath = [Environment]::GetEnvironmentVariable("PATH", "User")
if ($userPath -notlike "*$pandocDir*") {
    [Environment]::SetEnvironmentVariable("PATH", "$userPath;$pandocDir", "User")
    Write-Host "Added pandoc to user PATH"
}

# Cleanup
Remove-Item $zipPath -Force
Remove-Item $extractPath -Recurse -Force

# Test installation
try {
    $version = & "$pandocDir\pandoc.exe" --version
    Write-Host "Pandoc installed successfully!" -ForegroundColor Green
    Write-Host "Version: $($version[0])"
    Write-Host "Please restart your terminal to use pandoc system-wide" -ForegroundColor Yellow
} catch {
    Write-Host "Pandoc installation failed: $_" -ForegroundColor Red
    exit 1
}
