import React from 'react';
import { Share2, Globe, MapPin, Phone, Copy } from 'lucide-react';

const DigitalCard: React.FC = () => {
  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col items-center">
      <h2 className="text-2xl font-bold text-slate-800 mb-8">Tu Tarjeta Digital (MediPin)</h2>
      
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-4xl">
        {/* Card Preview */}
        <div className="w-full md:w-1/2">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 relative transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group cursor-default">
                <div className="h-32 bg-gradient-to-r from-brand-teal to-blue-600 transition-all duration-500 group-hover:brightness-110"></div>
                <div className="px-8 pb-8">
                    <div className="relative -top-12 mb-[-30px] flex justify-center">
                        <img 
                          src="https://picsum.photos/150/150" 
                          alt="Doctor Profile" 
                          className="w-24 h-24 rounded-full border-4 border-white shadow-md object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>
                    <div className="mt-4 text-center">
                        <h1 className="text-xl font-bold text-slate-800">Dr. Alejandro Martínez</h1>
                        <p className="text-brand-teal font-medium">Cardiología Clínica</p>
                        <p className="text-slate-500 text-sm mt-2">Ced. Prof. 12345678 | SSA 98765</p>
                        
                        <div className="mt-6 space-y-3 text-left">
                            <div className="flex items-center gap-3 text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-brand-teal shrink-0">
                                    <Phone size={16} />
                                </div>
                                <span className="text-sm">+52 55 5555 5555</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-brand-teal shrink-0">
                                    <Globe size={16} />
                                </div>
                                <span className="text-sm">www.drmartinez-cardio.com</span>
                            </div>
                            <div className="flex items-center gap-3 text-slate-600 p-2 rounded-lg hover:bg-slate-50 transition-colors">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-brand-teal shrink-0">
                                    <MapPin size={16} />
                                </div>
                                <span className="text-sm">Hospital Ángeles, Consultorio 404</span>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center">
                            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://medipin.app/dr-martinez" alt="QR Code" className="w-32 h-32" />
                        </div>
                        <p className="text-center text-xs text-slate-400 mt-2">Escanea para agendar o ver perfil</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Actions */}
        <div className="w-full md:w-1/2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="font-semibold text-slate-800 mb-4">Compartir Perfil</h3>
                <div className="grid grid-cols-2 gap-4">
                    <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-brand-teal hover:bg-teal-50 transition-colors group">
                        <Share2 size={24} className="text-brand-teal mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">Compartir Link</span>
                    </button>
                    <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-200 hover:border-brand-teal hover:bg-teal-50 transition-colors group">
                        <Copy size={24} className="text-brand-teal mb-2 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">Copiar URL</span>
                    </button>
                </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-2">Integración Web</h3>
                <p className="text-sm text-blue-800 mb-4">
                    Pega este código en tu sitio web para añadir el botón de "Agendar con IA".
                </p>
                <div className="bg-white p-3 rounded border border-blue-200 font-mono text-xs text-slate-600 overflow-x-auto">
                    {`<script src="https://mediscribe.ai/widget.js" data-id="dr-martinez"></script>`}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalCard;