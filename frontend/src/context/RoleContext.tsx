import React, { useEffect, useState, createContext, useContext } from 'react';
export type Role = 'Student' | 'Registrar' | 'Verifier' | 'Admin';
interface RoleContextType {
  role: Role;
  setRole: (role: Role) => void;
}
const RoleContext = createContext<RoleContextType | undefined>(undefined);
export const RoleProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [role, setRoleState] = useState<Role>('Student');
  useEffect(() => {
    const savedRole = localStorage.getItem('transcrypt_role') as Role;
    if (
    savedRole &&
    ['Student', 'Registrar', 'Verifier', 'Admin'].includes(savedRole))
    {
      setRoleState(savedRole);
    }
  }, []);
  const setRole = (newRole: Role) => {
    setRoleState(newRole);
    localStorage.setItem('transcrypt_role', newRole);
  };
  return (
    <RoleContext.Provider
      value={{
        role,
        setRole
      }}>
      
      {children}
    </RoleContext.Provider>);

};
export const useRole = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};