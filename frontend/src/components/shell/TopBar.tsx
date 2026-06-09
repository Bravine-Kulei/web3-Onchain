import React from 'react'
import { useRole, Role } from '../../context/RoleContext'
import { WalletChip } from './WalletChip'
import {
  ShieldCheck, ChevronDown, User, GraduationCap,
  Building, CheckCircle2, Settings, AlertTriangle,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'
import { useWalletRole } from '../../web3/useWalletRole'

const ROLE_ICONS: Record<Role, React.ReactNode> = {
  Student: <GraduationCap className="w-4 h-4 text-blue-600" />,
  Registrar: <Building className="w-4 h-4 text-blue-600" />,
  Verifier: <CheckCircle2 className="w-4 h-4 text-blue-600" />,
  Admin: <Settings className="w-4 h-4 text-blue-600" />,
}

const ON_CHAIN_TO_DEMO: Record<string, Role> = {
  Issuer: 'Registrar',
  Verifier: 'Verifier',
  Both: 'Registrar',
  Admin: 'Admin',
  None: 'Student',
}

export function TopBar() {
  const { role, setRole } = useRole()
  const navigate = useNavigate()
  const { isConnected } = useAccount()
  const { role: onChainRole, institutionName, isLoading } = useWalletRole()

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as Role
    setRole(newRole)
    navigate('/')
  }

  const detectedRole = isConnected && !isLoading ? ON_CHAIN_TO_DEMO[onChainRole] : null
  const roleMismatch = detectedRole && detectedRole !== role && role !== 'Student'

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 text-blue-900 hover:opacity-80 transition-opacity">
          <ShieldCheck className="w-7 h-7 text-blue-700" />
          <span className="text-xl font-bold tracking-tight">TransCrypt</span>
        </Link>

        <div className="hidden md:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors group">
          {ROLE_ICONS[role] ?? <User className="w-4 h-4 text-blue-600" />}
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider ml-1">View As:</span>
          <select
            value={role}
            onChange={handleRoleChange}
            className="bg-transparent text-sm font-semibold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-4"
          >
            <option value="Student">Student</option>
            <option value="Registrar">Registrar</option>
            <option value="Verifier">Verifier</option>
            <option value="Admin">Admin</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 -ml-4 group-hover:text-blue-500 transition-colors" />
        </div>

        {/* On-chain role badge */}
        {isConnected && !isLoading && onChainRole !== 'None' && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-lg text-xs font-medium text-green-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {institutionName || onChainRole} on-chain
          </div>
        )}

        {/* Role mismatch warning */}
        {roleMismatch && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            <AlertTriangle className="w-3.5 h-3.5" />
            Your wallet is registered as {detectedRole}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <WalletChip />
        <div className="w-px h-6 bg-slate-200" />
        <div className="w-8 h-8 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-700">
          {ROLE_ICONS[role] ?? <User className="w-4 h-4 text-blue-600" />}
        </div>
      </div>
    </header>
  )
}
