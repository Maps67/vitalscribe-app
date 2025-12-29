import { PDFDocument, StandardFonts } from 'pdf-lib';
import { MedicalReportData, InsuranceProvider } from '../types/insurance';

/**
 * SERVICIO DE MAPEO Y LLENADO DE PDFs PARA ASEGURADORAS
 * -----------------------------------------------------
 * Este servicio se encarga de:
 * 1. Cargar los templates PDF (GNP, AXA, etc.) desde la carpeta /public/forms/
 * 2. Mapear los datos de la nota clínica (MedicalReportData) a las coordenadas (x, y) específicas de cada formato.
 * 3. Generar un blob PDF descargable para el médico.
 */

export const InsurancePDFService = {

  /**
   * Carga un archivo PDF desde la carpeta pública o URL
   */
  async loadPDFTemplate(url: string): Promise<ArrayBuffer> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`No se pudo cargar el formato PDF: ${url}`);
      return await response.arrayBuffer();
    } catch (error) {
      console.error("Error cargando template PDF:", error);
      throw error;
    }
  },

  /**
   * Generador Maestro: Decide qué función de llenado usar según la aseguradora
   */
  async generateReport(provider: InsuranceProvider, data: MedicalReportData): Promise<Uint8Array> {
    switch (provider) {
      case 'GNP':
        return this.fillGNPForm(data);
      case 'AXA':
        return this.fillAXAForm(data);
      case 'METLIFE':
        return this.fillMetLifeForm(data);
      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }
  },

  /**
   * Lógica específica para Informe Médico GNP (Coordenadas Hardcodeadas)
   * NOTA: Estas coordenadas (x, y) se deben calibrar con el PDF real de GNP.
   */
  async fillGNPForm(data: MedicalReportData): Promise<Uint8Array> {
    // 1. Cargar Template
    const formBytes = await this.loadPDFTemplate('/forms/gnp_informe_medico.pdf');
    
    // 2. Cargar documento en memoria
    const pdfDoc = await PDFDocument.load(formBytes);
    const form = pdfDoc.getForm(); // Si el PDF tiene campos AcroForm
    const pages = pdfDoc.getPages();
    const firstPage = pages[0]; // Asumimos página 1 para datos generales
    
    // 3. Preparar Fuente
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // --- ESTRATEGIA A: SI EL PDF TIENE CAMPOS (ACROFIELDS) ---
    // Esta es la forma elegante. Si el PDF oficial de GNP es un formulario real.
    try {
        // Ejemplo de llenado por nombre de campo (requiere inspeccionar el PDF)
        const nameField = form.getTextField('nombre_paciente');
        if (nameField) nameField.setText(data.patientName);

        const diagnosisField = form.getTextField('diagnostico_principal');
        if (diagnosisField) diagnosisField.setText(`${data.diagnosis} (CIE-10: ${data.icd10})`);

        // Checkboxes (ej. ¿Fue accidente?)
        if (data.isAccident) {
            const accidentCheck = form.getCheckBox('check_accidente');
            if (accidentCheck) accidentCheck.check();
        }
    } catch (e) {
        console.warn("No se encontraron AcroFields, usando modo Coordenadas (Fallback).");
    }

    // --- ESTRATEGIA B: ESCRITURA DIRECTA (COORDENADAS X,Y) ---
    // Útil si el PDF es "plano" (sin campos editables).
    // drawText(texto, { x, y, size, font })
    
    // Nombre del Paciente (Ejemplo de posición)
    firstPage.drawText(data.patientName, {
        x: 120, 
        y: 650, 
        size: 10,
        font: font
    });

    // Diagnóstico
    firstPage.drawText(data.diagnosis, {
        x: 120,
        y: 600,
        size: 9,
        font: font
    });

    // Fecha de Inicio de Padecimiento (CRÍTICO PARA PREEXISTENCIAS)
    firstPage.drawText(data.symptomsStartDate, {
        x: 450,
        y: 600,
        size: 10,
        font: font
    });

    // Narrativa Clínica (Resumen)
    firstPage.drawText(data.clinicalSummary, {
        x: 50,
        y: 500,
        size: 8,
        font: font,
        maxWidth: 500, // Auto-wrap
        lineHeight: 12
    });

    // 4. Aplanar formulario (para que no sea editable) y guardar
    form.flatten();
    return await pdfDoc.save();
  },

  /**
   * Lógica específica para Informe Médico AXA
   */
  async fillAXAForm(data: MedicalReportData): Promise<Uint8Array> {
    const formBytes = await this.loadPDFTemplate('/forms/axa_informe_medico.pdf');
    const pdfDoc = await PDFDocument.load(formBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Lógica AXA (Difiere en coordenadas)
    firstPage.drawText(data.patientName, { x: 100, y: 700, size: 10, font });
    firstPage.drawText(data.diagnosis, { x: 100, y: 650, size: 10, font });

    return await pdfDoc.save();
  },

   /**
   * Lógica específica para Informe Médico MetLife
   */
   async fillMetLifeForm(data: MedicalReportData): Promise<Uint8Array> {
    const formBytes = await this.loadPDFTemplate('/forms/metlife_informe_medico.pdf');
    const pdfDoc = await PDFDocument.load(formBytes);
    // ... lógica similar
    return await pdfDoc.save();
  }
};