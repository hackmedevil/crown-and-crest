Get-Content .env.local | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
  $parts = $_ -split '=', 2
  if ($parts.Count -eq 2) {
    $k = $parts[0].Trim()
    $v = $parts[1].Trim().Trim('"')
    Set-Item -Path "Env:$k" -Value $v
  }
}

$token = $Env:WHATSAPP_ACCESS_TOKEN
$phoneId = $Env:WHATSAPP_PHONE_NUMBER_ID
if (-not $token -or -not $phoneId) {
  Write-Error 'Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID'
  exit 2
}

$headers = @{
  Authorization = "Bearer $token"
  'Content-Type' = 'application/json'
}

$body = @{
  messaging_product = 'whatsapp'
  to = '919805447414'
  type = 'template'
  template = @{
    name = 'hello_world'
    language = @{ code = 'en_US' }
  }
} | ConvertTo-Json -Depth 10

try {
  $resp = Invoke-RestMethod -Method Post -Uri "https://graph.facebook.com/v22.0/$phoneId/messages" -Headers $headers -Body $body
  @{ ok = $true; response = $resp } | ConvertTo-Json -Depth 10
  exit 0
}
catch {
  $status = $null
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
    $status = $_.Exception.Response.StatusCode.value__
  }

  $errBody = $_.ErrorDetails.Message
  if (-not $errBody) {
    try {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $errBody = $reader.ReadToEnd()
    }
    catch {
      $errBody = $_.Exception.Message
    }
  }

  @{ ok = $false; status = $status; error = $errBody } | ConvertTo-Json -Depth 10
  exit 1
}
