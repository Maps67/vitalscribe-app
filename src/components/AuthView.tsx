import React, { useState } from 'react';
import { Mail, Lock, User, Stethoscope, ArrowRight, AlertCircle, BadgeCheck, ShieldCheck, KeyRound, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface AuthProps {
  authService: any;
  onLoginSuccess: () => void;
}

const AuthView: React.FC<AuthProps> = ({ authService, onLoginSuccess }) => {
  // Estados de Navegación
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false); // Nuevo estado para recuperación
  
  // Estados de Feedback
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false); // Nuevo estado para éxito de recuperación

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    specialty: 'Medicina General',
    licenseNumber: '', 
    termsAccepted: false 
  });

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
        // --- REGISTRO CON CÉDULA ---
        const { error } = await authService.supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.fullName,
              specialty: formData.specialty,
              license_number: formData.licenseNumber,
            },
          },
        });

        if (error) throw error;
        setVerificationSent(true);
        toast.success("Cuenta creada. Verifique su correo.");

      } else {
        // --- LOGIN ---
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
      if (msg === "User already registered") msg = "Este correo ya está registrado";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- MANEJO DE RECUPERACIÓN DE CONTRASEÑA ---
  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await authService.supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: window.location.origin, // Redirige a la misma app para poner el nuevo pass
      });

      if (error) throw error;
      
      setRecoverySent(true);
      toast.success("Correo de recuperación enviado.");
    } catch (error: any) {
      console.error(error);
      let msg = error.message;
      if (msg.includes("rate limit")) msg = "Espere unos minutos antes de intentar de nuevo.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // --- VISTA: EMAIL DE VERIFICACIÓN ENVIADO (REGISTRO) ---
  if (verificationSent) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-fade-in-up">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={40} />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Casi listo, Doctor!</h2>
          <p className="text-slate-600 mb-6">
            Hemos enviado un enlace de confirmación a: <br/>
            <span className="font-bold text-brand-teal">{formData.email}</span>
          </p>

          <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm mb-8 text-left flex gap-3">
            <AlertCircle size={20} className="shrink-0 mt-0.5"/>
            <p>Por seguridad, debe entrar a su correo y dar clic en el enlace para activar su cuenta antes de iniciar sesión.</p>
          </div>

          <button 
            onClick={() => {
                setVerificationSent(false);
                setIsRegistering(false);
            }}
            className="w-full bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-all"
          >
            Entendido, ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  // --- VISTA: EMAIL DE RECUPERACIÓN ENVIADO ---
  if (recoverySent) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-fade-in-up">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-100">
          <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <KeyRound size={40} />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Correo Enviado</h2>
          <p className="text-slate-600 mb-6">
            Si el correo <span className="font-bold text-brand-teal">{formData.email}</span> está registrado, recibirá instrucciones para restablecer su contraseña.
          </p>

          <button 
            onClick={() => {
                setRecoverySent(false);
                setIsRecovering(false);
                setIsRegistering(false);
            }}
            className="w-full bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-all"
          >
            Volver al Inicio de Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      {/* Panel Izquierdo (Visual) */}
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
        </div>
      </div>

      {/* Panel Derecho (Formulario) */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-8 animate-fade-in-up">
          
          {/* --- MODO RECUPERACIÓN DE CONTRASEÑA --- */}
          {isRecovering ? (
             <>
               <div className="text-center lg:text-left">
                <button 
                  onClick={() => setIsRecovering(false)}
                  className="mb-4 text-slate-500 hover:text-slate-700 flex items-center gap-2 text-sm font-medium transition-colors"
                >
                  <ArrowLeft size={16} /> Volver
                </button>
                <h2 className="text-3xl font-bold text-slate-900">Recuperar Acceso</h2>
                <p className="mt-2 text-slate-500">Ingrese su correo electrónico para restablecer su contraseña.</p>
              </div>

              <form className="space-y-5" onSubmit={handleRecovery}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Mail size={18} /></div>
                    <input required type="email" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none transition-all" placeholder="doctor@hospital.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-brand-teal hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal transition-all disabled:opacity-50">
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>Enviar Enlace de Recuperación <ArrowRight size={20} /></>
                  )}
                </button>
              </form>
             </>
          ) : (
             /* --- MODO LOGIN / REGISTRO (NORMAL) --- */
             <>
                <div className="text-center lg:text-left">
                  <h2 className="text-3xl font-bold text-slate-900">{isRegistering ? 'Alta de Médico' : 'Bienvenido de nuevo'}</h2>
                  <p className="mt-2 text-slate-500">{isRegistering ? 'Complete su perfil profesional.' : 'Ingrese sus credenciales para acceder.'}</p>
                </div>

                <form className="space-y-5" onSubmit={handleAuth}>
                  
                  {isRegistering && (
                      <div className="space-y-4 animate-fade-in-up">
                          <div className="grid grid-cols-1 gap-4">
                              <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                                  <div className="relative">
                                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><User size={18}/></div>
                                      <input required type="text" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none text-sm" placeholder="Dr. Juan Pérez" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                                  </div>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-sm font-medium text-slate-700 mb-1">Especialidad</label>
                                      <div className="relative">
                                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Stethoscope size={18}/></div>
                                          <input required type="text" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none text-sm" placeholder="Ej. Pediatría" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} />
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                                          Cédula Prof. <span className="text-red-500">*</span>
                                      </label>
                                      <div className="relative">
                                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><BadgeCheck size={18}/></div>
                                          <input required type="text" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none text-sm font-medium" placeholder="12345678" value={formData.licenseNumber} onChange={e => setFormData({...formData, licenseNumber: e.target.value})} />
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  <div className="space-y-4">
                      <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                      <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Mail size={18} /></div>
                          <input required type="email" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none transition-all" placeholder="doctor@hospital.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/>
                      </div>
                      </div>

                      <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                      <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Lock size={18} /></div>
                          <input required type="password" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none transition-all" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
                      </div>
                      
                      {/* ENLACE DE RECUPERACIÓN (SOLO EN LOGIN) */}
                      {!isRegistering && (
                        <div className="flex justify-end mt-2">
                           <button 
                             type="button" 
                             onClick={() => setIsRecovering(true)}
                             className="text-xs font-medium text-brand-teal hover:text-teal-700 transition-colors"
                           >
                             ¿Olvidaste tu contraseña?
                           </button>
                        </div>
                      )}
                      </div>
                  </div>

                  {/* CHECKBOX DE VERIFICACIÓN LEGAL (SOLO REGISTRO) */}
                  {isRegistering && (
                      <div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100 animate-fade-in-up">
                          <input 
                              type="checkbox" 
                              id="legal-check"
                              required
                              className="mt-1 w-4 h-4 text-brand-teal rounded focus:ring-brand-teal cursor-pointer"
                              checked={formData.termsAccepted}
                              onChange={e => setFormData({...formData, termsAccepted: e.target.checked})}
                          />
                          <label htmlFor="legal-check" className="text-xs text-slate-600 leading-snug cursor-pointer select-none">
                              Declaro bajo protesta de decir verdad que soy un profesional de la salud titulado y <span className="font-bold text-slate-800">acepto que mi Cédula Profesional sea verificada</span> ante el Registro Nacional de Profesionistas.
                          </label>
                      </div>
                  )}

                  <button type="submit" disabled={loading || (isRegistering && !formData.termsAccepted)} className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-brand-teal hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                        <>{isRegistering ? 'Registrarse y Validar' : 'Iniciar Sesión'} <ArrowRight size={20} /></>
                    )}
                  </button>
                </form>

                <div className="text-center">
                  <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-sm font-medium text-brand-teal hover:text-teal-700 transition-colors">
                    {isRegistering ? '¿Ya tienes cuenta validada? Inicia sesión' : '¿Eres nuevo? Crea tu cuenta médica'}
                  </button>
                </div>
             </>
          )}

          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} MediScribe AI. Desarrollado por <span className="font-bold text-slate-500">Pixel Art Studio</span>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;