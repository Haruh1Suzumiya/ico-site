import { createContext } from 'react'

interface AuthContextType {
  user: any;
  setUser: (user: any) => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
})
