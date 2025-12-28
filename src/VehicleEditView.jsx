import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Calendar, Fuel, Settings, Save, DollarSign,
  IdCard, Instagram, Monitor, Smartphone, Maximize, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function VehicleEditView({ vehicle, onBack, onSave }) {
  const [loading, setLoading] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [currency, setCurrency] = useState(vehicle?.price_dop > 0 ? 'DOP' : 'USD');
  const [viewMode, setViewMode] = useState('standard'); // 'standard' or 'social'
  const [aspectRatio, setAspectRatio] = useState('4/5'); // '4/5' or '5/4'

  const [formData, setFormData] = useState({
    ...vehicle,
    images: vehicle?.images || (vehicle?.image ? [vehicle.image] : []),
    photos: vehicle?.photos || [],
    documents: vehicle?.documents || [],
    // Campo unificado temporal para el input
    price_unified: vehicle?.price_dop > 0 ? vehicle.price_dop : (vehicle?.price || 0)
  });

  // Sincronizar campo unificado si cambia el vehículo
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
    const { value } = e.target;
    setFormData(prev => ({
      ...prev,
      price_unified: value
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
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

  const Input = ({ label, name, value, onChange, type = "text", disabled, className = "" }) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all text-slate-700 font-medium ${className}`}
      />
    </div>
  );

  return (
    <div className='animate-in slide-in-from-right duration-500 p-6 max-w-7xl mx-auto'>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <button onClick={onBack} className='flex items-center text-slate-500 hover:text-red-700 font-semibold transition-colors group' disabled={loading}>
          <ArrowLeft size={20} className='mr-2 group-hover:-translate-x-1 transition-transform' /> Volver al Inventario
        </button>

        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm self-center">
          <button
            onClick={() => setViewMode('standard')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'standard' ? 'bg-red-600 text-white shadow-md' : 'text-slate-50 hover:bg-slate-50 text-slate-400'}`}
          >
            <Monitor size={16} /> Estándar
          </button>
          <button
            onClick={() => setViewMode('social')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'social' ? 'bg-red-600 text-white shadow-md' : 'text-slate-50 hover:bg-slate-50 text-slate-400'}`}
          >
            <Instagram size={16} /> Instagram Mode
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className='bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden'>

          {/* VISTA DINÁMICA: ESTÁNDAR VS SOCIAL */}
          <div className='grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-slate-100 min-h-[550px]'>

            <div className={`lg:col-span-8 bg-slate-900 relative overflow-hidden flex items-center justify-center transition-all duration-500 ${viewMode === 'social' ? 'bg-slate-100 p-8' : ''}`}>

              {viewMode === 'social' ? (
                <div className="relative group animate-in zoom-in-95 duration-500">
                  {/* Selector de Proporción Flotante */}
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAspectRatio('4/5')}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-all border-2 ${aspectRatio === '4/5' ? 'bg-black text-white border-black shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}
                    >4:5 Portrait</button>
                    <button
                      type="button"
                      onClick={() => setAspectRatio('5/4')}
                      className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-all border-2 ${aspectRatio === '5/4' ? 'bg-black text-white border-black shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'}`}
                    >5:4 Landscape</button>
                  </div>

                  {/* Marco de Instagram Simulator */}
                  <div
                    className={`bg-white shadow-2xl rounded-sm overflow-hidden transition-all duration-500 ease-out`}
                    style={{
                      width: aspectRatio === '4/5' ? '360px' : '450px',
                      height: aspectRatio === '4/5' ? '450px' : '360px'
                    }}
                  >
                    <div className="flex items-center p-3 gap-2 border-b border-slate-50">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
                        <div className="w-full h-full rounded-full bg-white p-[2px]">
                          <div className="w-full h-full rounded-full bg-slate-200"></div>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-slate-800 lowercase">dealer.carbot</span>
                    </div>

                    <div className="relative h-full">
                      <img
                        src={formData.images[activePhotoIndex]}
                        className='w-full h-full object-cover transition-transform duration-700'
                        alt="Vista IG"
                      />
                      {formData.images.length > 1 && (
                        <>
                          <button type="button" onClick={(e) => { e.preventDefault(); prevPhoto(); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-slate-800 hover:bg-white transition-all opacity-0 group-hover:opacity-100"><ChevronLeft size={16} /></button>
                          <button type="button" onClick={(e) => { e.preventDefault(); nextPhoto(); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center text-slate-800 hover:bg-white transition-all opacity-0 group-hover:opacity-100"><ChevronRight size={16} /></button>
                          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur text-white text-[10px] px-2 py-1 rounded-full">{activePhotoIndex + 1}/{formData.images.length}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <img
                    src={formData.images[activePhotoIndex] || formData.image}
                    className='w-full h-full object-contain subpixel-antialiased'
                    alt="Vista principal"
                  />
                  <div className='absolute bottom-8 left-8 text-white z-10'>
                    <h1 className='text-4xl font-black subpixel-antialiased drop-shadow-2xl mb-1 capitalize'>{formData.make} {formData.model}</h1>
                    <p className='text-slate-300 font-bold drop-shadow-xl text-lg opacity-90'>{formData.year} • {formData.edition || 'Edición Estándar'}</p>
                  </div>
                  <div className='absolute top-8 right-8 bg-red-600 text-white px-6 py-2.5 rounded-2xl text-lg font-black shadow-[0_10px_30px_-5px_rgba(220,38,38,0.5)] border border-red-500'>
                    {currency === 'USD' ? 'US$' : 'RD$'} {Number(formData.price_unified || 0).toLocaleString()}
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                </>
              )}
            </div>

            {/* MINIATURAS LATERALES */}
            <div className='lg:col-span-4 p-8 bg-slate-50/50 backdrop-blur-3xl h-[550px] flex flex-col'>
              <div className="flex items-center justify-between mb-6">
                <h3 className='text-slate-900 font-black text-xs uppercase tracking-[0.2em]'>Galería de Unidad</h3>
                <span className='text-[10px] font-black bg-white border border-slate-200 px-3 py-1 rounded-full text-slate-500 shadow-sm'>{formData.images.length} FOTOS</span>
              </div>

              <div className='grid grid-cols-3 gap-3 overflow-y-auto pr-2 custom-scrollbar'>
                {formData.images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`aspect-square rounded-2xl overflow-hidden cursor-pointer border-4 transition-all duration-300 ${activePhotoIndex === idx ? 'border-red-600 shadow-xl shadow-red-600/20' : 'border-white hover:border-slate-200 shadow-sm'}`}
                  >
                    <img src={img} className='w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all' />
                  </div>
                ))}
              </div>

              <div className='mt-auto pt-8'>
                <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
                  <p className='text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2'>Control Social</p>
                  <p className='text-xs text-slate-600 leading-relaxed italic'>Previsualiza tus publicaciones antes de subir las fotos a tu cuenta de Instagram para asegurar el recorte perfecto.</p>
                </div>
              </div>
            </div>
          </div>

          {/* FORMULARIO TÉCNICO */}
          <div className='p-10'>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
              <div className='space-y-8 lg:border-r border-slate-100 pr-6'>
                <h4 className='text-[11px] font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2 mb-2'>
                  <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center"><Calendar size={12} className="text-slate-500" /></div>
                  Especulación
                </h4>
                <div className='space-y-5'>
                  <Input label="Año" name="year" value={formData.year} onChange={handleChange} disabled={loading} />
                  <Input label="Edición" name="edition" value={formData.edition} onChange={handleChange} disabled={loading} />
                </div>
              </div>

              <div className='space-y-8 lg:border-r border-slate-100 pr-6'>
                <h4 className='text-[11px] font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2 mb-2'>
                  <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center"><Settings size={12} className="text-slate-500" /></div>
                  Transmisión
                </h4>
                <div className='space-y-5'>
                  <Input label="Transmisión" name="transmission" value={formData.transmission} onChange={handleChange} disabled={loading} />
                  <Input label="Tracción" name="traction" value={formData.traction} onChange={handleChange} disabled={loading} />
                </div>
              </div>

              <div className='space-y-8 lg:border-r border-slate-100 pr-6'>
                <h4 className='text-[11px] font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2 mb-2'>
                  <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center"><Fuel size={12} className="text-slate-500" /></div>
                  Consumo
                </h4>
                <div className='space-y-5'>
                  <Input label="Combustible" name="fuel" value={formData.fuel} onChange={handleChange} disabled={loading} />
                  <Input label="Millaje" name="mileage" value={formData.mileage} onChange={handleChange} disabled={loading} />
                </div>
              </div>

              <div className='space-y-8'>
                <h4 className='text-[11px] font-black text-red-600 uppercase tracking-[0.15em] flex items-center gap-2 mb-2'>
                  <div className="w-5 h-5 rounded-md bg-red-50 flex items-center justify-center"><DollarSign size={12} className="text-red-600" /></div>
                  Cotización
                </h4>
                <div className='space-y-5'>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Precio Unificado</label>
                    <div className="flex shadow-sm rounded-xl overflow-hidden border border-slate-200 focus-within:ring-4 focus-within:ring-red-500/10 focus-within:border-red-500 transition-all">
                      <input
                        type="number"
                        value={formData.price_unified}
                        onChange={handlePriceChange}
                        disabled={loading}
                        className="flex-1 p-3 bg-slate-50 focus:bg-white outline-none font-black text-red-600"
                      />
                      <div className="flex bg-slate-100 border-l border-slate-200 p-1 gap-1">
                        <button
                          type="button"
                          onClick={() => setCurrency('USD')}
                          className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${currency === 'USD' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >US$</button>
                        <button
                          type="button"
                          onClick={() => setCurrency('DOP')}
                          className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${currency === 'DOP' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >RD$</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='mt-12 pt-10 border-t border-slate-100'>
              <h4 className='text-[11px] font-black text-slate-900 uppercase tracking-[0.15em] mb-4'>Identificación Serial</h4>
              <div className="relative group">
                <input
                  type='text'
                  name='vin'
                  placeholder="Introduce el Número de Chasis o VIN..."
                  value={formData.vin || formData.chassis}
                  onChange={handleChange}
                  className='w-full p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] font-mono text-xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all shadow-inner placeholder:text-slate-300'
                  disabled={loading}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"><IdCard size={24} /></div>
              </div>
            </div>
          </div>
        </div>

        <div className='flex justify-end sticky bottom-8 z-20 pb-4'>
          <button
            type='submit'
            className='bg-red-600 text-white px-12 py-5 rounded-[2rem] flex items-center gap-4 hover:bg-slate-900 font-black text-lg shadow-[0_20px_50px_-15px_rgba(220,38,38,0.4)] hover:shadow-slate-900/40 transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none'
            disabled={loading}
          >
            {loading ? <><div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></div> Procesando...</> : <><Save size={24} /> Aplicar Cambios</>}
          </button>
        </div>
      </form>
    </div>
  );
}
