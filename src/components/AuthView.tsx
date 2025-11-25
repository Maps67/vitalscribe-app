import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, Stethoscope, ArrowRight, AlertCircle, BadgeCheck, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface AuthProps {
  authService: any;
  onLoginSuccess: () => void;
  // Props para comunicación con App.tsx
  forceResetMode?: boolean;
  onPasswordResetSuccess?: () => void;
}

const AuthView: React.FC<AuthProps> = ({ 
  authService, 
  onLoginSuccess, 
  forceResetMode = false, 
  onPasswordResetSuccess 
}) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(forceResetMode); 
  
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    newPassword: '',
    fullName: '',
    specialty: 'Medicina General',
    licenseNumber: '', 
    termsAccepted: false 
  });

  // Detectar cambios desde el padre (App.tsx)
  useEffect(() => {
    if (forceResetMode) {
      setIsResettingPassword(true);
    }
  }, [forceResetMode]);

  // --- MANEJO DE LOGIN Y REGISTRO ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegistering && !formData.termsAccepted) {
        toast.error("Debe aceptar la verificación de su cédula profesional.");
        return;
    }
    setLoading(true);
    try {
      if (isRegistering) {
        const { error } = await authService.supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.fullName, specialty: formData.specialty, license_number: formData.licenseNumber },
          },
        });
        if (error) throw error;
        setVerificationSent(true);
        toast.success("Cuenta creada. Verifique su correo.");
      } else {
        const { error } = await authService.supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
        });
        if (error) throw error;
        onLoginSuccess();
      }
    } catch (error: any) {
      console.error(error);
      let msg = error.message;
      if (msg === "Invalid login credentials") msg = "Correo o contraseña incorrectos";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- SOLICITUD DE RECUPERACIÓN ---
  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await authService.supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: window.location.origin, 
      });
      if (error) throw error;
      setRecoverySent(true);
      toast.success("Correo de recuperación enviado.");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTUALIZAR CONTRASEÑA ---
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await authService.supabase.auth.updateUser({ 
        password: formData.newPassword 
      });
      if (error) throw error;
      toast.success("Contraseña actualizada exitosamente.");
      if (onPasswordResetSuccess) {
        onPasswordResetSuccess();
      } else {
        setIsResettingPassword(false);
        setIsRecovering(false);
      }
    } catch (error: any) {
      console.error(error);
      toast.error("Error al actualizar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- FEEDBACK VISUAL ---
  if (verificationSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-fade-in-up">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><Mail size={40} /></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Casi listo!</h2>
          <p className="text-slate-600 mb-6">Hemos enviado confirmación a: <span className="font-bold text-brand-teal">{formData.email}</span></p>
          <button onClick={() => { setVerificationSent(false); setIsRegistering(false); }} className="w-full bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-all">Ir a Iniciar Sesión</button>
        </div>
      </div>
    );
  }

  if (recoverySent) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-fade-in-up">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6"><KeyRound size={40} /></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Revise su Correo</h2>
          <p className="text-slate-600 mb-6">Si el correo existe, recibirá instrucciones.</p>
          <button onClick={() => { setRecoverySent(false); setIsRecovering(false); }} className="w-full bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-all">Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* --- PANEL IZQUIERDO (RESTAURADO) --- */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&q=80')] bg-cover bg-center"></div>
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-4 mb-8">
            <img 
                src="/pwa-192x192.png" 
                alt="Logo MediScribe" 
                className="w-20 h-20 rounded-2xl bg-white p-1 shadow-lg object-cover"
            />
            <h1 className="text-5xl font-bold tracking-tight">MediScribe AI</h1>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight">El asistente clínico inteligente para médicos modernos.</h2>
          <p className="text-slate-400 text-lg">Automatice sus notas clínicas, gestione su agenda y recupere su tiempo con el poder de la IA.</p>
          
          {/* BLOQUE RESTAURADO: INDICADORES DE CONFIANZA */}
          <div className="mt-12 flex gap-8">
            <div className="flex flex-col gap-2">
                <span className="text-2xl font-bold text-brand-teal">NOM-004</span>
                <span className="text-sm text-slate-400">Cumplimiento Normativo</span>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-2xl font-bold text-brand-teal">IA 2.0</span>
                <span className="text-sm text-slate-400">Reconocimiento de Voz</span>
            </div>
            <div className="flex flex-col gap-2">
                <span className="text-2xl font-bold text-brand-teal">100%</span>
                <span className="text-sm text-slate-400">Seguro y Privado</span>
            </div>
          </div>
          {/* FIN BLOQUE RESTAURADO */}

        </div>
      </div>

      {/* --- PANEL DERECHO (FORMULARIO LÓGICO V3.0) --- */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in-up">
          
          {/* MODO: NUEVA CONTRASEÑA */}
          {isResettingPassword ? (
             <>
               <div className="text-center">
                <div className="w-16 h-16 bg-brand-teal/10 text-brand-teal rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
                <h2 className="text-3xl font-bold text-slate-900">Nueva Contraseña</h2>
                <p className="mt-2 text-slate-500">Por seguridad, establezca una nueva contraseña.</p>
              </div>
              <form className="space-y-5" onSubmit={handlePasswordUpdate}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Lock size={18} /></div>
                    <input required type="password" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none transition-all" placeholder="Nueva contraseña segura" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})}/>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-all flex justify-center items-center gap-2">
                  {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Actualizar y Entrar'}
                </button>
              </form>
             </>
          ) : isRecovering ? (
             /* MODO: SOLICITUD DE RECUPERACIÓN */
             <>
               <div className="text-center lg:text-left">
                <button onClick={() => setIsRecovering(false)} className="mb-4 text-slate-500 hover:text-slate-700 flex items-center gap-2 text-sm font-medium transition-colors"><ArrowLeft size={16} /> Volver</button>
                <h2 className="text-3xl font-bold text-slate-900">Recuperar Acceso</h2>
                <p className="mt-2 text-slate-500">Ingrese su correo para restablecer su contraseña.</p>
              </div>
              <form className="space-y-5" onSubmit={handleRecoveryRequest}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Mail size={18} /></div>
                    <input required type="email" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none transition-all" placeholder="doctor@hospital.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-all flex justify-center items-center gap-2">
                  {loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Enviar Enlace'}
                </button>
              </form>
             </>
          ) : (
             /* MODO: LOGIN NORMAL */
             <>
                <div className="text-center lg:text-left">
                  <h2 className="text-3xl font-bold text-slate-900">{isRegistering ? 'Alta de Médico' : 'Bienvenido de nuevo'}</h2>
                  <p className="mt-2 text-slate-500">{isRegistering ? 'Complete su perfil profesional.' : 'Ingrese sus credenciales para acceder.'}</p>
                </div>
                <form className="space-y-5" onSubmit={handleAuth}>
                  {isRegistering && (
                      <div className="space-y-4 animate-fade-in-up">
                          <div className="grid grid-cols-1 gap-4">
                              <div><label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label><input required type="text" className="block w-full p-3 border border-slate-200 rounded-xl outline-none" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} /></div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Especialidad</label><input required type="text" className="block w-full p-3 border border-slate-200 rounded-xl outline-none" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} /></div>
                                  <div><label className="block text-sm font-medium text-slate-700 mb-1">Cédula</label><input required type="text" className="block w-full p-3 border border-slate-200 rounded-xl outline-none" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} /></div>
                              </div>
                          </div>
                      </div>
                  )}
                  <div className="space-y-4">
                      <div><label className="block text-sm font-medium text-slate-700 mb-1">Correo</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Mail size={18} /></div><input required type="email" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none" placeholder="doctor@hospital.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/></div></div>
                      <div><label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Lock size={18} /></div><input required type="password" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/></div>
                      {!isRegistering && (<div className="flex justify-end mt-2"><button type="button" onClick={() => setIsRecovering(true)} className="text-xs font-medium text-brand-teal hover:text-teal-700">¿Olvidaste tu contraseña?</button></div>)}</div>
                  </div>
                  {isRegistering && (<div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100"><input type="checkbox" required className="mt-1 w-4 h-4 text-brand-teal rounded cursor-pointer" checked={formData.termsAccepted} onChange={e => setFormData({...formData, termsAccepted: e.target.checked})}/><label className="text-xs text-slate-600">Acepto la verificación de mi Cédula Profesional.</label></div>)}
                  <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-brand-teal hover:bg-teal-600 transition-all disabled:opacity-50">{loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <>{isRegistering ? 'Registrarse' : 'Iniciar Sesión'} <ArrowRight size={20} /></>}</button>
                </form>
                <div className="text-center"><button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-sm font-medium text-brand-teal hover:text-teal-700">{isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿Eres nuevo? Crea tu cuenta'}</button></div>
             </>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">&copy; 2025 MediScribe AI. Desarrollado por Pixel Art Studio.</div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;