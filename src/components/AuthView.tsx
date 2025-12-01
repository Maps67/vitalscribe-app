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

  // --- DETECTOR DE RECUPERACIÓN (MEJORADO) ---
  useEffect(() => {
    // 1. CHEQUEO DE URL (PRIORIDAD ALTA): Detectar si venimos de un link de correo
    // Los links de Supabase suelen ser: .../#access_token=xyz&type=recovery
    const hash = window.location.hash;
    const isRecoveryHash = hash && hash.includes('type=recovery');

    if (forceResetMode || isRecoveryHash) {
      console.log("Modo Recuperación Detectado por URL/Props");
      setIsResettingPassword(true);
      setIsRecovering(false);
      setIsRegistering(false);
    }

    // 2. LISTENER DE EVENTOS (RESPALDO)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        console.log("Evento PASSWORD_RECOVERY detectado");
        setIsResettingPassword(true);
        setIsRecovering(false);
        setIsRegistering(false);
      } else if (event === 'SIGNED_IN') {
        // CRÍTICO: Si estamos en modo reset (por URL), NO ejecutar onLoginSuccess todavía
        // Solo ejecutar login si NO es una recuperación
        if (!isResettingPassword && !isRecoveryHash) {
           // Dejamos que el usuario fluya normal si no es recuperación
        }
      }
    });

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
        // ... (Validaciones de registro igual que antes) ...
        const cedulaLimpia = formData.cedula.trim();
        const esNumerica = /^\d+$/.test(cedulaLimpia);
        if (!esNumerica || (cedulaLimpia.length < 7 || cedulaLimpia.length > 8)) {
             toast.error("Cédula inválida. Debe tener 7 u 8 dígitos numéricos (SEP).");
             setLoading(false); return;
        }

        const passError = validatePasswordStrength(formData.password);
        if (passError) { toast.error(passError); setLoading(false); return; }

        if (!formData.termsAccepted) {
            toast.error("Debe aceptar la verificación de su cédula profesional.");
            setLoading(false); return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: { full_name: formData.fullName, specialty: formData.specialty, cedula: cedulaLimpia },
          },
        });

        if (error) throw error;

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
        // INICIO DE SESIÓN NORMAL
        const { error } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
        });
        if (error) throw error;
        // Solo redirigir si NO estamos en medio de un reset
        if (onLoginSuccess && !isResettingPassword) onLoginSuccess();
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
      // Forzamos la redirección a la URL base actual
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
      toast.success("Contraseña actualizada exitosamente.");
      
      // Limpiamos el hash de la URL para evitar bucles
      window.history.replaceState(null, '', window.location.pathname);

      // AHORA SÍ dejamos pasar al usuario
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
      
      {/* IZQUIERDA: BRANDING */}
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
        <a href="/manual.html" target="_blank" rel="noopener noreferrer" className="absolute top-8 right-8 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-brand-teal transition-colors bg-slate-50 px-4 py-2 rounded-full border border-slate-200 shadow-sm hover:shadow-md">
          <BookOpen className="w-4 h-4" /> Manual de Usuario
        </a>

        <div className="w-full max-w-md space-y-8 animate-fade-in-up">
          
          {/* VISTA 1: RESETEAR CONTRASEÑA */}
          {isResettingPassword ? (
             <>
               <div className="text-center">
                <div className="w-16 h-16 bg-brand-teal/10 text-brand-teal rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle2 size={32} /></div>
                <h2 className="text-3xl font-bold text-slate-900">Nueva Contraseña</h2>
                <p className="mt-2 text-slate-500">Recuperación exitosa. Ingrese su nueva clave.</p>
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
                               <div className="relative"><Stethoscope size={1