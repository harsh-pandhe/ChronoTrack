# generate_windows_cert.ps1
# PowerShell script to generate an internal self-signed code signing certificate for Active Directory rollouts.

$certName = "CivilMantraInternalCodeSigning"
$certStore = "Cert:\CurrentUser\My"

Write-Output "[*] Generating self-signed code signing certificate..."
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject "CN=$certName" -KeySpec Signature -KeyExportPolicy Exportable -KeyUsage DigitalSignature -KeyLength 2048 -NotAfter (Get-Date).AddYears(5)

Write-Output "[+] Certificate successfully created in current user store."
Write-Output "    Thumbprint: $($cert.Thumbprint)"
Write-Output "    Subject: $($cert.Subject)"

# Export to PFX
$pfxPath = Join-Path $pwd "$certName.pfx"
$password = ConvertTo-SecureString "CivilMantra123!" -AsPlainText -Force

Write-Output "[*] Exporting certificate to $pfxPath..."
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $password

Write-Output "[+] Export complete. Copy this PFX to your signing server."
Write-Output "    To sign your executable, run:"
Write-Output "    SignTool sign /f `"$pfxPath`" /p `"CivilMantra123!`" /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 target_binary.exe"
