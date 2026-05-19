import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }
  
  componentDidCatch(error: any, errorInfo: any) { 
    console.error("Kinetix App Error:", error, errorInfo); 
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center text-slate-900">
          <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
            <AlertCircle size={40} />
          </div>
          <h1 className="text-2xl font-bold mb-2">Algo salió mal</h1>
          <p className="text-slate-500 mb-8 max-w-sm">La aplicación se detuvo inesperadamente. Por favor intenta recargar la página.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
          >
            Recargar Aplicación
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
