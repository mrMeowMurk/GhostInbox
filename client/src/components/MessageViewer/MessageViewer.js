import React from 'react';
import './MessageViewer.css';

const MessageViewer = ({ message, onDownload }) => {
  if (!message) {
    return <div className="no-messages">Выберите письмо для просмотра</div>;
  }

  return (
    <div className="message-body">
      <div className="message-details">
        <div className="message-details-header">
          <div>
            <p><strong>От:</strong> {message.from || 'Неизвестный отправитель'}</p>
            <p><strong>Тема:</strong> {message.subject || ''}</p>
            <p><strong>Дата:</strong> {new Date(message.receivedAt).toLocaleString()}</p>
          </div>
          <button 
            className="download-button"
            onClick={onDownload}
            title="Скачать в формате TXT"
          >
            📄
          </button>
        </div>
      </div>
      <div 
        className="message-text" 
        dangerouslySetInnerHTML={{ __html: message.html || message.text || '' }} 
      />
    </div>
  );
};

export default MessageViewer; 