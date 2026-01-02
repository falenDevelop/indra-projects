import React, { useState } from 'react';
import { AuthContext } from './AuthContextContext';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    // Inicializar el estado con el valor de localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (error) {
        console.error('Error loading user from localStorage:', error);
        localStorage.removeItem('currentUser');
        return null;
      }
    }
    return null;
  });

  const login = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const isLiderTecnico = () => {
    return currentUser?.perfil === 'Lider Tecnico';
  };

  // Considerar usuario focal
  const isFocal = currentUser?.isFocal === true;

  const hasAccess = (menuId) => {
    if (!currentUser) return false;

    // Lider Tecnico tiene acceso a todo
    if (isLiderTecnico()) return true;

    // QA tiene acceso a defectos además de reporte/tracking
    if (currentUser?.perfil === 'QA') {
      return (
        menuId === 'reporte' || menuId === 'tracking' || menuId === 'defectos'
      );
    }

    // Focal puede ver reporte, tracking y features (modulos)
    if (isFocal) {
      return (
        menuId === 'reporte' || menuId === 'tracking' || menuId === 'modulos'
      );
    }

    // Otros perfiles solo tienen acceso a Reporte y Tracking
    return menuId === 'reporte' || menuId === 'tracking';
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        login,
        logout,
        isLiderTecnico,
        hasAccess,
        loading: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// El hook useAuth está en useAuth.js
