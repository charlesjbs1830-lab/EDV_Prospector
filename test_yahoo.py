import urllib.request
import urllib.parse

query = 'site:instagram.com "clinica de estetica" "sao paulo"'
yahoo_url = f"https://search.yahoo.com/search?p={urllib.parse.quote(query)}"
proxy_url = f"https://api.codetabs.com/v1/proxy/?quest={urllib.parse.quote(yahoo_url)}"

try:
    req = urllib.request.Request(proxy_url, headers={'User-Agent': 'Mozilla/5.0'})
    html = urllib.request.urlopen(req).read().decode('utf-8')
    
    if "instagram.com" in html:
        print("SUCESSO: Encontrou instagram.com no HTML do Yahoo via Proxy.")
    else:
        print("FALHA: HTML retornado não contém instagram.com. Provavelmente bloqueado.")
        # print(html[:500])
except Exception as e:
    print("FALHA DE CONEXAO:", str(e))
