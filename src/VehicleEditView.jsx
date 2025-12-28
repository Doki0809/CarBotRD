import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Calendar, Fuel, Settings, Save, DollarSign,
  IdCard, Maximize, ChevronLeft, ChevronRight,
  X, Info, Share2, Heart, Files, CheckCircle, Lock
} from 'lucide-react';

export default function VehicleEditView({ vehicle, contract, onBack, onSave }) {
  const [loading, setLoading] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [currency, setCurrency] = useState(vehicle?.price_dop > 0 ? 'DOP' : 'USD');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const isSold = vehicle?.status === 'sold';

  const [formData, setFormData] = useState({
    ...vehicle,
    images: vehicle?.images || (vehicle?.image ? [vehicle.image] : []),
    photos: vehicle?.photos || [],
    documents: vehicle?.documents || [],
    price_unified: vehicle?.price_dop > 0 ? vehicle.price_dop : (vehicle?.price || 0)
  });

  useEffect(() => {
    if (vehicle) {
      setFormData(prev => ({
        ...prev,
        ...vehicle,
        images: vehicle?.images || (vehicle?.image ? [vehicle.image] : []),
        price_unified: vehicle?.price_dop > 0 ? vehicle.price_dop : (vehicle?.price || 0)
      }));
      setCurrency(vehicle?.price_dop > 0 ? 'DOP' : 'USD');
    }
  }, [vehicle]);

  if (!vehicle) return null;

  const handlePriceChange = (e) => {
    if (isSold) return;
    const { value } = e.target;
    setFormData(prev => ({ ...prev, price_unified: value }));
  };

  const handleChange = (e) => {
    if (isSold) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || isSold) return;
    setLoading(true);
    try {
      const priceVal = Number(formData.price_unified);
      const { price_unified: _tmp, ...dataToSave } = {
        ...formData,
        image: formData.images[0] || formData.image,
        price: currency === 'USD' ? priceVal : 0,
        price_dop: currency === 'DOP' ? priceVal : 0
      };
      await onSave(dataToSave);
    } catch (error) {
      console.error("Error saving vehicle:", error);
      alert("Error al guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  const nextPhoto = () => setActivePhotoIndex(prev => (prev + 1) % formData.images.length);
  const prevPhoto = () => setActivePhotoIndex(prev => (prev - 1 + formData.images.length) % formData.images.length);

  const Input = ({ label, icon: Icon, name, value, onChange, type = "text", disabled, className = "" }) => (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-slate-500 flex items-center gap-2 pl-1">
        {Icon && <Icon size={14} className="text-slate-400" />}
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled || isSold}
        className={`w-full p-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-slate-700 font-semibold shadow-sm ${isSold ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
      />
    </div>
  );

  return (
    <div className='animate-in fade-in duration-700 p-4 md:p-8 max-w-[1600px] mx-auto'>
      {/* HEADER ACTIONS */}
      <div className="flex justify-between items-center mb-6 sm:mb-10">
        <button onClick={onBack} className='flex items-center text-slate-400 hover:text-red-600 font-bold transition-all group px-2 sm:px-4 py-2 hover:bg-red-50 rounded-xl' disabled={loading}>
          <ArrowLeft size={16} className='mr-1 sm:mr-2 group-hover:-translate-x-1 transition-transform' />
          <span className="text-[10px] sm:text-sm uppercase tracking-wider">Volver</span>
        </button>

        <button
          onClick={onBack}
          disabled={loading}
          className="p-2 sm:p-3 bg-white border border-slate-200 rounded-xl sm:rounded-2xl text-slate-400 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all shadow-lg"
          title="Cerrar"
        >
          <X size={20} className="sm:w-6 sm:h-6" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-10">

        {/* LEFT PANEL: GALLERY & VISUALS */}
        <div className="xl:col-span-8 space-y-4 md:space-y-8">
          <div className="relative bg-white rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl transition-all duration-700 border-4 md:border-8 border-white h-[400px] md:h-[650px]">
            <div className="w-full h-full relative group cursor-zoom-in" onClick={() => setIsLightboxOpen(true)}>
              <img
                src={formData.images[activePhotoIndex]}
                className='w-full h-full object-contain'
                alt="Vista principal"
              />
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="bg-white/20 backdrop-blur-md p-4 rounded-full text-white">
                  <Maximize size={32} />
                </div>
              </div>

              {/* NAV CONTROLS */}
              <div className="absolute inset-x-2 sm:inset-x-8 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none">
                <button type="button" onClick={(e) => { e.stopPropagation(); prevPhoto(); }} className="p-2 sm:p-4 rounded-full bg-white/80 hover:bg-white text-slate-900 backdrop-blur-sm transition-all pointer-events-auto shadow-xl border border-slate-100"><ChevronLeft size={20} className="sm:w-[30px] sm:h-[30px]" /></button>
                <button type="button" onClick={(e) => { e.stopPropagation(); nextPhoto(); }} className="p-2 sm:p-4 rounded-full bg-white/80 hover:bg-white text-slate-900 backdrop-blur-sm transition-all pointer-events-auto shadow-xl border border-slate-100"><ChevronRight size={20} className="sm:w-[30px] sm:h-[30px]" /></button>
              </div>


            </div>
          </div>

          {/* THUMBNAILS GRID */}
          <div className="bg-white p-4 md:p-6 rounded-[2rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
            <div className="flex items-center justify-between mb-6 px-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Files size={16} className="text-red-500" />
                Carrete de Imágenes ({formData.images.length})
              </h3>
              <div className="flex gap-2">
                <button type="button" className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-red-600 transition-all"><Share2 size={16} /></button>
                <button type="button" className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-red-600 transition-all"><Heart size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {formData.images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border-4 ${activePhotoIndex === idx ? 'border-red-600 scale-95 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: INFO & CONTROLS */}
        <div className="xl:col-span-4 space-y-4 md:space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-100 flex flex-col gap-6 md:gap-8">

            {/* SOLD CONTEXT SECTION - REDESIGNED */}
            {isSold && (
              <div className="relative overflow-hidden p-6 sm:p-8 bg-gradient-to-br from-emerald-600 to-emerald-500 rounded-2xl sm:rounded-[2rem] text-white shadow-xl shadow-emerald-200 transition-all border border-emerald-400/20">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className="text-sm sm:text-base font-black uppercase tracking-widest flex items-center gap-2">
                      <CheckCircle size={18} className="sm:w-5 sm:h-5" /> VENTA Completada
                    </h3>
                    <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg sm:rounded-xl backdrop-blur-sm">
                      <Lock size={14} className="sm:w-4 sm:h-4" />
                    </div>
                  </div>

                  <div className="space-y-4 sm:space-y-6">
                    <div className="p-3 sm:p-4 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/10">
                      <p className="text-[8px] sm:text-[10px] font-black text-emerald-100 uppercase mb-0.5 sm:mb-1 tracking-widest">PROPIETARIO ACTUAL</p>
                      <p className="text-lg sm:text-xl font-black">{contract?.client || 'N/A'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="p-3 sm:p-4 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/10">
                        <p className="text-[8px] sm:text-[10px] font-black text-emerald-100 uppercase mb-0.5 sm:mb-1 tracking-widest">PRECIO</p>
                        <p className="text-xs sm:text-sm font-black whitespace-nowrap">
                          {formData.price_dop > 0 ? `RD$ ${(formData.price_dop / 1000).toFixed(0)}k` : `US$ ${(formData.price / 1000).toFixed(0)}k`}
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/10">
                        <p className="text-[8px] sm:text-[10px] font-black text-emerald-100 uppercase mb-0.5 sm:mb-1 tracking-widest">VENTA</p>
                        <p className="text-xs sm:text-sm font-black text-right whitespace-nowrap">
                          {contract?.price ? (formData.price_dop > 0 ? `RD$ ${(contract.price / 1000).toFixed(0)}k` : `US$ ${(contract.price / 1000).toFixed(0)}k`) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-black text-2xl tracking-tighter">{formData.year}</span>
                <span className="w-2 h-2 rounded-full bg-slate-200"></span>
                <span className="text-slate-400 font-bold text-lg uppercase">{formData.color}</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight leading-none">
                {formData.make} <br />
                <span className="text-red-700">{formData.model}</span>
              </h2>
            </div>

            <div className="space-y-6">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                <Info size={16} /> Especificaciones
              </h2>
              <div className="grid grid-cols-1 gap-5">
                <Input label="Año del Modelo" name="year" value={formData.year} icon={Calendar} />
                <Input label="Edición / Versión" name="edition" value={formData.edition} icon={Settings} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Transmisión" name="transmission" value={formData.transmission} icon={Settings} />
                  <Input label="Tracción" name="traction" value={formData.traction} icon={Settings} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Combustible" name="fuel" value={formData.fuel} icon={Fuel} />
                  <Input label="Kilometraje" name="mileage" value={formData.mileage} icon={Settings} />
                </div>
                <Input label="Chasis/VIN" name="vin" value={formData.vin || formData.chassis} icon={IdCard} className="font-mono" />
              </div>

              {!isSold && (
                <>
                  <div className="pt-4 border-t border-slate-50">
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <DollarSign size={14} /> Precio de Venta
                    </h2>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3">
                      <input
                        type="number"
                        value={formData.price_unified}
                        onChange={handlePriceChange}
                        className="bg-transparent text-2xl font-black text-slate-900 outline-none w-full border-b border-slate-200 focus:border-red-600 pb-1 transition-all"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrency('USD')}
                          className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${currency === 'USD' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}
                        >USD$</button>
                        <button
                          type="button"
                          onClick={() => setCurrency('DOP')}
                          className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${currency === 'DOP' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200'}`}
                        >DOP$</button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-5 md:py-6 bg-slate-900 text-white rounded-[1.5rem] md:rounded-[2rem] font-black text-base md:text-lg uppercase tracking-widest flex items-center justify-center gap-4 hover:bg-red-600 transition-all shadow-2xl shadow-slate-900/40 hover:shadow-red-600/40 transform hover:-translate-y-1 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> : <><Save size={24} /> Guardar Unidad</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </form>

      {isLightboxOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-950/98 backdrop-blur-xl flex flex-col animate-in fade-in duration-300 overflow-hidden">
          <div className="flex justify-between items-center p-4 sm:p-8 z-50">
            <div className="text-white">
              <h4 className="text-lg sm:text-xl font-black uppercase tracking-tighter text-red-600 line-clamp-1">{formData.make} {formData.model}</h4>
              <p className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Foto {activePhotoIndex + 1} de {formData.images.length}</p>
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-3 sm:p-4 rounded-full bg-white/10 text-red-600 hover:bg-white transition-all shadow-xl"
            >
              <X size={24} className="sm:w-[32px] sm:h-[32px]" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center relative px-4 sm:px-10">
            <button onClick={prevPhoto} className="absolute left-2 sm:left-10 p-3 sm:p-6 rounded-full bg-white/5 text-white z-10"><ChevronLeft size={24} className="sm:w-[48px] sm:h-[48px]" /></button>
            <img
              src={formData.images[activePhotoIndex]}
              className="max-w-full max-h-[70vh] sm:max-h-[85vh] object-contain shadow-2xl rounded-lg"
              alt="Lightbox View"
            />
            <button onClick={nextPhoto} className="absolute right-2 sm:right-10 p-3 sm:p-6 rounded-full bg-white/5 text-white z-10"><ChevronRight size={24} className="sm:w-[48px] sm:h-[48px]" /></button>
          </div>

          <div className="p-4 sm:p-10 flex justify-start sm:justify-center gap-2 sm:gap-3 overflow-x-auto pb-8 custom-scrollbar">
            {formData.images.map((img, idx) => (
              <div
                key={idx}
                onClick={() => setActivePhotoIndex(idx)}
                className={`min-w-[70px] sm:min-w-[100px] h-[70px] sm:h-[100px] rounded-lg sm:rounded-xl overflow-hidden cursor-pointer transition-all border-2 sm:border-4 ${activePhotoIndex === idx ? 'border-red-600 scale-105' : 'border-transparent opacity-30'}`}
              >
                <img src={img} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
