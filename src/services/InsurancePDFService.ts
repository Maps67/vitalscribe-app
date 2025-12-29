import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { MedicalReportData, InsuranceProvider } from '../types/insurance';

/**
 * SERVICIO DE MAPEO Y LLENADO DE PDFs (CALIBRACIÓN V3 - AGRESIVA)
 * -----------------------------------------------------
 * Ajustes drásticos basados en evidencia fotográfica.
 * - GNP: Se movió todo a la derecha para evitar la barra lateral azul oscuro.
 * - AXA: Se bajó todo el contenido para salir de la zona de encabezados.
 * - METLIFE: Se bajó el nombre casi 100 puntos.
 */

export const InsurancePDFService = {

  async loadPDFTemplate(filename: string): Promise<ArrayBuffer> {
    try {
      const url = `/forms/${filename}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`No se pudo cargar el formato PDF: ${url}`);
      return await response.arrayBuffer();
    } catch (error) {
      console.error("Error cargando template PDF:", error);
      throw error;
    }
  },

  async generateReport(provider: InsuranceProvider, data: MedicalReportData): Promise<Uint8Array> {
    switch (provider) {
      case 'GNP': return this.fillGNPForm(data);
      case 'AXA': return this.fillAXAForm(data);
      case 'METLIFE': return this.fillMetLifeForm(data);
      default: throw new Error(`Proveedor no soportado: ${provider}`);
    }
  },

  // ---------------------------------------------------------
  // 1. GNP (Ajuste: Mover a la derecha por barra lateral y bajar Y)
  // ---------------------------------------------------------
  async fillGNPForm(data: MedicalReportData): Promise<Uint8Array> {
    const formBytes = await this.loadPDFTemplate('gnp_informe_medico.pdf');
    const pdfDoc = await PDFDocument.load(formBytes);
    const pages = pdfDoc.getPages();
    const page1 = pages[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 10;

    // Split de nombre para campos separados
    const parts = data.patientName.split(" ");
    const ap = parts[0] || "";
    const am = parts[1] || "";
    const nom = parts.slice(2).join(" ");

    // --- ENCABEZADO (Ficha de Identificación) ---
    // En tu foto, "Mariana" estaba muy a la izquierda.
    // X original: 35 -> Nuevo X: 160 (Para saltar la barra azul lateral)
    const headerY = 665; 
    
    page1.drawText(ap, { x: 160, y: headerY, size: fontSize, font });
    page1.drawText(am, { x: 300, y: headerY, size: fontSize, font });
    page1.drawText(nom, { x: 450, y: headerY, size: fontSize, font });

    // Edad
    page1.drawText(data.age.toString(), { x: 280, y: 635, size: fontSize, font });

    // --- PADECIMIENTO ACTUAL (El problema mayor) ---
    // En tu foto, el texto chocaba con la barra "HISTORIA CLÍNICA" a la izquierda
    // y estaba sobre el título "Padecimiento actual".
    // Corrección: X = 130 (Derecha), Y = 280 (Más abajo del título)
    
    page1.drawText(data.clinicalSummary, {
        x: 130, // Margen izquierdo grande para evitar barra azul
        y: 280, 
        size: 9,
        font,
        maxWidth: 450, // Más angosto para no salirse a la derecha
        lineHeight: 11
    });

    // Diagnóstico (Pie de página)
    page1.drawText(`${data.diagnosis} (CIE: ${data.icd10})`, {
        x: 130,
        y: 80, // Bien abajo
        size: 9,
        font
    });

    return await pdfDoc.save();
  },

  // ---------------------------------------------------------
  // 2. AXA (Ajuste: Bajar todo drásticamente)
  // ---------------------------------------------------------
  async fillAXAForm(data: MedicalReportData): Promise<Uint8Array> {
    const formBytes = await this.loadPDFTemplate('axa_informe_medico.pdf');
    const pdfDoc = await PDFDocument.load(formBytes);
    const pages = pdfDoc.getPages();
    const page1 = pages[0]; 
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 10;

    // --- DATOS DEL PACIENTE ---
    // En tu foto salía en "Instrucciones". Bajamos ~100 puntos.
    const rowY = 530; // Antes 635. Bajamos mucho.

    const parts = data.patientName.split(" ");
    page1.drawText(parts[0] || "", { x: 35, y: rowY, size: fontSize, font }); // Paterno
    page1.drawText(parts[1] || "", { x: 200, y: rowY, size: fontSize, font }); // Materno
    page1.drawText(parts.slice(2).join(" "), { x: 380, y: rowY, size: fontSize, font }); // Nombres

    // Edad
    page1.drawText(data.age.toString(), { x: 35, y: 495, size: fontSize, font });

    // --- PÁGINA 2: PADECIMIENTO ---
    // En tu foto salía sobre el encabezado azul.
    if (pages.length > 1) {
        const page2 = pages[1];
        
        // Padecimiento Actual (Bajamos de 700 a 620 para librar el header azul)
        page2.drawText(data.clinicalSummary, {
            x: 35,
            y: 620, 
            size: 9,
            font,
            maxWidth: 540,
            lineHeight: 11
        });
        
        // Diagnóstico (Bajamos a la zona correcta)
        page2.drawText(data.diagnosis, { x: 35, y: 480, size: 9, font });
        page2.drawText(data.icd10, { x: 450, y: 480, size: 9, font });
    }

    return await pdfDoc.save();
  },

  // ---------------------------------------------------------
  // 3. MetLife (Ajuste: Bajar nombre fuera del título)
  // ---------------------------------------------------------
   async fillMetLifeForm(data: MedicalReportData): Promise<Uint8Array> {
    const formBytes = await this.loadPDFTemplate('metlife_informe_medico.pdf');
    const pdfDoc = await PDFDocument.load(formBytes);
    const pages = pdfDoc.getPages();
    const page1 = pages[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // --- DATOS DEL PACIENTE ---
    // En tu foto "Mariana" estaba en el título "Informe Médico".
    // Bajamos ~100 puntos hacia la caja gris "1. Datos del paciente"
    const nameY = 525; // Antes 610

    page1.drawText(data.patientName, { x: 130, y: nameY, size: 10, font }); 

    // Fecha
    const today = new Date();
    page1.drawText(today.getDate().toString(), { x: 435, y: nameY + 30, size: 10, font });

    // --- HISTORIA CLÍNICA (Sección 2) ---
    // En tu foto estaba bien, pero quizá un poco alto. Ajustamos fino.
    page1.drawText(data.clinicalSummary.substring(0, 500), {
        x: 35,
        y: 380, 
        size: 9,
        font,
        maxWidth: 530,
        lineHeight: 11
    });

    return await pdfDoc.save();
  }
};