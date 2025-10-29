'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

interface AlertsTickerProps {
  alerts: Array<{
    id: number;
    message: string;
    severity: 'info' | 'warning' | 'error';
  }>;
}

export function AlertsTicker({ alerts }: AlertsTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (alerts.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % alerts.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [alerts.length]);

  if (!alerts || alerts.length === 0) {
    return (
      <div className="glass border border-green-500/50 bg-green-500/10 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <Info className="w-5 h-5 text-green-400" />
          <p className="text-sm sm:text-base font-medium text-white">All systems operational - no active alerts</p>
        </div>
      </div>
    );
  }

  const currentAlert = alerts[currentIndex];

  const getIcon = () => {
    switch (currentAlert.severity) {
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getBgColor = () => {
    switch (currentAlert.severity) {
      case 'error':
        return 'bg-red-500/10 border-red-500/50';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/50';
      default:
        return 'bg-blue-500/10 border-blue-500/50';
    }
  };

  return (
    <div className={`glass border ${getBgColor()} rounded-lg p-4 animate-pulse-slow`}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-medium text-white truncate">
            {currentAlert.message}
          </p>
        </div>
        <div className="flex space-x-1">
          {alerts.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex ? 'bg-blue-400 w-6' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
