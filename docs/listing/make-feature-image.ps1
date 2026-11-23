# Draws the App Store feature image (1600x900 PNG): one headline plus the pre-review snapshot screenshot.
# Rules (Shopify best practices): one focal point, solid background, strong contrast, no Shopify logos,
# don't repeat the app card subtitle, no prices, stats, reviews or outcome promises.
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File docs\listing\make-feature-image.ps1
Add-Type -AssemblyName System.Drawing

$W = 1600; $H = 900
$out = Join-Path $PSScriptRoot "feature-image.png"
$shot = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot "screenshots\4-pre-review-snapshot.png"))
$icon = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot "icon-1200.png"))

$bmp = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAlias

function RoundedRect([float]$x, [float]$y, [float]$w, [float]$h, [float]$r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = 2 * $r
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

$navy = [System.Drawing.ColorTranslator]::FromHtml("#12355B")
$soft = [System.Drawing.ColorTranslator]::FromHtml("#D5DEEA")
$white = [System.Drawing.Color]::White
$g.Clear($navy)

# Brand row: icon + name
$g.DrawImage($icon, (New-Object System.Drawing.Rectangle 90, 170, 72, 72))
$brandFont = New-Object System.Drawing.Font "Segoe UI Semibold", 30, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString("Fixlog", $brandFont, (New-Object System.Drawing.SolidBrush $white), 178, 184)

# Headline and one supporting line, wrapped inside the left column
$left = New-Object System.Drawing.RectangleF 84, 300, 540, 300
$headFont = New-Object System.Drawing.Font "Segoe UI Semibold", 64, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString("See which checks changed", $headFont, (New-Object System.Drawing.SolidBrush $white), $left)
$subFont = New-Object System.Drawing.Font "Segoe UI", 30, ([System.Drawing.FontStyle]::Regular), ([System.Drawing.GraphicsUnit]::Pixel)
$sub = New-Object System.Drawing.RectangleF 90, 590, 540, 120
$g.DrawString("A dated record you can paste into each review request", $subFont, (New-Object System.Drawing.SolidBrush $soft), $sub)

# The app UI on a white card with a soft shadow
$cw = 880; $ch = [int]($cw * 9 / 16); $cx = 660; $cy = [int](($H - $ch) / 2)
$shadow = RoundedRect ($cx + 10) ($cy + 14) $cw $ch 22
$g.FillPath((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(70, 0, 0, 0))), $shadow)
$card = RoundedRect $cx $cy $cw $ch 22
$g.SetClip($card)
$g.DrawImage($shot, (New-Object System.Drawing.Rectangle $cx, $cy, $cw, $ch))
$g.ResetClip()

$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); $shot.Dispose(); $icon.Dispose()
Write-Output "Wrote $out (1600x900)"
