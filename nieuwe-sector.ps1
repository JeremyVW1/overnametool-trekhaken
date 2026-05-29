#requires -Version 5.1
<#
.SYNOPSIS
  Maakt een nieuwe sector-instance aan op basis van _TEMPLATE/.

.DESCRIPTION
  Kopieert _TEMPLATE/Map-spelers-SECTOR/ naar <SectorId>/Map-spelers-<SectorId>-sector/
  en initialiseert sector.config.json met de meegegeven parameters.

.PARAMETER SectorId
  Korte kebab-case ID voor de sector (1 woord, lowercase). Voorbeeld: "parket"

.PARAMETER SectorLabel
  Volledig label voor UI. Voorbeeld: "Parket & Vloeren"

.PARAMETER Tagline
  Optionele tagline. Default: "Marktkaart voor overname-onderzoek".

.EXAMPLE
  .\nieuwe-sector.ps1 -SectorId "parket" -SectorLabel "Parket & Vloeren"

.EXAMPLE
  .\nieuwe-sector.ps1 -SectorId "schrijnwerk" -SectorLabel "Schrijnwerk" -Tagline "Houtbewerkers BE+NL"
#>

param(
  [Parameter(Mandatory = $true)] [string] $SectorId,
  [Parameter(Mandatory = $true)] [string] $SectorLabel,
  [string] $Tagline = "Marktkaart voor overname-onderzoek"
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

$templateDir = Join-Path $root "_TEMPLATE\Map-spelers-SECTOR"
if (-not (Test-Path $templateDir)) {
  Write-Error "Template folder ontbreekt: $templateDir"
  exit 1
}

# Doel-folder
$sectorRoot = Join-Path $root $SectorId
$sectorMap  = Join-Path $sectorRoot ("Map-spelers-" + $SectorId + "-sector")

if (Test-Path $sectorMap) {
  Write-Error "Sector bestaat al: $sectorMap"
  exit 1
}

# Maak en kopieer
New-Item -ItemType Directory -Force -Path $sectorRoot | Out-Null
Copy-Item -Path $templateDir -Destination $sectorMap -Recurse

# sector.config.json aanpassen
$configPath = Join-Path $sectorMap "sector.config.json"
$json = Get-Content $configPath -Raw -Encoding UTF8 | ConvertFrom-Json
$json.sector_id    = $SectorId
$json.sector_label = $SectorLabel
$json.tagline      = $Tagline
$json | ConvertTo-Json -Depth 20 | Set-Content -Path $configPath -Encoding UTF8

# README per sector
$readme = @"
# $SectorLabel — Overname-Marktkaart

Sector-instance gegenereerd uit \`_TEMPLATE\` op $(Get-Date -Format 'yyyy-MM-dd').

## Volgende stappen

1. Open \`Map-spelers-$SectorId-sector/sector.config.json\` en vul aan:
   - \`scrape.nace_codes_be\`, \`scrape.sbi_codes_nl\`
   - \`scrape.google_maps_terms\`
   - \`scrape.dealer_locators\`
   - \`google_sheets_url\`
2. Vervang \`Map-spelers-$SectorId-sector/favicon.svg\` met je eigen logo
3. Run scrapers in \`Map-spelers-$SectorId-sector/scrapers/\`
4. Open \`Map-spelers-$SectorId-sector/index.html\`

Zie de master [HOW-TO-NEW-SECTOR.md](../HOW-TO-NEW-SECTOR.md) voor de volledige handleiding.
"@
Set-Content -Path (Join-Path $sectorRoot "README.md") -Value $readme -Encoding UTF8

# criteria.md per sector
$criteria = @"
# Overname-criteria — $SectorLabel

Aan te passen door eigenaar. Templates:

## Regio
- BE + NL (default scope_landen in sector.config.json)

## Omvang
- EBITDA: €150.000 – €750.000
- FTE: max 15
- Brutomarge per FTE: minimaal €150.000

## Eigen inbreng
- €150.000 – €250.000 per partner
- Totaal equity: €300.000 – €500.000

## Type bedrijf
- Digitaliseerbaar (laaghangend fruit)
- Eigenaar kan blijven voor kennisoverdracht
- B2B-voorkeur (stabieler dan B2C)

## Marktmultiple
- Marktprijzen: 6-7x EBITDA
"@
Set-Content -Path (Join-Path $sectorRoot "criteria.md") -Value $criteria -Encoding UTF8

Write-Output ""
Write-Output "✅ Sector '$SectorLabel' aangemaakt."
Write-Output ""
Write-Output "Folder:  $sectorRoot"
Write-Output "Map:     $sectorMap"
Write-Output ""
Write-Output "Volgende stappen:"
Write-Output "  1. Vul $configPath aan (NACE, SBI, dealer-locators)"
Write-Output "  2. Vervang favicon.svg"
Write-Output "  3. cd `"$sectorMap\scrapers`""
Write-Output "  4. node apify-cities.js"
Write-Output ""
