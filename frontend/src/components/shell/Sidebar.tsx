import React from 'react';
import { NavLink } from 'react-router-dom';
import { useRole } from '../../context/RoleContext';
import {
  LayoutDashboard,
  Send,
  FileText,
  CheckCircle2,
  History,
  Building2,
  Network,
  ActivitySquare } from
'lucide-react';
import { toast } from 'sonner';
export function Sidebar() {
  const { role } = useRole();
  const navItems = {
    Student: [
    {
      path: '/student/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      path: '/student/new-transfer',
      label: 'Request Transfer',
      icon: Send
    }],

    Registrar: [
    {
      path: '/registrar/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      path: '/registrar/issued',
      label: 'Issued Transcripts',
      icon: FileText
    }],

    Verifier: [
    {
      path: '/verifier/dashboard',
      label: 'Verify Transcript',
      icon: CheckCircle2
    },
    {
      path: '/verifier/history',
      label: 'Verification History',
      icon: History
    }],

    Admin: [
    {
      path: '/admin/institutions',
      label: 'Member Institutions',
      icon: Building2
    },
    {
      path: '/admin/network',
      label: 'Network & Nodes',
      icon: Network
    },
    {
      path: '/admin/audit-log',
      label: 'Audit Log',
      icon: ActivitySquare
    }]

  };
  const items = navItems[role] || [];
  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-4rem)] sticky top-16 flex flex-col">
      <div className="p-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-3">
          {role} Menu
        </div>
        <nav className="space-y-1.5">
          {items.map((item) =>
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative
                ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
              `}>
            
              {({ isActive }) =>
            <>
                  {isActive &&
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
              }
                  <item.icon
                className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
              
                  {item.label}
                </>
            }
            </NavLink>
          )}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-slate-100">
        <div
          onClick={() =>
          toast.success('Network Status: Healthy', {
            description:
            'Connected to consortium mainnet. All nodes syncing.'
          })
          }
          className="bg-slate-50 rounded-lg p-3 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
          
          <div className="text-xs font-medium text-slate-500 mb-1">
            Network Status
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-700">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            Mainnet Connected
          </div>
        </div>
      </div>
    </aside>);

}