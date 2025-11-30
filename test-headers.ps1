# Test Security Headers Script
# Run this after deploying to Vercel

$url = "https://sc-dam-data.vercel.app"

Write-Host ""
Write-Host "Testing Security Headers for: $url" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $url -Method Head -UseBasicParsing

    $headers = @(
        "Strict-Transport-Security",
        "Content-Security-Policy",
        "X-Frame-Options",
        "X-Content-Type-Options",
        "Referrer-Policy",
        "Permissions-Policy",
        "X-XSS-Protection"
    )

    Write-Host "Security Headers Found:" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Gray

    foreach ($header in $headers) {
        if ($response.Headers[$header]) {
            Write-Host "[OK] $header" -ForegroundColor Green
            Write-Host "     $($response.Headers[$header])" -ForegroundColor Gray
            Write-Host ""
        } else {
            Write-Host "[MISSING] $header" -ForegroundColor Red
            Write-Host ""
        }
    }

    # Check status code
    Write-Host "HTTP Status: $($response.StatusCode) $($response.StatusDescription)" -ForegroundColor Cyan
    Write-Host ""

    # Summary
    $found = ($headers | Where-Object { $response.Headers[$_] }).Count
    $total = $headers.Count

    Write-Host "========================================" -ForegroundColor Gray
    Write-Host "Summary: $found/$total headers present" -ForegroundColor $(if ($found -eq $total) { "Green" } else { "Yellow" })
    Write-Host ""

    if ($found -eq $total) {
        Write-Host "SUCCESS: All security headers are configured correctly!" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Some headers are missing. Check vercel.json configuration." -ForegroundColor Yellow
    }
    Write-Host ""

} catch {
    Write-Host "ERROR: Error testing headers: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}
