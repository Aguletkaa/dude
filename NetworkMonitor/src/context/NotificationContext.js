// src/context/NotificationContext.js
import React, { createContext, useState, useContext, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setNotifications(prev => [
      { id, ...notification, timestamp: new Date() },
      ...prev,
    ]);
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, dismissNotification, dismissAll }}>
      {children}
    </NotificationContext.Provider>
  );
};
