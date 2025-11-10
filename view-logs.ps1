$containers = @("api", "cache", "frontend")

Write-Host "Starting log view for all containers..." -ForegroundColor Green

# Create a new window for each container's logs
foreach ($container in $containers) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "docker logs -f big-data-test-app-$container"
}

Write-Host "Log windows opened for all containers. Close the windows when done viewing logs." -ForegroundColor Green