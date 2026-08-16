const GROQ_API_KEY = "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";
let currentLeads = [];
let selectedLead = null;

// ==========================================
// 1. O Radar (Scraper Hack)
// ==========================================
document.getElementById('btnRodarRadar').addEventListener('click', async () => {
    const nicho = document.getElementById('nichoInput').value.trim();
    const cidade = document.getElementById('cidadeInput').value.trim();
    
    if (!nicho || !cidade) {
        alert("Por favor, preencha o Nicho e a Cidade para o Radar funcionar.");
        return;
    }

    // Preparando a UI
    document.getElementById('loadingRadar').classList.remove('hidden');
    document.getElementById('leadsContainer').classList.add('hidden');
    document.getElementById('painelAcao').classList.add('hidden');
    document.getElementById('listaLeads').innerHTML = '';
    currentLeads = [];

    // Tática Hacker: Busca Avançada via DuckDuckGo passando por um Proxy anônimo
    // O proxy anterior (AllOrigins) às vezes bloqueia a conexão. Mudamos para o CodeTabs (mais robusto).
    const query = `site:instagram.com "${nicho}" "${cidade}" -explore -p -tags`;
    const duckUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const proxyUrl = `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(duckUrl)}`;

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) throw new Error("O servidor proxy bloqueou a busca temporariamente.");
        
        // O CodeTabs devolve o HTML puro, não precisa de .json()
        const htmlText = await response.text();
        
        if (!htmlText || htmlText.length < 100) throw new Error("Sem resposta do buscador.");

        // Analisando o HTML escondido
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const resultados = doc.querySelectorAll('.result__a');
        
        resultados.forEach(linkElement => {
            const href = linkElement.href;
            // Filtra apenas links reais de perfis, ignorando posts
            if (href && href.includes('instagram.com') && !href.includes('/p/') && !href.includes('/explore/') && !href.includes('/reel/')) {
                const match = href.match(/instagram\.com\/([a-zA-Z0-9_.-]+)/);
                if (match) {
                    let tituloCru = linkElement.textContent;
                    // Limpando o título para pegar só o nome da empresa
                    let nomeLimpo = tituloCru.replace(' no Instagram', '').replace(' no Instagram...', '').split(' - ')[0].split(' | ')[0].trim();
                    const arroba = match[1];
                    
                    // Evita duplicatas na lista
                    if (!currentLeads.find(l => l.handle === arroba) && arroba !== 'explore') {
                        currentLeads.push({ 
                            name: nomeLimpo, 
                            handle: arroba, 
                            url: `https://instagram.com/${arroba}` 
                        });
                    }
                }
            }
        });

        if (currentLeads.length === 0) {
            alert("O Radar não encontrou perfis suficientes. Tente mudar o nome do nicho (Ex: de 'Hamburgueria' para 'Burger').");
        } else {
            document.getElementById('contadorLeads').innerText = currentLeads.length;
            renderLeads();
            document.getElementById('leadsContainer').classList.remove('hidden');
        }
    } catch (e) {
        alert("Erro no Radar: " + e.message);
    }
    
    document.getElementById('loadingRadar').classList.add('hidden');
});

// Renderiza a lista lateral
function renderLeads() {
    const lista = document.getElementById('listaLeads');
    lista.innerHTML = '';
    
    currentLeads.forEach((lead, index) => {
        const li = document.createElement('li');
        li.className = "p-4 hover:bg-blue-50 cursor-pointer transition flex justify-between items-center group border-l-4 border-transparent hover:border-blue-500";
        li.innerHTML = `
            <div class="overflow-hidden pr-4">
                <p class="font-bold text-slate-800 text-sm truncate" title="${lead.name}">${lead.name}</p>
                <p class="text-xs text-slate-500 mt-0.5">@${lead.handle}</p>
            </div>
            <i class="fa-solid fa-chevron-right text-slate-300 group-hover:text-blue-500 transition"></i>
        `;
        li.onclick = () => selectLead(index, li);
        lista.appendChild(li);
    });
}

