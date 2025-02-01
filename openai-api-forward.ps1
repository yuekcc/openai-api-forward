# 获取脚本所在的目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 切换到脚本所在目录
Set-Location -Path $scriptDir

Start-Process -FilePath ".\bun.exe" -ArgumentList "--smol --env-file=.env.production index.js" -WindowStyle Hidden
