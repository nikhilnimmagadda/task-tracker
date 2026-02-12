# ─── Azure Deployment Script for Task Tracker ─────────────
# Resources: Resource Group, Cosmos DB (serverless), Storage Account, Function App

$ErrorActionPreference = "Stop"

# ─── Configuration ───────────────────────────────────
$APP_NAME        = "taskstracker"
$LOCATION        = "westus2"
$RESOURCE_GROUP  = "$APP_NAME-rg"
$COSMOS_ACCOUNT  = "$APP_NAME-cosmos"
$STORAGE_ACCOUNT = ($APP_NAME -replace '[^a-z0-9]','') + "store"   # must be lowercase, no hyphens
$FUNC_APP        = "$APP_NAME-func"
$COSMOS_DB       = "tasktracker"
$COSMOS_TASKS    = "tasks"
$COSMOS_COMMENTS = "comments"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Task Tracker - Azure Deployment" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "App Name:        $APP_NAME"
Write-Host "Region:          $LOCATION"
Write-Host "Resource Group:  $RESOURCE_GROUP"
Write-Host "Cosmos Account:  $COSMOS_ACCOUNT"
Write-Host "Storage Account: $STORAGE_ACCOUNT"
Write-Host "Function App:    $FUNC_APP`n"

# ─── Step 1: Create Resource Group ───────────────────
Write-Host "[1/6] Creating Resource Group..." -ForegroundColor Yellow
az group create --name $RESOURCE_GROUP --location $LOCATION --output none
Write-Host "  ✓ Resource Group created" -ForegroundColor Green

# ─── Step 2: Create Cosmos DB Account (Serverless) ───
Write-Host "[2/6] Creating Cosmos DB Account (serverless, may take 2-5 min)..." -ForegroundColor Yellow
az cosmosdb create `
  --name $COSMOS_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --kind GlobalDocumentDB `
  --capabilities EnableServerless `
  --default-consistency-level Session `
  --locations regionName=$LOCATION `
  --output none
Write-Host "  ✓ Cosmos DB Account created" -ForegroundColor Green

# Create Database
Write-Host "  Creating database '$COSMOS_DB'..."
az cosmosdb sql database create `
  --account-name $COSMOS_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --name $COSMOS_DB `
  --output none

# Create Containers
Write-Host "  Creating container '$COSMOS_TASKS'..."
az cosmosdb sql container create `
  --account-name $COSMOS_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --database-name $COSMOS_DB `
  --name $COSMOS_TASKS `
  --partition-key-path "/partitionKey" `
  --output none

Write-Host "  Creating container '$COSMOS_COMMENTS'..."
az cosmosdb sql container create `
  --account-name $COSMOS_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --database-name $COSMOS_DB `
  --name $COSMOS_COMMENTS `
  --partition-key-path "/taskId" `
  --output none
Write-Host "  ✓ Database and containers created" -ForegroundColor Green

# Get Cosmos DB connection details
$COSMOS_ENDPOINT = az cosmosdb show --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query "documentEndpoint" --output tsv
$COSMOS_KEY = az cosmosdb keys list --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --query "primaryMasterKey" --output tsv

# ─── Step 3: Create Storage Account ─────────────────
Write-Host "[3/6] Creating Storage Account..." -ForegroundColor Yellow
az storage account create `
  --name $STORAGE_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --sku Standard_LRS `
  --output none
Write-Host "  ✓ Storage Account created" -ForegroundColor Green

# ─── Step 4: Create Function App ─────────────────────
Write-Host "[4/6] Creating Function App..." -ForegroundColor Yellow
az functionapp create `
  --name $FUNC_APP `
  --resource-group $RESOURCE_GROUP `
  --storage-account $STORAGE_ACCOUNT `
  --consumption-plan-location $LOCATION `
  --runtime node `
  --runtime-version 20 `
  --functions-version 4 `
  --os-type Linux `
  --output none
Write-Host "  ✓ Function App created" -ForegroundColor Green

# ─── Step 5: Configure App Settings ─────────────────
Write-Host "[5/6] Configuring app settings (Cosmos DB connection)..." -ForegroundColor Yellow
az functionapp config appsettings set `
  --name $FUNC_APP `
  --resource-group $RESOURCE_GROUP `
  --settings `
    "COSMOS_ENDPOINT=$COSMOS_ENDPOINT" `
    "COSMOS_KEY=$COSMOS_KEY" `
    "COSMOS_DATABASE=$COSMOS_DB" `
    "COSMOS_CONTAINER_TASKS=$COSMOS_TASKS" `
    "COSMOS_CONTAINER_COMMENTS=$COSMOS_COMMENTS" `
  --output none
Write-Host "  ✓ App settings configured" -ForegroundColor Green

# ─── Step 6: Deploy Function App Code ────────────────
Write-Host "[6/6] Deploying code to Azure..." -ForegroundColor Yellow
Push-Location $PSScriptRoot
func azure functionapp publish $FUNC_APP --javascript
Pop-Location
Write-Host "  ✓ Code deployed" -ForegroundColor Green

# ─── Summary ─────────────────────────────────────────
$APP_URL = "https://$FUNC_APP.azurewebsites.net"
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Deployment Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nApp URL:         $APP_URL" -ForegroundColor Green
Write-Host "Cosmos Endpoint: $COSMOS_ENDPOINT"
Write-Host "Resource Group:  $RESOURCE_GROUP"
Write-Host "`nTo view logs:    az functionapp log tail --name $FUNC_APP --resource-group $RESOURCE_GROUP"
Write-Host "To delete all:   az group delete --name $RESOURCE_GROUP --yes --no-wait`n"
