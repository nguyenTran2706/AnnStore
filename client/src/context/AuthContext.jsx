import { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../services/api';
import { TOKEN_KEY } from '../services/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const init = async () => {
      if (localStorage.getItem(TOKEN_KEY)) {
        try {
          const { user: current } = await api.me();
          setUser(current);
        } catch {
          localStorage.removeItem(TOKEN_KEY);
        }
      }
      setInitializing(false);
    };
    init();
  }, []);

  const login = async (email, password) => {
    const { token, user: loggedIn } = await api.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(loggedIn);
    return loggedIn;
  };

  const register = async (name, email, password) => {
    const { token, user: created } = await api.register(name, email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setUser(created);
    return created;
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
