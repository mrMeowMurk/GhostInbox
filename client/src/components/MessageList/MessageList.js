import React from 'react';
import './MessageList.css';

const MessageList = ({ messages, selectedMessage, onMessageSelect, loading }) => {
  if (loading) {
    return <div className="no-messages">Загрузка...</div>;
  }

  if (messages.length === 0) {
    return <div className="no-messages">Писем пока нет...</div>;
  }

  return (
    <div className="messages-list">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`message-item ${selectedMessage?.id === message.id ? 'selected' : ''}`}
          onClick={() => onMessageSelect(message.id)}
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
  );
};

export default MessageList; 