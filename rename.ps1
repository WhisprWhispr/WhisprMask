$files = @('admin.html', 'app.js', 'inbox.html', 'index.html', 'README.md', 'send.html', 'settings.html', 'style.css', 'translations.js', 'firebase-config.js')
foreach ($file in $files) {
    $content = Get-Content $file -Raw -Encoding UTF8
    $content = [regex]::Replace($content, 'Whispr(?!Mask)', 'WhisprMask')
    Set-Content $file -Value $content -Encoding UTF8
}
Write-Host "Renamed successfully!"
