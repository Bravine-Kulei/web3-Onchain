import { Link, Outlet } from 'react-router-dom'
import { ShieldAlert, Loader2 } from 'lucide-react'
import { useAccount } from 'wagmi'
import { useWalletRole } from '../../web3/useWalletRole'
import { useRole, type Role } from '../../context/RoleContext'
import { WalletChip } from '../shell/WalletChip'

interface RoleGuardProps {
  allow: Role[]
}

function AccessDenied({
  title,
  description,
  hint,
}: {
  title: string
  description: string
  hint?: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mb-6">
        <ShieldAlert className="w-8 h-8 text-amber-600" />
      </div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">{title}</h1>
      <p className="text-slate-600 text-center max-w-md mb-2">{description}</p>
      {hint && (
        <p className="text-sm text-slate-500 text-center max-w-md mb-6">{hint}</p>
      )}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <WalletChip />
        <Link
          to="/"
          className="px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}

export function RoleGuard({ allow }: RoleGuardProps) {
  const { role: demoRole } = useRole()
  const { isConnected } = useAccount()
  const { isIssuer, isAdmin, isLoading, institutionName } = useWalletRole()

  if (!allow.includes(demoRole)) {
    return (
      <AccessDenied
        title="Wrong role view"
        description={`Switch to one of: ${allow.join(', ')} in the top bar to access this section.`}
        hint={`You are currently viewing as ${demoRole}.`}
      />
    )
  }

  if (allow.includes('Registrar') && demoRole === 'Registrar') {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )
    }
    if (!isConnected) {
      return (
        <AccessDenied
          title="Wallet required"
          description="Connect an authorized issuer wallet to access registrar tools."
          hint="For local demo: import Hardhat Account #1 (Kabarak University)."
        />
      )
    }
    if (!isIssuer) {
      return (
        <AccessDenied
          title="Not an authorized issuer"
          description="Your connected wallet is not registered as an issuer on the consortium ledger."
          hint={
            institutionName
              ? `Connected as ${institutionName}, which lacks issuer permissions.`
              : 'Switch to an issuer institution wallet.'
          }
        />
      )
    }
  }

  if (allow.includes('Admin') && demoRole === 'Admin') {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      )
    }
    if (!isConnected) {
      return (
        <AccessDenied
          title="Wallet required"
          description="Connect the consortium admin wallet to manage institutions and view the audit log."
          hint="For local demo: import Hardhat Account #0 (deployer / admin)."
        />
      )
    }
    if (!isAdmin) {
      return (
        <AccessDenied
          title="Admin access required"
          description="Only the consortium admin wallet can access this section."
        />
      )
    }
  }

  return <Outlet />
}
