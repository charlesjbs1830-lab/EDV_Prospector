/**
 * EDV Prospector - Radar
 * Proxy servidor (Google Apps Script) para a Tavily Search API.
 *
 * Por que isso existe:
 * - A chave da API fica só aqui no servidor, nunca exposta no navegador.
 * - Controla a cota mensal gratuita (1.000 créditos/mês) e corta antes de gerar cobrança.
 */

// ⚠️ Configure aqui a sua chave da Tavily (começa com "tvly-")
var TAVILY_API_KEY = "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";

// Limite mensal do tier gratuito da Tavily é 1.000 créditos.
// Deixamos uma margem de segurança (950) para nunca cair no tier pago.
var MONTHLY_LIMIT = 950;

function doGet(e) {
  var query = e.parameter.q;

  if (!query) {
    return responder({ error: "Nenhuma busca fornecida" });
  }

  var quota = consultarEIncrementarCota();

  if (quota.excedida) {
    return responder({
      error: "Limite mensal gratuito de " + MONTHLY_LIMIT + " buscas atingido. O contador reseta no início do próximo mês.",
      quota: { usado: quota.usado, limite: MONTHLY_LIMIT }
    });
  }

  var payload = {
    query: query,
    search_depth: "basic",
    max_results: 20,
    include_domains: ["instagram.com", "linkedin.com", "facebook.com"],
    include_answer: false,
    include_raw_content: false
  };

  var options = {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + TAVILY_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch("https://api.tavily.com/search", options);
    var status = response.getResponseCode();
    var json = JSON.parse(response.getContentText());

    if (status !== 200) {
      var msg = json.detail ? JSON.stringify(json.detail) : ("HTTP " + status);
      return responder({ error: "Erro na Tavily API: " + msg, quota: { usado: quota.usado, limite: MONTHLY_LIMIT } });
    }

    // Normaliza para o mesmo formato "items" que o front-end já espera (title/link)
    var items = (json.results || []).map(function (r) {
      return { title: r.title, link: r.url, snippet: r.content };
    });

    return responder({
      items: items,
      totalResults: String(items.length),
      quota: { usado: quota.usado, limite: MONTHLY_LIMIT }
    });

  } catch (err) {
    return responder({ error: err.toString(), quota: { usado: quota.usado, limite: MONTHLY_LIMIT } });
  }
}

/**
 * Controla quantas buscas já foram feitas neste mês, usando PropertiesService
 * (persiste entre execuções, compartilhado por quem quer que use o app).
 * Reseta automaticamente quando o mês muda.
 */
function consultarEIncrementarCota() {
  var props = PropertiesService.getScriptProperties();
  var mesAtual = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM");
  var mesSalvo = props.getProperty('quota_mes');
  var usado = parseInt(props.getProperty('quota_usado') || '0', 10);

  if (mesSalvo !== mesAtual) {
    usado = 0;
    props.setProperty('quota_mes', mesAtual);
  }

  if (usado >= MONTHLY_LIMIT) {
    return { excedida: true, usado: usado };
  }

  usado++;
  props.setProperty('quota_usado', String(usado));
  return { excedida: false, usado: usado };
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
