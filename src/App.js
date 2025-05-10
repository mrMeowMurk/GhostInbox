import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';

function App() {
  const [mailbox, setMailbox] = useState('');
  const [mailboxId, setMailboxId] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  
  const emailContainerRef = useRef(null);
  const resizeHandleRef = useRef(null);
  const currentWidthRef = useRef(300);
  const pollingIntervalRef = useRef(null);

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

  const createMailbox = async () => {
    try {
      setError('');
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

      // Запускаем опрос сообщений
      startPolling(data.address, data.mailboxId);
    } catch (error) {
      setError(error.message);
      console.error('Ошибка при создании почтового ящика:', error);
    } finally {
      setLoading(false);
    }
  };

  const startPolling = (address, id) => {
    // Очищаем предыдущий интервал
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Устанавливаем новый интервал
    pollingIntervalRef.current = setInterval(() => {
      if (id) {
        checkEmails(address);
      }
    }, 5000);
  };

  const checkEmails = async (address = mailbox) => {
    if (!mailboxId) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/messages/${mailboxId}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка при получении писем');
      }
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setMessages(data);
      } else {
        setMessages([]);
      }
    } catch (error) {
      setError(error.message);
      console.error('Ошибка при получении писем:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const readMessage = async (id) => {
    if (!mailboxId) return;

    try {
      setError('');
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/message/${mailboxId}/${id}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Ошибка при чтении письма');
      }
      
      const messageData = await response.json();
      setSelectedMessage({
        id: messageData.id,
        from: messageData.from,
        subject: messageData.subject,
        receivedAt: messageData.receivedAt,
        html: messageData.content
      });
    } catch (error) {
      setError(error.message);
      console.error('Ошибка при чтении письма:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(mailbox);
      setError('Email скопирован');
      setTimeout(() => setError(''), 2000);
    } catch (error) {
      setError('Ошибка при копировании');
    }
  };

  useEffect(() => {
    // Очищаем интервал при размонтировании компонента
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <div className="header-left">
            <button className="icon-button" onClick={createMailbox}>
              ✨
            </button>
            <span>{mailbox || 'Нажмите ✨ для создания почтового ящика'}</span>
          </div>
          <div className="header-right">
            <button className="icon-button" onClick={copyToClipboard} disabled={!mailbox}>
              📋
            </button>
            <button className="icon-button" onClick={() => checkEmails()} disabled={!mailbox}>
              ↻
            </button>
            <button className="theme-toggle" onClick={toggleTheme}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </div>
        {error && <div className="error-message">{error}</div>}
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
                    <span className="from">{message.from}</span>
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
                <p><strong>От:</strong> {selectedMessage.from}</p>
                <p><strong>Тема:</strong> {selectedMessage.subject}</p>
                <p><strong>Дата:</strong> {new Date(selectedMessage.receivedAt).toLocaleString()}</p>
              </div>
              <div className="message-text" dangerouslySetInnerHTML={{ __html: selectedMessage.html }} />
            </div>
          )}
        </div>
      </main>

      <footer className="App-footer">
        <p>Временная почта - {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
