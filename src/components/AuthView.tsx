import React, { useState, useEffect } from 'react';
import { 
  Mail, Lock, User, Stethoscope, ArrowRight, AlertCircle, 
  BadgeCheck, KeyRound, ArrowLeft, CheckCircle2, BookOpen,
  Eye, EyeOff, FileBadge, ShieldCheck, Loader2, AlertTriangle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

interface AuthProps {
  authService?: any;
  onLoginSuccess?: () => void;
  forceResetMode?: boolean;
  onPasswordResetSuccess?: () => void;
}

const AuthView: React.FC<AuthProps> = ({ 
  authService, 
  onLoginSuccess, 
  forceResetMode = false, 
  onPasswordResetSuccess 
}) => {
  // ESTADOS DE FLUJO
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(forceResetMode);
  
  // ESTADOS DE UI
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);

  // DATOS DEL FORMULARIO
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    newPassword: '',
    fullName: '',
    specialty: 'Medicina General',
    cedula: '', 
    termsAccepted: false 
  });

  // --- CORRECCIÓN CRÍTICA: DETECTOR DE EVENTOS DE RECUPERACIÓN ---
  useEffect(() => {
    // 1. Si viene forzado por props (navegación interna)
    if (forceResetMode) {
      setIsResettingPassword(true);
    }

    // 2. Escuchar el evento de Supabase cuando se carga la app desde el link del correo
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // ¡BINGO! El usuario vino del correo de "Recuperar Contraseña"
        setIsResettingPassword(true);
        setIsRecovering(false); // Aseguramos limpiar otros estados
        setIsRegistering(false);
      }
    });

    // Limpieza del listener
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [forceResetMode]);

  // --- VALIDADOR DE CONTRASEÑA ---
  const validatePasswordStrength = (pass: string): string | null => {
    if (pass.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
    if (!/[A-Z]/.test(pass)) return "La contraseña debe incluir al menos una Mayúscula.";
    if (!/[0-9]/.test(pass)) return "La contraseña debe incluir al menos un Número.";
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return "La contraseña debe incluir un Símbolo (!@#$%).";
    return null;
  };

  // --- LOGIN / REGISTRO ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegistering) {
        // VALIDACIONES DE SEGURIDAD (REGISTRO)
        
        // 1. Cédula
        const cedulaLimpia = formData.cedula.trim();
        const esNumerica = /^\d+$/.test(cedulaLimpia);
        if (!esNumerica || (cedulaLimpia.length < 7 || cedulaLimpia.length > 8)) {
             toast.error("Cédula inválida. Debe tener 7 u 8 dígitos numéricos (SEP).");
             setLoading(false); return;
        }

        // 2. Contraseña Fuerte
        const passError = validatePasswordStrength(formData.password);
        if (passError) {
            toast.error(passError);
            setLoading(false); return;
        }

        // 3. Términos
        if (!formData.termsAccepted) {
            toast.error("Debe aceptar la verificación de su cédula profesional.");
            setLoading(false); return;
        }

        // CREAR CUENTA
        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { 
                full_name: formData.fullName, 
                specialty: formData.specialty, 
                cedula: cedulaLimpia 
            },
          },
        });

        if (error) throw error;

        // CREAR PERFIL
        if (data.user) {
            await supabase.from('profiles').insert({
                id: data.user.id,
                full_name: formData.fullName,
                specialty: formData.specialty,
                cedula: cedulaLimpia,
                email: formData.email
            });
        }

        setVerificationSent(true);
        toast.success("Cuenta creada exitosamente.");

      } else {
        // INICIO DE SESIÓN
        const { error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
        });
        if (error) throw error;
        if (onLoginSuccess) onLoginSuccess();
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

  // --- RECUPERACIÓN (OLVIDÉ MI CLAVE) ---
  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // NOTA: redirectTo debe apuntar a la URL donde vive ESTE componente AuthView.
      // Generalmente es la raíz (/) o /login
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: window.location.origin, 
      });
      
      if (error) throw error;
      setRecoverySent(true);
      toast.success("Correo de recuperación enviado.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- RESETEO (NUEVA CLAVE) ---
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const passError = validatePasswordStrength(formData.newPassword);
    if (passError) return toast.error(passError);

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: formData.newPassword 
      });
      if (error) throw error;
      toast.success("Contraseña actualizada exitosamente. Iniciando sesión...");
      
      // Importante: Después de actualizar, supabase suele dejar la sesión iniciada.
      // Disparamos el éxito para entrar a la app.
      if (onPasswordResetSuccess) {
        onPasswordResetSuccess();
      } else if (onLoginSuccess) {
        onLoginSuccess();
      } else {
        setIsResettingPassword(false);
        setIsRecovering(false);
      }
    } catch (error: any) {
      toast.error("Error al actualizar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // VISTA: MENSAJE DE VERIFICACIÓN ENVIADA
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

  // VISTA: MENSAJE DE RECUPERACIÓN ENVIADA
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
      
      {/* IZQUIERDA: IMAGEN Y BRANDING */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-40">
            <img src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1964&auto=format&fit=crop" className="w-full h-full object-cover grayscale" alt="Medical Tech" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-900/90 to-teal-900/80 z-10" />
        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-4 mb-8">
            <img src="/pwa-192x192.png" alt="Logo MediScribe" className="w-20 h-20 rounded-2xl bg-white p-1 shadow-lg object-cover" />
            <h1 className="text-5xl font-bold tracking-tight">MediScribe AI</h1>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-tight">El asistente clínico inteligente para médicos modernos.</h2>
          <p className="text-slate-400 text-lg">Automatice sus notas clínicas, gestione su agenda y recupere su tiempo con el poder de la IA.</p>
          
          <div className="mt-12 flex gap-8">
            <div className="flex flex-col gap-2"><span className="text-2xl font-bold text-brand-teal">NOM-004</span><span className="text-sm text-slate-400">Compliance</span></div>
            <div className="flex flex-col gap-2"><span className="text-2xl font-bold text-brand-teal">IA 2.0</span><span className="text-sm text-slate-400">Voz</span></div>
            <div className="flex flex-col gap-2"><span className="text-2xl font-bold text-brand-teal">100%</span><span className="text-sm text-slate-400">Seguro</span></div>
          </div>
        </div>
      </div>

      {/* DERECHA: FORMULARIO */}
      <div className="flex-1 flex items-center justify-center p-6 relative bg-white dark:bg-slate-950">
        
        {/* Botón Manual */}
        <a href="/manual.html" target="_blank" rel="noopener noreferrer" className="absolute top-8 right-8 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-teal transition-colors bg-slate-50 px-4 py-2 rounded-full border border-slate-200 shadow-sm hover:shadow-md">
          <BookOpen className="w-4 h-4" /> Manual de Usuario
        </a>

        <div className="w-full max-w-md space-y-8 animate-fade-in-up">
          
          {/* VISTA 1: RESETEAR CONTRASEÑA (Detectada por evento PASSWORD_RECOVERY) */}
          {isResettingPassword ? (
             <>
               <div className="text-center">
                <div className="w-16 h-16 bg-brand-teal/10 text-brand-teal rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
                <h2 className="text-3xl font-bold text-slate-900">Nueva Contraseña</h2>
                <p className="mt-2 text-slate-500">El enlace es válido. Establezca su nueva clave.</p>
              </div>
              <form className="space-y-5" onSubmit={handlePasswordUpdate}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nueva Contraseña</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Lock size={18} /></div>
                    <input required type={showPassword ? "text" : "password"} className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none transition-all" placeholder="Min 8 car, 1 Mayus, 1 Num, 1 Símbolo" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})}/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-brand-teal text-white py-3 rounded-xl font-bold hover:bg-teal-600 transition-all flex justify-center items-center gap-2">
                  {loading ? <Loader2 className="animate-spin" /> : 'Actualizar y Entrar'}
                </button>
              </form>
             </>
          ) : isRecovering ? (
             // VISTA 2: SOLICITAR RECUPERACIÓN
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
                  {loading ? <Loader2 className="animate-spin" /> : 'Enviar Enlace'}
                </button>
              </form>
             </>
          ) : (
             // VISTA 3: LOGIN / REGISTRO
             <>
               <div className="text-center lg:text-left">
                 <h2 className="text-3xl font-bold text-slate-900">{isRegistering ? 'Alta de Médico' : 'Bienvenido de nuevo'}</h2>
                 <p className="mt-2 text-slate-500">{isRegistering ? 'Complete su perfil profesional.' : 'Ingrese sus credenciales para acceder.'}</p>
               </div>
               <form className="space-y-5" onSubmit={handleAuth}>
                 {isRegistering && (
                   <div className="space-y-4 animate-fade-in-up">
                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo</label>
                           <div className="relative"><User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required type="text" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-teal" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="Dr. Juan Pérez"/></div>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                           <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Especialidad</label>
                               <div className="relative"><Stethoscope size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="block w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-teal" value={formData.specialty} onChange={e => setFormData({...formData, specialty: e.target.value})} placeholder="General"/></div>
                           </div>
                           <div>
                               <label className="block text-sm font-medium text-slate-700 mb-1">Cédula</label>
                               <div className="relative"><FileBadge size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input required type="text" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-teal" value={formData.cedula} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setFormData({...formData, cedula: val}); }} maxLength={8} placeholder="8 Dígitos"/></div>
                           </div>
                       </div>
                   </div>
                 )}
                 <div className="space-y-4">
                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Correo</label>
                         <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Mail size={18} /></div><input required type="email" className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none" placeholder="doctor@hospital.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})}/></div>
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                         <div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400"><Lock size={18} /></div><input required type={showPassword ? "text" : "password"} className="block w-full pl-10 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none" placeholder="••••••••" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}/>
                         <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                         {!isRegistering && (<div className="flex justify-end mt-2"><button type="button" onClick={() => setIsRecovering(true)} className="text-xs font-medium text-brand-teal hover:text-teal-700">¿Olvidaste tu contraseña?</button></div>)}
                         {isRegistering && <p className="text-[10px] text-slate-400 mt-1 pl-1 flex items-center gap-1"><AlertTriangle size={10}/> Requiere: 8+ car, 1 Mayus, 1 Num, 1 Símbolo.</p>}
                     </div>
                 </div>
                 {isRegistering && (<div className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100"><input type="checkbox" required className="mt-1 w-4 h-4 text-brand-teal rounded cursor-pointer" checked={formData.termsAccepted} onChange={e => setFormData({...formData, termsAccepted: e.target.checked})}/><label className="text-xs text-slate-600">Acepto la verificación de mi <strong>Cédula Profesional</strong>. Datos falsos suspenden la cuenta.</label></div>)}
                 <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-brand-teal hover:bg-teal-600 transition-all disabled:opacity-50">{loading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <>{isRegistering ? 'Registrarse' : 'Iniciar Sesión'} <ArrowRight size={20} /></>}</button>
               </form>
               <div className="text-center"><button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-sm font-medium text-brand-teal hover:text-teal-700">{isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿Eres nuevo? Crea tu cuenta'}</button></div>
             </>
          )}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} MediScribe AI <span className="text-slate-300">v4.0</span>. Desarrollado por <span className="font-bold text-slate-500">PixelArte Studio</span>.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;