# Crops a browser screenshot to a 16:9 region and scales it to 1600x900 for the App Store listing
# (Shopify: 1600x900, no browser window or desktop background).
# Usage: powershell -ExecutionPolicy Bypass -File docs\listing\crop-screenshot.ps1 <in.png> <out.png> <x> <y> <width>
#   x, y, width are in the input image's pixels; the height is width * 9 / 16.
param(
  [Parameter(Mandatory)] [string]$In,
  [Parameter(Mandatory)] [string]$Out,
  [Parameter(Mandatory)] [int]$X,
  [Parameter(Mandatory)] [int]$Y,
  [Parameter(Mandatory)] [int]$Width
)
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile((Resolve-Path $In))
$h = [int][math]::Round($Width * 9 / 16)
if ($X + $Width -gt $src.Width -or $Y + $h -gt $src.Height) {
  $src.Dispose()
  throw "Region ${Width}x$h at ($X,$Y) is outside the $($src.Width)x$($src.Height) image."
}
$dst = New-Object System.Drawing.Bitmap 1600, 900
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, (New-Object System.Drawing.Rectangle 0, 0, 1600, 900), (New-Object System.Drawing.Rectangle $X, $Y, $Width, $h), [System.Drawing.GraphicsUnit]::Pixel)
$dst.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $dst.Dispose(); $src.Dispose()
Write-Output "Wrote $Out (1600x900)"
