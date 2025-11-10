# Stop any existing containers and clean up
Write-Host "Stopping any existing containers..." -ForegroundColor Yellow
docker-compose down

# Build and start containers in detached mode
Write-Host "Building and starting containers..." -ForegroundColor Green
docker-compose up --build -d

# Wait a moment for containers to initialize
Write-Host "Waiting for containers to initialize..." -ForegroundColor Blue
Start-Sleep -Seconds 5

# Show combined logs from all containers
Write-Host "Displaying logs from all containers. Press Ctrl+C to stop..." -ForegroundColor Green
docker-compose logs -f