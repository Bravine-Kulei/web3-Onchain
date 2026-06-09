import React from 'react';
import { useRole, Role } from '../../context/RoleContext';
import { WalletChip } from './WalletChip';
import {
  ShieldCheck,
  ChevronDown,
  User,
  GraduationCap,
  Building,
  CheckCircle2,
  Settings } from
'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
export function TopBar() {
  const { role, setRole } = useRole();
  const navigate = useNavigate();
  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as Role;
    setRole(newRole);
    navigate('/');
  };
  const handleUserMenu = () => {
    toast.info('User Menu', {
      description: 'Profile and settings would open here.'
    });
  };
  const RoleIcon = () => {
    switch (role) {
      case 'Student':
        return <GraduationCap className="w-4 h-4 text-blue-600" />;
      case 'Registrar':
        return <Building className="w-4 h-4 text-blue-600" />;
      case 'Verifier':
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      case 'Admin':
        return <Settings className="w-4 h-4 text-blue-600" />;
      default:
        return <User className="w-4 h-4 text-blue-600" />;
    }
  };
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-8">
        <Link
          to="/"
          className="flex items-center gap-2 text-blue-900 hover:opacity-80 transition-opacity">
          
          <ShieldCheck className="w-7 h-7 text-blue-700" />
          <span className="text-xl font-bold tracking-tight">TransCrypt</span>
        </Link>

        <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors group">
          <RoleIcon />
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider ml-1">
            View As:
          </span>
          <select
            value={role}
            onChange={handleRoleChange}
            className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-4 relative z-10">
            
            <option value="Student">Student</option>
            <option value="Registrar">Registrar</option>
            <option value="Verifier">Verifier</option>
            <option value="Admin">Admin</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 -ml-4 group-hover:text-blue-500 transition-colors" />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <WalletChip />
        <div className="w-px h-6 bg-slate-200 mx-1"></div>
        <button
          onClick={handleUserMenu}
          className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-lg transition-colors active:scale-95">
          
          <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-700">
            <RoleIcon />
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </header>);

}