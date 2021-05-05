#!/usr/bin/env bash
# downloads csper chrome extension

set -e
echo "[+] checking deps"

extension_id="ahlnecfloencbkpfnpljbojmjkfgnmdc"   # https://chrome.google.com/webstore/detail/content-security-policy-c/ahlnecfloencbkpfnpljbojmjkfgnmdc 

which unzip 1>/dev/null || echo "[-] please install unzip from your package manager"
which unzip 1>/dev/null || exit 1 

which curl 1>/dev/null || echo "[-] please install unzip from your package manager"
which curl 1>/dev/null || exit 1 

[[ -e "./csper.zip" ]] && rm "./csper.zip"
[[ -e "./csper-src" ]] && rm -r "./csper-src"

echo "[+] downloading chrome extension..."
# download chrome extension & bypass cors

curl -s -L -o "./csper.zip" "https://cors-anywhere.herokuapp.com/https://clients2.google.com/service/update2/crx?response=redirect&os=win&arch=x86-64&os_arch=x86-64&nacl_arch=x86-64&prod=chromiumcrx&prodchannel=unknown&prodversion=9999.0.9999.0&acceptformat=crx2,crx3&x=id%3D${extension_id}%26uc" -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:83.0) Gecko/20100101 Firefox/83.0' \
  -H 'Accept: */*' \
  -H 'Accept-Language: en-US,en;q=0.5' \
  --compressed \
  -H 'Origin: https://robwu.nl'\
  -H 'Connection: keep-alive' \
  -H 'Referer: https://robwu.nl/'\
  -H 'Pragma: no-cache'\
  -H 'Cache-Control: no-cache'


file "./csper.zip" | grep -q Chrome || ( echo "[-] could not download extension"; exit 1 )

echo "[+] unpacking csper extension" 
unzip -d "csper-src" "csper.zip"
echo "[+] done!" 

exit 0
