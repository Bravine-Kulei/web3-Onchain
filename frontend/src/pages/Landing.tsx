import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Lock,
  Zap,
  FileText,
  Link as LinkIcon,
  Building2 } from
'lucide-react';
import { useRole, Role } from '../context/RoleContext';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
export function Landing() {
  const navigate = useNavigate();
  const { setRole } = useRole();
  const handleDemoLogin = (role: Role) => {
    setRole(role);
    switch (role) {
      case 'Student':
        navigate('/student/dashboard');
        break;
      case 'Registrar':
        navigate('/registrar/dashboard');
        break;
      case 'Verifier':
        navigate('/verifier/dashboard');
        break;
      case 'Admin':
        navigate('/admin/institutions');
        break;
    }
  };
  const handleComingSoon = (feature: string) => {
    toast.info(`${feature} coming soon`, {
      description: 'This feature is not available in the current prototype.'
    });
  };
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="h-20 border-b border-slate-100 flex items-center justify-between px-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-blue-900">
          <ShieldCheck className="w-8 h-8 text-blue-700" />
          <span className="text-2xl font-bold tracking-tight">TransCrypt</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleComingSoon('About page')}
            className="text-slate-600 font-medium hover:text-slate-900">
            
            About Consortium
          </button>
          <button
            onClick={() => handleComingSoon('Wallet connection')}
            className="px-5 py-2.5 bg-blue-50 text-blue-700 rounded-lg font-medium hover:bg-blue-100 transition-colors active:scale-95">
            
            Connect Wallet
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center max-w-6xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-8 border border-blue-100 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          Live on Consortium Mainnet
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center mb-20 text-left">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 tracking-tight mb-6 leading-tight">
              Verify academic transcripts in{' '}
              <span className="text-blue-700 relative inline-block">
                seconds
                <svg
                  className="absolute -bottom-2 left-0 w-full h-3 text-blue-200"
                  viewBox="0 0 100 10"
                  preserveAspectRatio="none">
                  
                  <path
                    d="M0 5 Q 50 10 100 5"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeLinecap="round" />
                  
                </svg>
              </span>
              , not weeks.
            </h1>

            <p className="text-xl text-slate-600 mb-8 max-w-lg">
              A secure, blockchain-anchored transfer platform for the Kenyan
              University Consortium. Instant verification, zero middlemen,
              absolute trust.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() =>
                document.getElementById('demo-section')?.scrollIntoView({
                  behavior: 'smooth'
                })
                }
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm active:scale-95 flex items-center justify-center gap-2">
                
                Try the Prototype <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleComingSoon('Whitepaper')}
                className="px-6 py-3 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors active:scale-95">
                
                Read the Whitepaper
              </button>
            </div>
          </div>

          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-transparent rounded-3xl transform rotate-3 scale-105 opacity-50"></div>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 relative z-10 transform -rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-green-600" />
                  <span className="font-semibold text-slate-900">
                    Verification Result
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium border border-green-200">
                  Verified
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-sm text-slate-500">Student</span>
                  <span className="text-sm font-medium text-slate-900">
                    Wanjiku Kamau
                  </span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-sm text-slate-500">Institution</span>
                  <span className="text-sm font-medium text-slate-900">
                    Kabarak University
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 mb-1 block">
                    Cryptographic Fingerprint
                  </span>
                  <div className="font-mono text-xs text-slate-600 bg-slate-100 p-2 rounded border border-slate-200 break-all">
                    0x8f2a9c3b1e4d...7f6a5b4c3d2e1f0
                  </div>
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-600 rounded-full opacity-10 blur-2xl"></div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-5xl mb-24">
          <h2 className="text-2xl font-bold text-slate-900 mb-12 text-center">
            Trust Architecture
          </h2>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-slate-200 z-0"></div>

            <div className="relative z-10 flex flex-col items-center text-center group">
              <div className="w-24 h-24 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:border-blue-500 group-hover:shadow-md transition-all">
                <FileText className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                1. Issue & Hash
              </h3>
              <p className="text-slate-600 text-sm">
                Registrar approves transfer. Document is hashed locally;
                original stays private.
              </p>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center group">
              <div className="w-24 h-24 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:border-blue-500 group-hover:shadow-md transition-all">
                <LinkIcon className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                2. Anchor on Ledger
              </h3>
              <p className="text-slate-600 text-sm">
                Cryptographic fingerprint is anchored to the consortium
                blockchain.
              </p>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center group">
              <div className="w-24 h-24 bg-white border-2 border-slate-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm group-hover:border-blue-500 group-hover:shadow-md transition-all">
                <CheckCircle2 className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                3. Instant Verify
              </h3>
              <p className="text-slate-600 text-sm">
                Receiver compares document hash against the immutable on-chain
                record.
              </p>
            </div>
          </div>
        </div>

        <div
          id="demo-section"
          className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 w-full max-w-4xl scroll-mt-24">
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Enter Interactive Prototype
            </h2>
            <p className="text-slate-600">
              Select a role to explore the platform from different perspectives.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <button
              onClick={() => handleDemoLogin('Student')}
              className="flex flex-col items-center p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group active:scale-95">
              
              <div className="w-16 h-16 rounded-full bg-slate-50 group-hover:bg-white group-hover:shadow-sm flex items-center justify-center mb-4 transition-all">
                <span className="text-2xl">🎓</span>
              </div>
              <span className="font-semibold text-slate-900">Student</span>
              <span className="text-xs text-slate-500 mt-1">
                Request & Track
              </span>
            </button>
            <button
              onClick={() => handleDemoLogin('Registrar')}
              className="flex flex-col items-center p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group active:scale-95">
              
              <div className="w-16 h-16 rounded-full bg-slate-50 group-hover:bg-white group-hover:shadow-sm flex items-center justify-center mb-4 transition-all">
                <span className="text-2xl">🏛️</span>
              </div>
              <span className="font-semibold text-slate-900">Registrar</span>
              <span className="text-xs text-slate-500 mt-1">
                Review & Issue
              </span>
            </button>
            <button
              onClick={() => handleDemoLogin('Verifier')}
              className="flex flex-col items-center p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group active:scale-95">
              
              <div className="w-16 h-16 rounded-full bg-slate-50 group-hover:bg-white group-hover:shadow-sm flex items-center justify-center mb-4 transition-all">
                <span className="text-2xl">✅</span>
              </div>
              <span className="font-semibold text-slate-900">Verifier</span>
              <span className="text-xs text-slate-500 mt-1">
                Check Authenticity
              </span>
            </button>
            <button
              onClick={() => handleDemoLogin('Admin')}
              className="flex flex-col items-center p-6 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group active:scale-95">
              
              <div className="w-16 h-16 rounded-full bg-slate-50 group-hover:bg-white group-hover:shadow-sm flex items-center justify-center mb-4 transition-all">
                <span className="text-2xl">⚙️</span>
              </div>
              <span className="font-semibold text-slate-900">Admin</span>
              <span className="text-xs text-slate-500 mt-1">
                Manage Network
              </span>
            </button>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-100 bg-slate-50 py-12 mt-auto">
        <div className="max-w-6xl mx-auto px-8 text-center">
          <p className="text-sm font-medium text-slate-500 mb-6 uppercase tracking-wider">
            Trusted by Consortium Members
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2 font-serif font-bold text-slate-800 text-lg">
              <Building2 className="w-6 h-6" /> Kabarak
            </div>
            <div className="flex items-center gap-2 font-serif font-bold text-slate-800 text-lg">
              <Building2 className="w-6 h-6" /> Laikipia
            </div>
            <div className="flex items-center gap-2 font-serif font-bold text-slate-800 text-lg">
              <Building2 className="w-6 h-6" /> Mt. Kenya
            </div>
            <div className="flex items-center gap-2 font-serif font-bold text-slate-800 text-lg">
              <Building2 className="w-6 h-6" /> Egerton
            </div>
          </div>
        </div>
      </footer>
    </div>);

}