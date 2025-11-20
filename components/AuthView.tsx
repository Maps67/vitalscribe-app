import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { MedicalDataService } from '../services/supabaseService';

interface AuthViewProps {
  onLoginSuccess: () => void;
  authService: MedicalDataService;
}

const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess, authService }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: authError } = isLogin 
        ? await authService.signIn(email, password)
        : await authService.signUp(email, password);

      if (authError) {
        setError(authError.message);
      } else {
        if (!isLogin) {
          alert("Registro exitoso. Por favor inicia sesión.");
          setIsLogin(true);
        } else {
          onLoginSuccess();
        }
      }
    } catch (err) {
      setError("Ocurrió un error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-brand-teal"></div>
          <div className="relative z-10">
            <div className="w-12 h-12 bg-brand-teal rounded-xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-4 shadow-lg shadow-teal-500/30">
              M
            </div>
            <h2 className="text-2xl font-bold text-white">MediScribe AI</h2>
            <p className="text-slate-400 text-sm mt-2">Acceso Seguro para Profesionales</p>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleAuth} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Email Profesional</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal focus:outline-none"
                  placeholder="dr.ejemplo@hospital.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-teal focus:outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-brand-teal text-white py-3 rounded-lg font-semibold hover:bg-teal-600 transition-all shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrar Cuenta')}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500">
              {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-brand-teal font-semibold hover:underline"
              >
                {isLogin ? "Regístrate aquí" : "Inicia sesión"}
              </button>
            </p>
          </div>
          
          <div className="mt-8 flex justify-center gap-4 text-xs text-slate-400">
             <span className="flex items-center gap-1"><ShieldCheck size={12} /> HIPAA Ready</span>
             <span className="flex items-center gap-1"><Lock size={12} /> RLS Enabled</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;