# K-pop English App 시작 스크립트
# PowerShell 관리자 권한으로 실행하세요

Write-Host "Surface Ethernet 어댑터 비활성화 중..." -ForegroundColor Yellow

# Surface Ethernet 어댑터 비활성화 (172.31.99.197 IP 원인)
Get-NetAdapter | Where-Object { $_.InterfaceDescription -like "*Surface*" } | Disable-NetAdapter -Confirm:$false

Write-Host "완료! 올바른 IP로 Expo 시작..." -ForegroundColor Green

# 올바른 WiFi IP 강제 설정
$env:REACT_NATIVE_PACKAGER_HOSTNAME = "10.10.61.163"

Set-Location "C:\Claude\K-pop"
npx expo start --clear
