const axios = require("axios");
require("dotenv").config();

function getToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN não foi definido no .env");
  }
  return token;
}

function getChatId() {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    throw new Error("TELEGRAM_CHAT_ID não foi definido no .env");
  }
  return chatId;
}

function limparTextoTelegram(texto = "") {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function enviarMensagemTelegram(texto) {
  const token = getToken();
  const chatId = getChatId();

  const textoLimpo = limparTextoTelegram(texto);

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await axios.post(url, {
    chat_id: chatId,
    text: textoLimpo,
    disable_web_page_preview: false
  });

  return response.data;
}

async function enviarFotoTelegram(imagemUrl, legenda) {
  const token = getToken();
  const chatId = getChatId();

  const legendaLimpa = limparTextoTelegram(legenda).slice(0, 900);

  const url = `https://api.telegram.org/bot${token}/sendPhoto`;

  const response = await axios.post(url, {
    chat_id: chatId,
    photo: imagemUrl,
    caption: legendaLimpa
  });

  return response.data;
}

/**
 * Tenta enviar com foto.
 * Se falhar, envia só texto.
 */
async function enviarProdutoTelegram(produto) {
  const legenda = produto.mensagem;

  try {
    if (produto.imagem) {
      await enviarFotoTelegram(produto.imagem, legenda);
    } else {
      await enviarMensagemTelegram(legenda);
    }
  } catch (error) {
    console.error("Erro no envio com foto. Tentando enviar só texto...");
    console.error(error.response?.data || error.message);

    await enviarMensagemTelegram(legenda);
  }
}

module.exports = {
  enviarMensagemTelegram,
  enviarFotoTelegram,
  enviarProdutoTelegram
};