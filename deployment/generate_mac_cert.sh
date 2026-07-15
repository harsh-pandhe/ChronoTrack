#!/bin/bash
# generate_mac_cert.sh
# Shell script to generate self-signed code signing certificate on macOS and import to Keyring.

CERT_NAME="ChronoTrackInternalSigning"
KEYCHAIN="login.keychain"

echo "[*] Generating OpenSSL configuration..."
cat <<EOF > cert_config.cnf
[ req ]
default_bits       = 2048
distinguished_name = req_distinguished_name
prompt             = no

[ req_distinguished_name ]
CN                 = $CERT_NAME
O                  = ChronoTrack
C                  = IN
EOF

echo "[*] Generating private key and certificate..."
openssl req -new -x509 -nodes -days 1825 -config cert_config.cnf -keyout key.pem -out cert.pem

echo "[*] Packaging key and cert into PKCS12 (.p12)..."
openssl pkcs12 -export -out "$CERT_NAME.p12" -inkey key.pem -in cert.pem -password pass:ChronoTrack123!

echo "[*] Cleaning up temporary OpenSSL files..."
rm cert_config.cnf key.pem cert.pem

echo "[+] Certificate successfully generated: $CERT_NAME.p12"
echo "    To import this certificate into your local Keychain, run:"
echo "    security import $CERT_NAME.p12 -k $KEYCHAIN -P ChronoTrack123! -T /usr/bin/codesign"
