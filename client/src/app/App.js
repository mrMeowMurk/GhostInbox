import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import Toast from '../components/Toast/Toast';

const API_BASE_URL = 'http://localhost:3001/api';
const API_DOCS_URL = 'https://mail.re146.dev/api/swagger/#/';

function App() {
  const [mailbox, setMailbox] = useState('');
  const [mailboxId, setMailboxId] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [notification, setNotification] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  
  const emailContainerRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const currentWidthRef = useRef(300);

  // Сохраняем mailboxId в ref для доступа к актуальному значению в интервале
  const mailboxIdRef = useRef(mailboxId);
  useEffect(() => {
    mailboxIdRef.current = mailboxId;
  }, [mailboxId]);

  const updateWidth = (newWidth) => {
    const width = Math.max(250, Math.min(600, newWidth));
    if (emailContainerRef.current) {
      emailContainerRef.current.style.width = `${width}px`;
    }
    if (resizeHandleRef.current) {
      resizeHandleRef.current.style.left = `${width}px`;
    }
    currentWidthRef.current = width;
  };

  useEffect(() => {
    updateWidth(300);
  }, []);

  const handleResizeStart = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = currentWidthRef.current;
    const container = emailContainerRef.current;
    
    if (!container) return;

    const handleMouseMove = (e) => {
      const diff = e.clientX - startX;
      updateWidth(startWidth + diff);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const checkEmails = async () => {
    const currentMailboxId = mailboxIdRef.current;
    if (!currentMailboxId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/messages/${currentMailboxId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка при получении писем');
      }
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setMessages(data);
        setLastUpdate(new Date());
        console.log('Почта обновлена:', new Date().toLocaleTimeString()); // Добавляем лог для отладки
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error('Ошибка при получении писем:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Эффект для автоматического обновления
  useEffect(() => {
    let intervalId = null;

    const startPolling = () => {
      // Первоначальная проверка
      checkEmails();
      
      // Установка интервала
      intervalId = setInterval(checkEmails, 15000);
      console.log('Интервал обновления запущен'); // Добавляем лог для отладки
    };

    if (mailboxId) {
      startPolling();
    }

    // Очистка при размонтировании или изменении mailboxId
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log('Интервал обновления остановлен'); // Добавляем лог для отладки
      }
    };
  }, [mailboxId]); // Зависимость от mailboxId

  const createMailbox = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/email`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при создании почтового ящика');
      }
      
      const data = await response.json();
      setMailbox(data.address);
      setMailboxId(data.mailboxId);
      setMessages([]);
      setSelectedMessage(null);
      console.log('Создан новый почтовый ящик:', data.mailboxId); // Добавляем лог для отладки
    } catch (error) {
      setNotification(error.message);
      console.error('Ошибка при создании почтового ящика:', error);
    } finally {
      setLoading(false);
    }
  };

  const readMessage = async (id) => {
    if (!mailboxId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/message/${mailboxId}/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка при чтении письма');
      }
      
      const messageData = await response.json();
      setSelectedMessage(messageData);
    } catch (error) {
      console.error('Ошибка при чтении письма:', error);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(mailbox);
      setNotification('Email скопирован');
    } catch (error) {
      setNotification('Ошибка при копировании');
    }
  };

  const downloadMessageAsTxt = () => {
    if (!selectedMessage) return;

    const content = `От: ${selectedMessage.from || 'Неизвестный отправитель'}
Тема: ${selectedMessage.subject || ''}
Дата: ${new Date(selectedMessage.receivedAt).toLocaleString()}

${selectedMessage.text || selectedMessage.html?.replace(/<[^>]+>/g, '') || ''}`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-${selectedMessage.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-left">
            <button className="icon-button create-button" onClick={createMailbox}>
              <span className="icon">✨</span>
            </button>
            <div className="mailbox-info">
              <div className="mailbox-main">
                {mailbox ? (
                  <div className="mailbox-address-container">
                    <span className="mailbox-address">{mailbox}</span>
                    <button 
                      className="copy-button"
                      onClick={copyToClipboard}
                      title="Копировать адрес"
                    >
                      <svg width="50" height="50" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M8 4v12h12V4H8zm11 11H9V5h10v10zm-3-14H4v12h2V3h10V2z" fill="currentColor"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <span className="mailbox-placeholder">Нажмите ✨ для создания почтового ящика</span>
                )}
                {mailbox && lastUpdate && (
                  <div className="update-indicator" title={`Последнее обновление: ${lastUpdate.toLocaleTimeString()}`}>
                    <span className="update-dot"></span>
                    <span className="update-text">live</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="header-right">
            <button 
              className="icon-button" 
              onClick={() => checkEmails()} 
              disabled={!mailbox}
              title="Обновить"
            >
              <span className="icon">↻</span>
            </button>
            <button 
              className="icon-button theme-toggle" 
              onClick={toggleTheme}
              title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
            >
              <span className="icon">{theme === 'light' ? '🌙' : '☀️'}</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className="App-main">
        <div 
          className="email-container" 
          ref={emailContainerRef}
        >
          {loading && <div className="no-messages">Загрузка...</div>}
          {!loading && messages.length === 0 && (
            <div className="no-messages">Писем пока нет...</div>
          )}
          {!loading && messages.length > 0 && (
            <div className="messages-list">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`message-item ${selectedMessage?.id === message.id ? 'selected' : ''}`}
                  onClick={() => readMessage(message.id)}
                >
                  <div className="message-header">
                    <span className="from">{message.from || 'Неизвестный отправитель'}</span>
                    <span className="subject">{message.subject}</span>
                    <span className="date">
                      {new Date(message.receivedAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div 
          className="resize-handle"
          ref={resizeHandleRef}
          onMouseDown={handleResizeStart}
        />

        <div className="message-content">
          {!selectedMessage && (
            <div className="no-messages">Выберите письмо для просмотра</div>
          )}
          {selectedMessage && (
            <div className="message-body">
              <div className="message-details">
                <div className="message-details-header">
                  <div>
                    <p><strong>От:</strong> {selectedMessage.from || 'Неизвестный отправитель'}</p>
                    <p><strong>Тема:</strong> {selectedMessage.subject || ''}</p>
                    <p><strong>Дата:</strong> {new Date(selectedMessage.receivedAt).toLocaleString()}</p>
                  </div>
                  <button 
                    className="download-button"
                    onClick={downloadMessageAsTxt}
                    title="Скачать в формате TXT"
                  >
                    📄
                  </button>
                </div>
              </div>
              <div className="message-text" dangerouslySetInnerHTML={{ __html: selectedMessage.html || selectedMessage.text || '' }} />
            </div>
          )}
        </div>
      </main>

      <footer className="App-footer">
        <div className="footer-content">
          <div className="footer-left">
            <p>GhostInbox © {new Date().getFullYear()}</p>
          </div>
          <div className="footer-center">
            <a href={API_DOCS_URL} target="_blank" rel="noopener noreferrer" className="api-link">
              <span className="api-icon">⚡</span>
              API
            </a>
          </div>
          <div className="footer-right">
            {mailbox && (
              <div className="footer-stats">
                <span>Писем: {messages.length}</span>
              </div>
            )}
          </div>
        </div>
      </footer>

      {notification && (
        <Toast 
          message={notification} 
          onClose={() => setNotification('')} 
        />
      )}
    </div>
  );
}

export default App;
