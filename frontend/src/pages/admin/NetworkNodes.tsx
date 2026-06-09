import React from 'react';
import { Activity, Server, Cpu, Clock, Shield } from 'lucide-react';
import { UNIVERSITIES } from '../../data/mockData';
import { motion } from 'framer-motion';
export function NetworkNodes() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Network & Nodes</h1>
          <p className="text-slate-600 mt-1">
            Consortium blockchain network health and consensus status.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 text-sm font-medium shadow-sm">
          <Shield className="w-4 h-4" />
          Consensus: QBFT
        </div>
      </div>

      {/* Animated Network Topology Illustration */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center min-h-[350px] relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900 via-transparent to-transparent"></div>

        <div className="relative w-72 h-72">
          {/* Connecting Lines */}
          <svg
            className="absolute inset-0 w-full h-full text-slate-200"
            style={{
              zIndex: 0
            }}>
            
            <motion.line
              x1="36"
              y1="144"
              x2="144"
              y2="36"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 4"
              animate={{
                strokeDashoffset: [0, -20]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear'
              }} />
            
            <line
              x1="144"
              y1="36"
              x2="252"
              y2="144"
              stroke="currentColor"
              strokeWidth="2" />
            
            <line
              x1="252"
              y1="144"
              x2="144"
              y2="252"
              stroke="currentColor"
              strokeWidth="2" />
            
            <line
              x1="144"
              y1="252"
              x2="36"
              y2="144"
              stroke="currentColor"
              strokeWidth="2" />
            
            <motion.line
              x1="36"
              y1="144"
              x2="252"
              y2="144"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="4 4"
              animate={{
                strokeDashoffset: [0, 20]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear'
              }} />
            
            <line
              x1="144"
              y1="36"
              x2="144"
              y2="252"
              stroke="currentColor"
              strokeWidth="2" />
            

            {/* Data flow dots */}
            <motion.circle
              r="3"
              fill="#3b82f6"
              animate={{
                cx: [144, 252],
                cy: [36, 144]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear'
              }} />
            
            <motion.circle
              r="3"
              fill="#3b82f6"
              animate={{
                cx: [252, 144],
                cy: [144, 252]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
                delay: 0.5
              }} />
            
            <motion.circle
              r="3"
              fill="#3b82f6"
              animate={{
                cx: [144, 36],
                cy: [252, 144]
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'linear',
                delay: 1
              }} />
            
          </svg>

          {/* Nodes */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
            <div className="relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40"></span>
              <div className="w-14 h-14 bg-white border-4 border-green-500 rounded-full flex items-center justify-center shadow-lg relative z-10">
                <Server className="w-6 h-6 text-slate-700" />
              </div>
            </div>
            <span className="text-xs font-semibold mt-2 bg-white px-2.5 py-1 rounded-md shadow-sm border border-slate-200 text-slate-800">
              Kabarak
            </span>
          </div>

          <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
            <div className="relative">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40"
                style={{
                  animationDelay: '0.5s'
                }}>
              </span>
              <div className="w-14 h-14 bg-white border-4 border-green-500 rounded-full flex items-center justify-center shadow-lg relative z-10">
                <Server className="w-6 h-6 text-slate-700" />
              </div>
            </div>
            <span className="text-xs font-semibold mt-2 bg-white px-2.5 py-1 rounded-md shadow-sm border border-slate-200 text-slate-800">
              Laikipia
            </span>
          </div>

          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10 flex flex-col items-center">
            <div className="relative">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-40"
                style={{
                  animationDelay: '1s'
                }}>
              </span>
              <div className="w-14 h-14 bg-white border-4 border-green-500 rounded-full flex items-center justify-center shadow-lg relative z-10">
                <Server className="w-6 h-6 text-slate-700" />
              </div>
            </div>
            <span className="text-xs font-semibold mt-2 bg-white px-2.5 py-1 rounded-md shadow-sm border border-slate-200 text-slate-800">
              Egerton
            </span>
          </div>

          <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
            <div className="w-14 h-14 bg-white border-4 border-amber-500 rounded-full flex items-center justify-center shadow-lg relative z-10">
              <Server className="w-6 h-6 text-slate-700" />
            </div>
            <span className="text-xs font-semibold mt-2 bg-white px-2.5 py-1 rounded-md shadow-sm border border-slate-200 text-slate-800">
              Mt. Kenya
            </span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {UNIVERSITIES.map((uni) =>
        <div
          key={uni.id}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
          
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${uni.status === 'Online' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                
                  <Server className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">
                    {uni.name} Node
                  </h3>
                  <div className="flex items-center gap-2 text-sm mt-1">
                    <div className="relative flex h-2.5 w-2.5">
                      {uni.status === 'Online' &&
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    }
                      <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${uni.status === 'Online' ? 'bg-green-500' : 'bg-amber-500'}`}>
                    </span>
                    </div>
                    <span
                    className={`font-medium ${uni.status === 'Online' ? 'text-green-700' : 'text-amber-700'}`}>
                    
                      {uni.status}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-200">
                v1.4.2
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-500" /> Latest Block
                </div>
                <div className="font-mono text-base text-slate-900 font-medium">
                  14,529,001
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="text-xs font-medium text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-purple-500" /> Peers Connected
                </div>
                <div className="font-medium text-base text-slate-900">
                  {uni.status === 'Online' ? '3 / 3' : '1 / 3'}
                </div>
              </div>
              <div className="col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">
                    Last Seen
                  </span>
                </div>
                <div className="font-medium text-sm text-slate-900">
                  Just now
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>);

}