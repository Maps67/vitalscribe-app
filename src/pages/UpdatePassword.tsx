import React from 'react';
import AuthView from '../components/AuthView';
import { supabase } from '../lib/supabase';

interface UpdatePasswordProps {
  onSuccess?: () => void;
}

const UpdatePassword: React.FC<UpdatePasswordProps> = ({ onSuccess }) => {
  return (
    // Renderizamos AuthView forzando el modo de reseteo
    // Esto mantiene tu diseño original (Split Screen) pero mostrando el form correcto
    <AuthView 
      authService={{ supabase }} 
      onLoginSuccess={() => {}} 
      forceResetMode={true} 
      onPasswordResetSuccess={() => {
          // Al terminar, mandamos al usuario a la raíz
          window.location.href = '/';
      }}
    />
  );
};

export default UpdatePassword;