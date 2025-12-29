import { FeeCalculationResult } from '../types/insurance';

/**
 * SERVICIO DE CÁLCULO DE HONORARIOS QUIRÚRGICOS
 * ---------------------------------------------
 * Reglas de negocio estándar para SGMM en México:
 * - Cirujano: 100% del tabulador.
 * - Anestesiólogo: 30% del tabulador del cirujano.
 * - Primer Ayudante: 20% del tabulador del cirujano.
 * - Segundo Ayudante (Opcional): 10% (No implementado en MVP).
 */
export const FeeCalculator = {
  
  calculate(baseFee: number, desiredFee: number): FeeCalculationResult {
    // 1. Validaciones básicas anti-error
    const safeBaseFee = Math.max(0, baseFee);
    const safeDesiredFee = Math.max(0, desiredFee);

    // 2. Cálculo de porcentajes estándar
    const surgeonFee = safeBaseFee;
    const anesthesiologistFee = safeBaseFee * 0.30;
    const assistantFee = safeBaseFee * 0.20;
    
    // 3. Totales
    const totalTeamFee = surgeonFee + anesthesiologistFee + assistantFee;
    
    // 4. Cálculo del diferencial (Lo que paga el paciente)
    // Si el médico quiere ganar 50,000 pero el seguro paga 30,000,
    // el paciente paga la diferencia de 20,000.
    const differentialToCharge = Math.max(0, safeDesiredFee - surgeonFee);

    return {
      baseFee: safeBaseFee,
      surgeonFee,
      anesthesiologistFee,
      assistantFee,
      totalTeamFee,
      doctorPrivateFee: safeDesiredFee,
      differentialToCharge
    };
  }
};