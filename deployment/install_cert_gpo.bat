@echo off
rem install_cert_gpo.bat
rem Batch script to run on target client machines via Active Directory startup GPO.
rem This registers the internal self-signed certificate to bypass SmartScreen warning.

set CERT_PATH=\\domain-controller\SYSVOL\certificates\ChronoTrackInternalCodeSigning.pfx
set CERT_PASS=ChronoTrack123!

echo [*] Importing certificate to Trusted Root Certification Authorities...
certutil -addstore -f "Root" "%CERT_PATH%"

echo [*] Importing certificate to Trusted Publishers...
certutil -addstore -f "TrustedPublisher" "%CERT_PATH%"

echo [+] Installation completed successfully.
