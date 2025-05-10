const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');


const crypto = require('crypto');
const zlib = require('zlib');
const { promisify } = require('util');
const fzstd = require('fzstd');
const { Readable } = require('stream');
const { simpleParser } = require('mailparser');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const BASE_URL = 'https://mail.re146.dev/api';

// Middleware для логирования запросов
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Функция для получения MD5 хеша
const getMD5Hash = (text) => {
  return crypto.createHash('md5').update(text).digest('hex');
};

const makeRequest = async (endpoint, options = {}) => {
  const url = new URL(endpoint.startsWith('http') ? endpoint : BASE_URL + endpoint);
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  const fetchOptions = {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {})
    }
  };

  console.log('Запрос к:', url.toString(), 'метод:', fetchOptions.method || 'GET');

  try {
    const response = await fetch(url.toString(), fetchOptions);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ответ сервера:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    const text = await response.text();
    if (!text) {
      return { status: response.status };
    }

    try {
      return { data: JSON.parse(text), status: response.status };
    } catch (e) {
      return { data: text, status: response.status };
    }
  } catch (error) {
    console.error('Ошибка при выполнении запроса:', error);
    throw error;
  }
};

// Создание нового почтового ящика
app.post('/api/email', async (req, res) => {
  try {
    // Получаем список доменов
    const response = await fetch(`${BASE_URL}/domains`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const domains = await response.json();
    
    if (!Array.isArray(domains)) {
      throw new Error('Неверный формат ответа от API');
    }

    // Генерируем случайное имя
    const username = Math.random().toString(36).substring(2, 12);
    const domain = domains[0];
    const email = `${username}@${domain}`;
    const mailboxId = getMD5Hash(email);
    
    res.json({ 
      address: email,
      mailboxId: mailboxId
    });
  } catch (error) {
    console.error('Ошибка при создании почтового ящика:', error);
    res.status(500).json({ 
      error: 'Ошибка при создании почтового ящика',
      details: error.message
    });
  }
});

// Функция для декодирования zstd сжатых данных
async function decodeZstdMessage(buffer) {
  try {
    const decompressed = fzstd.decompress(buffer);
    return new TextDecoder().decode(decompressed);
  } catch (error) {
    console.error('Ошибка при декодировании сообщения:', error);
    throw error;
  }
}

// Функция для определения формата сообщения
function isEmailFormat(content) {
  return content.startsWith('Received:') || 
         content.includes('MIME-Version:') || 
         content.includes('Content-Type: multipart/');
}

// Функция для парсинга email сообщения
async function parseEmailMessage(rawContent) {
  try {
    // Проверяем, является ли сообщение email-ом
    if (isEmailFormat(rawContent)) {
      const parsed = await simpleParser(rawContent);
      return {
        from: {
          text: parsed.from?.text || '',
          value: parsed.from?.value?.[0] || { name: '', address: '' }
        },
        to: {
          text: parsed.to?.text || '',
          value: parsed.to?.value?.[0] || { name: '', address: '' }
        },
        subject: parsed.subject || '',
        date: parsed.date || new Date(),
        text: parsed.text || '',
        html: parsed.html || '',
        attachments: parsed.attachments?.map(att => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          contentDisposition: att.contentDisposition,
          content: att.content
        })) || [],
        headers: {
          'message-id': parsed.messageId,
          'content-type': parsed.headerLines.find(h => h.key.toLowerCase() === 'content-type')?.line || '',
          'mime-version': parsed.headerLines.find(h => h.key.toLowerCase() === 'mime-version')?.line || '',
          'dkim-signature': parsed.headerLines.find(h => h.key.toLowerCase() === 'dkim-signature')?.line || '',
        },
        raw: rawContent // Сохраняем оригинальное сообщение
      };
    } else {
      // Если это не email, возвращаем контент как есть
      return {
        from: { text: '', value: { name: '', address: '' } },
        to: { text: '', value: { name: '', address: '' } },
        subject: '',
        date: new Date(),
        text: rawContent,
        html: rawContent.startsWith('<') ? rawContent : '',
        attachments: [],
        headers: {},
        raw: rawContent
      };
    }
  } catch (error) {
    console.error('Ошибка при парсинге сообщения:', error);
    // В случае ошибки парсинга, возвращаем сырой контент
    return {
      from: { text: '', value: { name: '', address: '' } },
      to: { text: '', value: { name: '', address: '' } },
      subject: '',
      date: new Date(),
      text: rawContent,
      html: '',
      attachments: [],
      headers: {},
      error: error.message,
      raw: rawContent
    };
  }
}

// Получение списка сообщений
app.get('/api/messages/:mailbox', async (req, res) => {
  try {
    const { mailbox } = req.params;
    if (!mailbox) {
      return res.status(400).json({ error: 'Не указан ID почтового ящика' });
    }

    const response = await fetch(`${BASE_URL}/messages/${mailbox}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const messages = await response.json();
    
    if (!Array.isArray(messages)) {
      throw new Error('Неверный формат ответа от API');
    }

    res.json(messages);
  } catch (error) {
    console.error('Ошибка при получении списка сообщений:', error);
    res.status(500).json({ 
      error: 'Ошибка при получении списка сообщений',
      details: error.message
    });
  }
});

// Получение конкретного сообщения
app.get('/api/message/:mailboxId/:messageId', async (req, res) => {
  try {
    const response = await fetch(`https://mail.re146.dev/storage/${req.params.mailboxId}/${req.params.messageId}`, {
      headers: {
        'Accept': 'text/plain',
        'Accept-Encoding': 'zstd'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const buffer = await response.arrayBuffer();
    const rawContent = await decodeZstdMessage(Buffer.from(buffer));
    const parsedContent = await parseEmailMessage(rawContent);
    
    // Форматируем ответ в нужном формате
    const formattedResponse = {
      id: req.params.messageId,
      from: parsedContent.from?.text || parsedContent.from?.value?.address || 'Неизвестный отправитель',
      subject: parsedContent.subject || '',
      receivedAt: parsedContent.date || new Date(),
      content: parsedContent.html || parsedContent.text || '',
      text: parsedContent.text || '',
      html: parsedContent.html || '',
      attachments: parsedContent.attachments || []
    };
    
    res.json(formattedResponse);
  } catch (error) {
    console.error('Error fetching message content:', error);
    res.status(500).json({ error: 'Не удалось получить содержимое сообщения' });
  }
});

// Удаление сообщения
app.delete('/api/message/:mailbox/:id', async (req, res) => {
  try {
    const { mailbox, id } = req.params;
    const result = await makeRequest(`/box/${mailbox}/messages/${id}`, {
      method: 'DELETE'
    });

    res.status(204).send();
  } catch (error) {
    console.error('Ошибка при удалении сообщения:', error);
    res.status(500).json({ 
      error: 'Ошибка при удалении сообщения',
      details: error.message
    });
  }
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Необработанная ошибка:', err);
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    details: err.message
  });
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
  console.log(`API URL: ${BASE_URL}`);
}); 