function selectLead(index, liElement) {
    // Destaca o selecionado na lista
    document.querySelectorAll('#listaLeads li').forEach(li => li.classList.remove('bg-blue-50', 'border-blue-500'));
    liElement.classList.add('bg-blue-50', 'border-blue-500');

    selectedLead = currentLeads[index];
    document.getElementById('painelAcao').classList.remove('hidden');
    document.getElementById('copyResult').classList.add('hidden');
    document.getElementById('copyResult').classList.remove('flex');
    
    document.getElementById('leadNome').innerText = selectedLead.name;
    document.getElementById('leadInsta').innerText = '@' + selectedLead.handle;
    document.getElementById('leadInsta').href = selectedLead.url;

    // Lógica do botão Checar INPI
    document.getElementById('btnChecarINPI').onclick = () => {
        // Copia o nome principal para a área de transferência para facilitar a vida do assessor
        const nomePrincipal = selectedLead.name.split('-')[0].trim();
        navigator.clipboard.writeText(nomePrincipal);
        alert(`O nome "${nomePrincipal}" foi copiado!\n\nCole no campo "Marca" no site do INPI que vai abrir agora e resolva o CAPTCHA.`);
        window.open(`https://busca.inpi.gov.br/pepi/jsp/marcas/Pesquisa_classe_basica.jsp`, '_blank');
    };
}

// ==========================================
// 2. O Cérebro Groq (IA)
// ==========================================
document.getElementById('btnGerarCopy').addEventListener('click', async () => {
    if (!selectedLead) return;
    
    document.getElementById('loadingGroq').classList.remove('hidden');
    document.getElementById('copyResult').classList.add('hidden');
    document.getElementById('copyResult').classList.remove('flex');

    const nichoInformado = document.getElementById('nichoInput').value;

    const prompt = `
        Você é o melhor SDR (Sales Development Representative) da EDV Jr. (Uma Empresa Júnior de Direito focada em Registro de Marcas).
        Nosso único objetivo agora é fechar um contrato de Registro de Marca no INPI.
        
        O radar acabou de raspar o seguinte alvo no Instagram:
        Nome da Empresa/Página: ${selectedLead.name}
        Instagram: @${selectedLead.handle}
        Nicho da empresa: ${nichoInformado}
        
        Escreva como um humano (jovem, profissional, não robótico). Quero APENAS um JSON com 2 coisas:
        1. "argumento_venda": Um parágrafo oculto apenas para nosso vendedor ler. Explique a dor desse nicho específico (ex: Clínicas costumam copiar nomes; E-commerce pode perder o domínio do site) para o vendedor saber o que falar na reunião.
        2. "copy_instagram": Uma mensagem de Direct de Instagram INCRÍVEL. Curta, sem parecer "vendedor chato". Elogie o perfil deles, diga que fizemos uma pesquisa rápida no banco de marcas e vimos um risco de plágio no nome deles, e ofereça uma verificação gratuita completa. (Máximo 3 parágrafos curtos).
        
        Responda ESTRITAMENTE em formato JSON puro:
        {
            "argumento_venda": "texto",
            "copy_instagram": "texto"
        }
    `;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.5
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        // Limpeza de blocos de código Markdown caso o Groq envie
        let content = data.choices[0].message.content;
        content = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
        const aiResponse = JSON.parse(content);

        document.getElementById('argumentoVenda').innerText = aiResponse.argumento_venda;
        document.getElementById('copyInstagram').value = aiResponse.copy_instagram;

        document.getElementById('loadingGroq').classList.add('hidden');
        document.getElementById('copyResult').classList.remove('hidden');
        document.getElementById('copyResult').classList.add('flex');
    } catch (e) {
        document.getElementById('loadingGroq').classList.add('hidden');
        alert("Erro na IA: " + e.message);
        console.error(e);
    }
});
