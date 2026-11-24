# Moves everything the website does not use into ONE folder: _to-delete
# (in the project folder). Nothing is deleted by this script. Have a look in
# _to-delete, then delete that folder yourself.
#
# Kept: everything the site uses, and incoming-photos\shortlist (the good
# photos, sorted into hero / food / wildlife).
#
# Run from the project folder:
#   powershell -ExecutionPolicy Bypass -File scripts\cleanup-public.ps1

$root = Split-Path -Parent $PSScriptRoot
$pub  = Join-Path $root "public"
$inc  = Join-Path $root "incoming-photos"
$dest = Join-Path $root "_to-delete"

function Move-To($src, $sub) {
  if (-not (Test-Path $src)) { return 0 }
  $target = Join-Path $dest $sub
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  Move-Item -Path $src -Destination $target -Force
  Write-Host "moved  $src"
  return 1
}

$moved = 0

# 1. Old pictures in public\ the site no longer uses
$unused = @(
  # AI-made pictures that are not the real property (villa, spa, leopard...)
  "accommodation-udawalawe.png","accommodation.png","experiences-udawalawe.png","experiences.png",
  "hero-bg-udawalawe.png","hero-bg.png","lily-aerial-resort.jpg","lily-aerial-resort.png",
  "lily-bush-dining.png","lily-dining-pavilion.jpg","lily-dining-pavilion.png","lily-presidential-villa.png",
  "lily-resort-hero.png","lily-safari-elephants.png","lily-safari-leopard.png","lily-spa-pavilion.jpg",
  "lily-spa-pavilion.png","lily-wildlife-birds.jpg","lily-wildlife-birds.png","safari-dining.png",
  "safari-leopard.png","villa-pool.png",
  # Next.js starter icons
  "file.svg","globe.svg","next.svg","vercel.svg","window.svg",
  # Photos replaced by better ones
  "pool-night.webp","property-garden-night.webp","safari-herd-plains.webp","safari-jeeps-pair.webp",
  # Original logo upload (the site uses the brand\ versions made from it)
  "logo.jpg"
)
foreach ($name in $unused) { $moved += Move-To (Join-Path $pub $name) "old-site-images" }

# 2. Old hero video experiments and the watermarked AI clip
$moved += Move-To (Join-Path $pub "video") "."

# 3. The full Google Drive dump (270 raw photos, many with guests' faces)
$moved += Move-To (Join-Path $pub "drive") "."

# 4. Duplicates in incoming-photos (same WhatsApp photos as the Drive dump)
Get-ChildItem -Path $inc -File -Filter "IMG-*.jpg" -ErrorAction SilentlyContinue | ForEach-Object {
  $moved += Move-To $_.FullName "incoming-duplicates"
}
$moved += Move-To (Join-Path $inc "pool-night-16x9.jpg") "incoming-duplicates"

Write-Host ""
Write-Host "$moved item(s) moved to $dest"
Write-Host "Check it, then delete the _to-delete folder."
