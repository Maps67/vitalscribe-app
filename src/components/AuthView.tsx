import React, { useState } from 'react';
import { Mail, Lock, Activity, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase'; // Usamos la conexión directa

interface AuthViewProps {
  authService?: any; // Lo dejamos opcional para compatibilidad
  onLoginSuccess: () => void;
}

const AuthView: React.FC<AuthViewProps> = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false); // Toggle para registro

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Lógica de Registro
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert("Registro exitoso. ¡Ya puedes iniciar sesión!");
        setIsSignUp(false); // Cambiar a login
      } else {
        // Lógica de Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // Si es exitoso, App.tsx detectará el cambio de sesión automáticamente
      }
    } catch (err: any) {
      console.error("Error de autenticación:", err);
      // Traducción básica de errores comunes
      if (err.message.includes("Invalid login")) setError("Correo o contraseña incorrectos.");
      else if (err.message.includes("Email not confirmed")) setError("Verifica tu correo electrónico.");
      else setError(err.message || "Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-teal mb-4 shadow-lg shadow-teal-900/50">
            <span className="text-3xl font-bold text-white">M</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">MediScribe AI</h1>
          <p className="text-slate-400 text-sm">Acceso Seguro para Profesionales</p>
        </div>

        {/* Form */}
        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm animate-pulse">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Profesional</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input 
                  type="email" 
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none transition-all text-slate-700"
                  placeholder="doctor@clinica.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} />
                <input 
                  type="password" 
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal focus:border-transparent outline-none transition-all text-slate-700"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-brand-teal hover:bg-teal-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Activity className="animate-spin" /> : <>{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'} <ArrowRight size={20} /></>}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => { setError(null); setIsSignUp(!isSignUp); }}
              className="text-sm text-slate-500 hover:text-brand-teal font-medium transition-colors"
            >
              {isSignUp ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>

          <div className="mt-8 flex justify-center gap-4 text-[10px] text-slate-300 uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1"><ShieldCheck size={10}/> HIPAA Ready</span>
            <span className="flex items-center gap-1"><Lock size={10}/> RLS Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Iconos auxiliares para que no falle el build si faltan imports
const ShieldCheck = ({ size, className }: any) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
);

export default AuthView;