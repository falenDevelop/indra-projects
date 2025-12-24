import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

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

  const hasAccess = (menuId) => {
    if (!currentUser) return false;

    // Lider Tecnico tiene acceso a todo
    if (isLiderTecnico()) return true;

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

// Hook personalizado para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
