$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8080
$prefix = "http://127.0.0.1:$port/"

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add($prefix)
$listener.Start()

Write-Output "Serving $root at $prefix"

$contentTypes = @{
    ".css"  = "text/css"
    ".gif"  = "image/gif"
    ".htm"  = "text/html"
    ".html" = "text/html"
    ".jpeg" = "image/jpeg"
    ".jpg"  = "image/jpeg"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".svg"  = "image/svg+xml"
    ".txt"  = "text/plain"
    ".webp" = "image/webp"
    ".woff" = "font/woff"
    ".woff2" = "font/woff2"
    ".xml"  = "application/xml"
}

function Get-LocalPath([string]$requestPath) {
    $cleanPath = [System.Uri]::UnescapeDataString($requestPath.Split('?')[0].TrimStart('/'))
    if ([string]::IsNullOrWhiteSpace($cleanPath)) {
        $cleanPath = "index.html"
    }

    $candidate = Join-Path $root $cleanPath.Replace('/', '\')
    if (Test-Path -LiteralPath $candidate -PathType Container) {
        $candidate = Join-Path $candidate "index.html"
    }

    if (-not (Test-Path -LiteralPath $candidate -PathType Leaf)) {
        $candidate = Join-Path $root "index.html"
    }

    return $candidate
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        try {
            $filePath = Get-LocalPath $context.Request.RawUrl
            $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
            $contentType = $contentTypes[$extension]
            if (-not $contentType) {
                $contentType = "application/octet-stream"
            }

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $context.Response.StatusCode = 200
            $context.Response.ContentType = $contentType
            $context.Response.ContentLength64 = $bytes.Length
            $context.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        } catch {
            $message = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $context.Response.StatusCode = 404
            $context.Response.ContentType = "text/plain"
            $context.Response.ContentLength64 = $message.Length
            $context.Response.OutputStream.Write($message, 0, $message.Length)
        } finally {
            $context.Response.OutputStream.Close()
        }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
