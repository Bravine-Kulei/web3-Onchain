import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
export type LifecycleStage =
'Requested' |
'Under Review' |
'Approved' |
'Anchored' |
'Available' |
'Verified';
const STAGES: LifecycleStage[] = [
'Requested',
'Under Review',
'Approved',
'Anchored',
'Available',
'Verified'];

interface LifecycleStepperProps {
  currentStage: LifecycleStage;
  history?: {
    stage: string;
    timestamp: string;
  }[];
}
export function LifecycleStepper({
  currentStage,
  history = []
}: LifecycleStepperProps) {
  const currentIndex = STAGES.indexOf(currentStage);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const getTimestamp = (stage: string) => {
    const record = history.find((h) => h.stage === stage);
    if (!record) return null;
    return new Date(record.timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-between relative">
        {/* Background Track */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0"></div>

        {/* Active Track */}
        <motion.div
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full z-0"
          initial={{
            width: '0%'
          }}
          animate={{
            width: mounted ?
            `${Math.max(0, currentIndex) / (STAGES.length - 1) * 100}%` :
            '0%'
          }}
          transition={{
            duration: 0.8,
            ease: 'easeInOut',
            delay: 0.2
          }}>
        </motion.div>

        {STAGES.map((stage, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const timestamp = getTimestamp(stage);
          return (
            <div
              key={stage}
              className="relative z-10 flex flex-col items-center group">
              
              <div className="relative">
                {isCurrent &&
                <motion.div
                  className="absolute inset-0 rounded-full bg-blue-400 opacity-20"
                  animate={{
                    scale: [1, 1.5, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }} />

                }
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors duration-500 bg-white relative z-10
                    ${isCompleted ? 'border-blue-600 text-blue-600' : 'border-slate-300 text-slate-300'}
                    ${isCurrent ? 'ring-4 ring-blue-100 shadow-sm' : ''}
                  `}
                  initial={false}
                  animate={{
                    backgroundColor: isCompleted ?
                    isCurrent ?
                    '#ffffff' :
                    '#2563EB' :
                    '#ffffff',
                    color: isCompleted ?
                    isCurrent ?
                    '#2563EB' :
                    '#ffffff' :
                    '#cbd5e1',
                    scale: isCurrent ? 1.1 : 1
                  }}
                  transition={{
                    duration: 0.3
                  }}>
                  
                  {isCompleted && !isCurrent ?
                  <Check className="w-4 h-4" /> :

                  <span className="text-sm font-medium">{index + 1}</span>
                  }
                </motion.div>
              </div>
              <div className="absolute top-12 flex flex-col items-center w-24 sm:w-32 text-center">
                <span
                  className={`text-xs font-medium transition-colors duration-300 ${isCompleted ? 'text-slate-900' : 'text-slate-400'}`}>
                  
                  {stage}
                </span>
                {timestamp &&
                <span className="text-[10px] text-slate-500 mt-1 leading-tight hidden sm:block">
                    {timestamp}
                  </span>
                }
              </div>
            </div>);

        })}
      </div>
    </div>);

}