# Draws the Fixlog App Store icon (1200x1200 PNG, no text, no Shopify marks; Shopify rounds the corners).
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File docs\listing\make-icon.ps1
Add-Type -AssemblyName System.Drawing

$size = 1200
$out = Join-Path $PSScriptRoot "icon-1200.png"
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

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
$slate = [System.Drawing.ColorTranslator]::FromHtml("#B6C2D1")
$green = [System.Drawing.ColorTranslator]::FromHtml("#22C55E")
$white = [System.Drawing.Color]::White

# Background
$g.Clear($navy)
# The drawing below spans x 300-1030, y 220-1050; shift it so it sits in the middle.
$g.TranslateTransform(-65, -35)

# The log: a white page with three entries
$page = RoundedRect 300 220 560 720 64
$g.FillPath((New-Object System.Drawing.SolidBrush $white), $page)
$lineBrush = New-Object System.Drawing.SolidBrush $slate
foreach ($row in @(@(370, 400), @(490, 400), @(610, 260))) {
  $bar = RoundedRect 380 $row[0] $row[1] 48 24
  $g.FillPath($lineBrush, $bar)
}

# The fix: a green check badge, ringed in navy so it reads apart from the page
$cx = 830; $cy = 850; $r = 200
$ring = 30
$g.FillEllipse((New-Object System.Drawing.SolidBrush $navy), $cx - $r - $ring, $cy - $r - $ring, 2 * ($r + $ring), 2 * ($r + $ring))
$g.FillEllipse((New-Object System.Drawing.SolidBrush $green), $cx - $r, $cy - $r, 2 * $r, 2 * $r)
$pen = New-Object System.Drawing.Pen $white, 56
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
$check = [System.Drawing.PointF[]]@(
  (New-Object System.Drawing.PointF 735, 855),
  (New-Object System.Drawing.PointF 805, 925),
  (New-Object System.Drawing.PointF 935, 785)
)
$g.DrawLines($pen, $check)

$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()
Write-Output "Wrote $out"
