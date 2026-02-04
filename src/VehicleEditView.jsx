import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, Calendar, Fuel, Settings, Save, DollarSign,
  IdCard, Maximize, ChevronLeft, ChevronRight, ChevronDown,
  X, Info, Share2, Heart, Files, CheckCircle, Lock, Trash2, Camera,
  ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon
} from 'lucide-react';

const formatWithCommas = (value) => {
  if (!value && value !== 0) return '';
  const str = value.toString().replace(/\D/g, '');
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseCommaNumber = (str) => {
  return str.toString().replace(/,/g, '');
};

const Input = ({ label, type = "text", className = "", ...props }) => (
  <div className="group">
    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-600">{label}</label>
    <div className="relative">
      <input
        type={type}
        className={`w-full px-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl text-slate-900 font-bold text-sm focus:outline-none focus:bg-white focus:border-red-500/20 focus:ring-4 focus:ring-red-500/5 transition-all outline-none ${className}`}
        {...props}
      />
    </div>
  </div>
);

const Select = ({ label, options = [], name, value, onChange, disabled, className = "", ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    if (disabled) return;
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { name, value: val } });
    }
  };

  const currentValue = value ?? (typeof options[0] === 'object' ? options[0].value : options[0]);
  const currentOption = options.find(opt => (typeof opt === 'object' ? opt.value : opt) === currentValue);
  const displayLabel = currentOption ? (typeof currentOption === 'object' ? currentOption.label : currentOption) : "-";

  return (
    <div className={`group relative ${className}`} ref={dropdownRef}>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-600 min-h-[24px] flex items-end">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl text-slate-900 font-bold text-sm transition-all outline-none ${isOpen ? 'bg-white border-red-500/20 ring-4 ring-red-500/5' : 'hover:bg-slate-100'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-red-500' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-2 p-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[110] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1">
            {options.map((opt, i) => {
              const val = typeof opt === 'object' ? opt.value : opt;
              const labelText = typeof opt === 'object' ? opt.label : opt;
              const isActive = currentValue === val;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(val)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive
                    ? 'bg-red-50 text-red-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-red-500'
                    }`}
                >
                  {labelText}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const FormInput = ({ label, icon: Icon, name, value, onChange, type = "text", disabled, isSold, className = "" }) => (
  <div className="flex flex-col gap-2 group">
    {label && (
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-600 min-h-[24px] flex items-end">
        {label}
      </label>
    )}
    <div className={`relative flex items-center bg-slate-50 border-2 border-slate-50 rounded-2xl focus-within:bg-white focus-within:border-red-500/20 focus-within:ring-4 focus-within:ring-red-500/5 transition-all outline-none ${isSold ? 'opacity-60 grayscale-[0.5]' : ''} ${className}`}>
      {Icon && <div className="pl-4 text-slate-400 group-focus-within:text-red-500 transition-colors"><Icon size={18} /></div>}
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled || isSold}
        className="w-full px-4 py-3 bg-transparent text-slate-900 font-bold text-sm outline-none placeholder:text-slate-300"
      />
    </div>
  </div>
);

export default function VehicleEditView({ vehicle, contract, onBack, onSave, readOnly = false }) {
  const [loading, setLoading] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [currency, setCurrency] = useState(vehicle?.currency || (vehicle?.price_dop > 0 ? 'DOP' : 'USD'));
  const [downPaymentCurrency, setDownPaymentCurrency] = useState(vehicle?.downPaymentCurrency || (vehicle?.initial_payment_dop > 0 ? 'DOP' : 'USD'));
  const [mileageUnit, setMileageUnit] = useState(vehicle?.mileage_unit || 'MI');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

  const onSwipeEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) nextPhoto();
    if (isRightSwipe) prevPhoto();
  };

  const isSold = vehicle?.status === 'sold';

  const [formData, setFormData] = useState({
    ...vehicle,
    images: vehicle?.images || (vehicle?.image ? [vehicle.image] : []),
    photos: vehicle?.photos || [],
    documents: vehicle?.documents || [],
    plate: vehicle?.plate || '',
    price_unified: (vehicle?.price_dop > 0 ? vehicle.price_dop : (vehicle?.price || 0)).toString(),
    initial_unified: (vehicle?.initial_payment_dop > 0 ? vehicle.initial_payment_dop : (vehicle?.initial_payment || 0)).toString()
  });

  useEffect(() => {
    if (vehicle) {
      setFormData(prev => ({
        ...prev,
        ...vehicle,
        images: vehicle?.images || (vehicle?.image ? [vehicle.image] : []),
        photos: vehicle?.photos || [],
        plate: vehicle.plate || '',
        price_unified: (vehicle?.price_dop > 0 ? vehicle.price_dop : (vehicle?.price || 0)).toString(),
        initial_unified: (vehicle?.initial_payment_dop > 0 ? vehicle.initial_payment_dop : (vehicle?.initial_payment || 0)).toString()
      }));
      setCurrency(vehicle.currency || (vehicle.price_dop > 0 ? 'DOP' : 'USD'));
      setDownPaymentCurrency(vehicle.downPaymentCurrency || (vehicle.initial_payment_dop > 0 ? 'DOP' : 'USD'));
      setMileageUnit(vehicle.mileage_unit || 'MI');
    }
  }, [vehicle]);

  if (!vehicle) return null;

  const handlePriceChange = (e) => {
    if (isSold || readOnly) return;
    const { value } = e.target;
    const cleanValue = parseCommaNumber(value);
    setFormData(prev => ({ ...prev, price_unified: cleanValue }));
  };

  const handleInitialChange = (e) => {
    if (isSold || readOnly) return;
    const { value } = e.target;
    const cleanValue = parseCommaNumber(value);
    setFormData(prev => ({ ...prev, initial_unified: cleanValue }));
  };

  const handleChange = (e) => {
    if (isSold || readOnly) return;
    const { name, value } = e.target;

    let finalValue = value;

    // Special handling for VIN/Chassis: No 'O' allowed (both cases)
    if (['vin', 'chassis'].includes(name)) {
      finalValue = finalValue.replace(/o/gi, '');
    }

    // Enforce uppercase for specific fields
    const upperFields = ['make', 'model', 'edition', 'vin', 'chassis', 'color', 'plate'];
    if (upperFields.includes(name)) {
      finalValue = finalValue.toUpperCase();
    }

    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || isSold) return;
    setLoading(true);
    try {
      const priceVal = Number(formData.price_unified);
      const initialVal = Number(formData.initial_unified);
      const { price_unified: _tmp, initial_unified: _tmp2, ...dataToSave } = {
        ...formData,
        image: formData.images?.[0] || formData.image,
        price: currency === 'USD' ? priceVal : 0,
        price_dop: currency === 'DOP' ? priceVal : 0,
        currency: currency,
        initial_payment: downPaymentCurrency === 'USD' ? initialVal : 0,
        initial_payment_dop: downPaymentCurrency === 'DOP' ? initialVal : 0,
        downPaymentCurrency: downPaymentCurrency,
        mileage_unit: mileageUnit
      };
      if (!readOnly) await onSave(dataToSave);
    } catch (error) {
      console.error("Error saving vehicle:", error);
      alert("Error al guardar los cambios.");
    } finally {
      setLoading(false);
    }
  };

  const nextPhoto = () => setActivePhotoIndex(prev => (prev + 1) % formData.images.length);
  const prevPhoto = () => setActivePhotoIndex(prev => (prev - 1 + formData.images.length) % formData.images.length);

  const movePhotoLeft = (e, index) => {
    e.stopPropagation();
    if (index === 0 || readOnly) return;
    const newImages = [...formData.images];
    [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    setFormData(prev => ({ ...prev, images: newImages }));
    if (activePhotoIndex === index) setActivePhotoIndex(index - 1);
    else if (activePhotoIndex === index - 1) setActivePhotoIndex(index);
  };

  const movePhotoRight = (e, index) => {
    e.stopPropagation();
    if (index === formData.images.length - 1 || readOnly) return;
    const newImages = [...formData.images];
    [newImages[index + 1], newImages[index]] = [newImages[index], newImages[index + 1]];
    setFormData(prev => ({ ...prev, images: newImages }));
    if (activePhotoIndex === index) setActivePhotoIndex(index + 1);
    else if (activePhotoIndex === index + 1) setActivePhotoIndex(index);
  };

  const setAsCover = (e, index) => {
    e.stopPropagation();
    if (index === 0) return;
    const newImages = [...formData.images];
    const target = newImages.splice(index, 1)[0];
    newImages.unshift(target);
    setFormData(prev => ({ ...prev, images: newImages }));
    setActivePhotoIndex(0);
  };

  const removePhoto = (e, index) => {
    e.stopPropagation();
    if (readOnly) return;
    if (confirm('¿Eliminar esta foto?')) {
      const newImages = formData.images.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, images: newImages }));
      if (activePhotoIndex >= newImages.length) {
        setActivePhotoIndex(Math.max(0, newImages.length - 1));
      }
    }
  };


  if (readOnly) {
    return (
      <div className='animate-in fade-in duration-700 p-3 sm:p-6 lg:p-10 max-w-[1400px] mx-auto bg-white min-h-screen'>
        {/* PUBLIC HEADER */}
        <div className="flex justify-between items-center mb-6 sm:mb-12">
          <button onClick={onBack} className='flex items-center text-slate-400 hover:text-red-700 font-black transition-all group px-3 py-2 hover:bg-red-50 rounded-2xl'>
            <ArrowLeft size={20} className='mr-2 group-hover:-translate-x-1 transition-transform' />
            <span className="text-xs uppercase tracking-[0.2em]">CERRAR VISTA</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">DOCUMENTO OFICIAL CARBOT</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16">
          {/* LEFT: MEDIA GALLERY */}
          <div className="lg:col-span-7 space-y-6">
            <div className="relative group rounded-[2rem] overflow-hidden bg-slate-100 aspect-[16/10] shadow-2xl border border-slate-100">
              <img
                src={formData.images[activePhotoIndex] || 'https://via.placeholder.com/800x500'}
                alt="Main"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                onClick={() => setIsLightboxOpen(true)}
              />

              <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none">
                <div className="flex justify-between items-end">
                  <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest">
                    FOTO {activePhotoIndex + 1} / {formData.images.length}
                  </div>
                </div>
              </div>
            </div>

            {/* THUMBNAILS */}
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
              {formData.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`relative shrink-0 w-24 h-16 rounded-xl overflow-hidden border-2 transition-all ${idx === activePhotoIndex ? 'border-red-600 scale-105 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={img} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* RIGHT: SPECS & PRICING */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-10">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="bg-red-50 text-red-700 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100">
                  {formData.year || '2025'}
                </span>
                <span className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                  {formData.status === 'sold' ? 'VENDIDO' : 'DISPONIBLE'}
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter leading-none mb-4">
                {formData.make} <span className="text-red-700">{formData.model}</span>
              </h1>

              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mb-8">
                {formData.edition || 'VERSIÓN ESTÁNDAR'} • {formData.color || 'COLOR'}
              </p>

              <div className="h-px w-full bg-slate-100 mb-10"></div>

              {/* PRICING GRID */}
              <div className="grid grid-cols-2 gap-6 mb-12">
                <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">PRECIO DE VENTA</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-black text-red-700">{currency}</span>
                    <span className="text-3xl font-black text-slate-900">{Number(formData.price_unified).toLocaleString()}</span>
                  </div>
                </div>
                <div className="bg-red-700 p-6 rounded-[2rem] shadow-xl shadow-red-600/20 text-white">
                  <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2">INICIAL REQUERIDO</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-black text-white/80">{downPaymentCurrency}</span>
                    <span className="text-3xl font-black">{Number(formData.initial_unified).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* TECH GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-2 gap-4">
                {[
                  { label: 'Transmisión', value: formData.transmision, icon: Settings },
                  { label: 'Motor', value: formData.motor, icon: Fuel },
                  { label: 'Kilometraje', value: `${formData.mileage} ${mileageUnit}`, icon: Activity },
                  { label: 'Tracción', value: formData.traccion, icon: Zap },
                  { label: 'Asientos', value: `${formData.asientos} Filas`, icon: User },
                  { label: 'Combustible', value: formData.combustible, icon: Fuel }
                ].filter(s => s.value && s.value !== 'undefined').map((spec, i) => (
                  <div key={i} className="flex flex-col p-5 bg-white border border-slate-100 rounded-3xl hover:border-red-100 transition-colors group">
                    <div className="p-2.5 bg-slate-50 rounded-xl w-fit mb-3 group-hover:bg-red-50 transition-colors">
                      <spec.icon size={18} className="text-slate-400 group-hover:text-red-600" />
                    </div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{spec.label}</p>
                    <p className="text-xs font-black text-slate-800 uppercase">{spec.value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-12 pt-8 border-t border-slate-100">
                <button className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-700 transition-all active:scale-95 shadow-2xl">
                  SOLICITAR INFORMACIÓN
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* DETAILS SECTION */}
        <div className="mt-20">
          <div className="inline-block border-b-4 border-red-600 pb-2 mb-8">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-wider">Equipamiento & Detalles</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="prose prose-slate max-w-none">
              <p className="text-slate-600 leading-relaxed font-medium">
                {formData.notes || "Este vehículo ha sido inspeccionado y cumple con los estándares de calidad de CarBot. Cuenta con todos sus documentos en regla y está listo para traspaso inmediato."}
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-3">
                  <CheckCircle size={20} />
                  <span className="text-xs font-black uppercase tracking-widest">Garantía de Motor & Transmisión</span>
                </div>
                <span className="text-[10px] font-black">ACTIVA</span>
              </div>
              <div className="flex items-center justify-between p-4 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <Shield size={20} />
                  <span className="text-xs font-black uppercase tracking-widest">Certificado CarBot Libre Accidentes</span>
                </div>
                <span className="text-[10px] font-black">VERIFICADO</span>
              </div>
            </div>
          </div>
        </div>

        {isLightboxOpen && (
          <div className="fixed inset-0 z-[100] bg-black/98 flex flex-col pt-12" onClick={() => setIsLightboxOpen(false)}>
            <div className="absolute top-8 right-8 text-white/50 hover:text-white cursor-pointer transition-colors">
              <X size={40} strokeWidth={1.5} />
            </div>

            <div className="flex-1 flex items-center justify-center relative p-10" onClick={e => e.stopPropagation()}>
              <button onClick={prevPhoto} className="absolute left-4 sm:left-10 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full backdrop-blur-md transition-all">
                <ChevronLeft size={32} />
              </button>

              <img
                src={formData.images[activePhotoIndex]}
                className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
                alt="Lightbox"
              />

              <button onClick={nextPhoto} className="absolute right-4 sm:right-10 p-4 bg-white/5 hover:bg-white/10 text-white rounded-full backdrop-blur-md transition-all">
                <ChevronRight size={32} />
              </button>
            </div>

            <p className="text-center text-white/40 text-[10px] font-black uppercase tracking-[0.5em] pb-12">
              {activePhotoIndex + 1} / {formData.images.length}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className='animate-in fade-in duration-700 p-4 pb-40 md:p-8 max-w-[1600px] mx-auto'>
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

      {/* MOBILE TITLE (Visible only on mobile) */}
      <div className="block xl:hidden mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-red-600 font-extrabold text-lg tracking-tighter">{formData.year}</span>
          <span className="w-1 h-1 rounded-full bg-slate-300"></span>
          <span className="text-slate-400 font-bold text-xs uppercase">{formData.color}</span>
        </div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">
          {formData.make} <span className="text-red-600">{formData.model}</span>
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-12 gap-8 xl:gap-10">

        {/* LEFT PANEL: GALLERY & VISUALS */}
        <div className="xl:col-span-8 space-y-4 md:space-y-8">
          <div className="relative bg-white rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-2xl transition-all duration-700 border-4 md:border-8 border-white h-[400px] md:h-[650px]">
            <div className="w-full h-full relative group cursor-zoom-in flex items-center justify-center" onClick={() => formData.images.length > 0 && setIsLightboxOpen(true)}>
              {formData.images.length > 0 ? (
                <img
                  src={formData.images[activePhotoIndex]}
                  className='max-w-full max-h-full object-contain'
                  alt="Vista principal"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300">
                  <Camera size={64} className="mb-4 opacity-50" />
                  <p className="font-bold text-lg">Sin Imágenes</p>
                </div>
              )}
              {formData.images.length > 0 && (
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-md p-4 rounded-full text-white">
                    <Maximize size={32} />
                  </div>
                </div>
              )}

              {/* NAV CONTROLS */}
              {formData.images.length > 1 && (
                <div className="absolute inset-x-2 sm:inset-x-8 top-[65%] sm:top-[75%] -translate-y-1/2 flex justify-between pointer-events-none">
                  <button type="button" onClick={(e) => { e.stopPropagation(); prevPhoto(); }} className="p-2 sm:p-3 rounded-full bg-white hover:bg-red-600 text-red-600 hover:text-white backdrop-blur-sm transition-all pointer-events-auto shadow-xl border border-red-500/10"><ChevronLeftIcon size={16} className="sm:w-6 sm:h-6" /></button>
                  <button type="button" onClick={(e) => { e.stopPropagation(); nextPhoto(); }} className="p-2 sm:p-3 rounded-full bg-white hover:bg-red-600 text-red-600 hover:text-white backdrop-blur-sm transition-all pointer-events-auto shadow-xl border border-red-500/10"><ChevronRightIcon size={16} className="sm:w-6 sm:h-6" /></button>
                </div>
              )}


            </div>
          </div>

          {/* MOBILE THUMBNAILS GRID (Visible only on mobile) */}
          <div className="block xl:hidden pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Files size={14} className="text-red-500" />
                Carrete ({formData.images.length})
              </h3>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {formData.images.map((img, idx) => (
                <div
                  key={idx}
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border-2 sm:border-[3px] relative group ${activePhotoIndex === idx ? 'border-red-600 scale-95 shadow-md' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />

                  {/* COMPACT OVERLAY CONTROLS FOR SIDEBAR */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-0.5">
                    <div className="flex justify-between">
                      <button type="button" onClick={(e) => movePhotoLeft(e, idx)} className="p-0.5 bg-white/20 hover:bg-white text-white hover:text-red-600 rounded backdrop-blur-sm"><ChevronLeft size={10} /></button>
                      <button type="button" onClick={(e) => movePhotoRight(e, idx)} className="p-0.5 bg-white/20 hover:bg-white text-white hover:text-red-600 rounded backdrop-blur-sm"><ChevronRight size={10} /></button>
                    </div>
                    <button type="button" onClick={(e) => removePhoto(e, idx)} className="absolute top-0.5 right-0.5 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm"><Trash2 size={10} /></button>

                    {idx !== 0 && (
                      <button type="button" onClick={(e) => setAsCover(e, idx)} className="w-full py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[6px] font-black uppercase rounded shadow-sm">Portada</button>
                    )}
                  </div>
                  {idx === 0 && <div className="absolute top-0.5 left-0.5 px-1 py-0.5 bg-emerald-500 text-white text-[6px] font-black rounded shadow-sm leading-none">PORTADA</div>}
                </div>
              ))}
            </div>
          </div>


        </div>

        {/* RIGHT PANEL: INFO & CONTROLS */}
        <div className="xl:col-span-4 space-y-4 md:space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-slate-100 flex flex-col gap-6 md:gap-8">

            {/* 1. TITLE / HEADER SECTION (Desktop Only) */}
            <div className="hidden xl:block space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-extrabold text-xl tracking-tighter">{formData.year}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200"></span>
                <span className="text-slate-400 font-bold text-sm uppercase">{formData.color}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">
                {formData.make} <br />
                <span className="text-red-700">{formData.model}</span>
              </h2>
            </div>

            {/* 2. PRICING SECTION */}
            {!isSold && (
              <div className="space-y-6">
                {/* MAIN PRICE DISPLAY / EDIT */}
                <div className="relative group">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 group-focus-within:text-red-600 transition-colors">
                      <DollarSign size={14} className="text-red-500" /> Precio de Venta
                    </label>
                    <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner scale-90 origin-right">
                      {['USD', 'DOP'].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCurrency(c)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${currency === c ? 'bg-white text-red-600 shadow-md transform scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                        >{c === 'USD' ? 'US$' : 'RD$'}</button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-baseline gap-3 group-focus-within:translate-x-1 transition-transform">
                    <span className="text-4xl md:text-5xl font-black text-red-600 tracking-tighter shrink-0">{currency === 'USD' ? 'US$' : 'RD$'}</span>
                    <input
                      type="text"
                      value={formatWithCommas(formData.price_unified)}
                      onChange={handlePriceChange}
                      className="w-full bg-transparent text-4xl md:text-5xl font-black text-slate-900 outline-none border-b-4 border-transparent focus:border-red-600/20 pb-1 transition-all placeholder:text-slate-100"
                      placeholder="0"
                    />
                  </div>

                  {/* INITIAL PAYMENT - WITH ITS OWN CURRENCY TOGGLE */}
                  <div className="mt-8 pt-6 border-t border-slate-100/80">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-focus-within:text-red-600 transition-colors">Pago Inicial Sugerido</label>
                      <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner scale-90 origin-right">
                        {['USD', 'DOP'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setDownPaymentCurrency(c)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${downPaymentCurrency === c ? 'bg-white text-red-600 shadow-md transform scale-105' : 'text-slate-400 hover:text-slate-600'}`}
                          >{c === 'USD' ? 'US$' : 'RD$'}</button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 transition-all">
                      <span className="text-xl font-bold text-slate-400">{downPaymentCurrency === 'USD' ? 'US$' : 'RD$'}</span>
                      <input
                        type="text"
                        value={formatWithCommas(formData.initial_unified) || ''}
                        onChange={handleInitialChange}
                        className="bg-transparent text-2xl font-black text-slate-600 outline-none w-full border-b-2 border-transparent focus:border-slate-200 transition-all placeholder:text-slate-200"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SOLD CONTEXT SECTION - Showing if applicable */}
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
                      <p className="text-[8px] sm:text-[10px] font-black text-emerald-100 uppercase mb-0.5 sm:mb-1 tracking-widest">NOMBRE DEL CLIENTE</p>
                      <p className="text-lg sm:text-xl font-black">{contract?.client || vehicle?.soldToName || 'N/A'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="p-3 sm:p-4 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/10">
                        <p className="text-[8px] sm:text-[10px] font-black text-emerald-100 uppercase mb-0.5 sm:mb-1 tracking-widest">CÉDULA</p>
                        <p className="text-xs sm:text-sm font-black whitespace-nowrap">
                          {contract?.clientCedula || vehicle?.soldToCedula || 'N/A'}
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-sm border border-white/10">
                        <p className="text-[8px] sm:text-[10px] font-black text-emerald-100 uppercase mb-0.5 sm:mb-1 tracking-widest">PRECIO</p>
                        <p className="text-xs sm:text-sm font-black text-right whitespace-nowrap">
                          {vehicle?.soldPrice ? `RD$ ${(vehicle.soldPrice).toLocaleString()}` : (contract?.price ? `RD$ ${(contract.price).toLocaleString()}` : 'N/A')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* THUMBNAILS GRID - NOW IN RIGHT PANEL (Desktop Only) */}
            <div className="hidden xl:block pt-6 border-t border-slate-100">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Files size={14} className="text-red-500" />
                  Carrete ({formData.images.length})
                </h3>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {formData.images.map((img, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`aspect-square rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border-2 sm:border-[3px] relative group ${activePhotoIndex === idx ? 'border-red-600 scale-95 shadow-md' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />

                    {/* COMPACT OVERLAY CONTROLS FOR SIDEBAR */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-0.5">
                      <div className="flex justify-between">
                        <button type="button" onClick={(e) => movePhotoLeft(e, idx)} className="p-0.5 bg-white/20 hover:bg-white text-white hover:text-red-600 rounded backdrop-blur-sm"><ChevronLeft size={10} /></button>
                        <button type="button" onClick={(e) => movePhotoRight(e, idx)} className="p-0.5 bg-white/20 hover:bg-white text-white hover:text-red-600 rounded backdrop-blur-sm"><ChevronRight size={10} /></button>
                      </div>
                      <button type="button" onClick={(e) => removePhoto(e, idx)} className="absolute top-0.5 right-0.5 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-full backdrop-blur-sm"><Trash2 size={10} /></button>

                      {idx !== 0 && (
                        <button type="button" onClick={(e) => setAsCover(e, idx)} className="w-full py-0.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[6px] font-black uppercase rounded shadow-sm">Portada</button>
                      )}
                    </div>
                    {idx === 0 && <div className="absolute top-0.5 left-0.5 px-1 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded shadow-sm leading-none">PORTADA</div>}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. SAVE BUTTON AT BOTTOM */}
          </div>
        </div>

        {/* FULL WIDTH BOTTOM: FICHA TÉCNICA */}
        <div className="xl:col-span-12 -mt-2">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 mb-8">
              <Info size={18} className="text-red-600" /> Ficha Técnica Completa
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-12 gap-y-8">

              {/* COL 1: INFO BÁSICA */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                  <IdCard size={14} /> Información Básica
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormInput label="Año" name="year" value={formData.year || ''} onChange={handleChange} placeholder="-" />
                  <FormInput label="Color" name="color" value={formData.color || ''} onChange={handleChange} placeholder="-" />
                </div>
                <FormInput label="Edición / Versión" name="edition" value={formData.edition || ''} onChange={handleChange} placeholder="-" />

                {/* MILAJE MOVED HERE */}
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-600">Kilometraje</label>
                  <div className="flex bg-slate-50 border-2 border-slate-50 rounded-2xl overflow-hidden focus-within:bg-white focus-within:border-red-500/20 focus-within:ring-4 focus-within:ring-red-500/5 transition-all outline-none">
                    <input
                      name="mileage"
                      value={(formData.mileage && formData.mileage != 0 && formData.mileage !== "0") ? formData.mileage : ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-transparent text-slate-900 font-bold text-sm outline-none"
                      placeholder="-"
                    />
                    <div className="bg-slate-100 flex p-1 items-center border-l border-slate-200 shrink-0">
                      <div className="flex bg-slate-200/50 p-1 rounded-lg">
                        {['KM', 'MI'].map((unit) => (
                          <button
                            key={unit}
                            type="button"
                            onClick={() => setMileageUnit(unit)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${mileageUnit === unit ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            {unit === 'KM' ? 'KM' : 'MILLA'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput label="Chasis / VIN" name="vin" value={formData.vin || formData.chassis || ''} onChange={handleChange} className="font-mono text-xs tracking-wider" placeholder="-" />
                  <FormInput label="Placa" name="plate" value={formData.plate || ''} onChange={handleChange} className="font-mono text-xs tracking-wider" placeholder="-" />
                </div>
              </div>

              {/* COL 2: MECÁNICA GENERAL */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Settings size={14} /> Mecánica
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select label="Condición" name="condition" value={formData.condition || ''} onChange={handleChange} options={['Usado', 'Recién Importado', 'Nuevo', 'Certificado']} />
                  <Select label="CARFAX" name="clean_carfax" value={formData.clean_carfax || ''} onChange={handleChange} options={['CLEAN CARFAX', '-']} />
                  <Select label="Tipo de Vehículo" name="vehicle_type" value={formData.vehicle_type || ''} onChange={handleChange} options={['Automóvil', 'Jeepeta', 'Camión', 'Camioneta', 'Vehículo Pesado', 'Moto']} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Transmisión" name="transmission" value={formData.transmission || ''} onChange={handleChange} options={['Automática', 'Manual', 'CVT', 'Tiptronic']} />
                  <Select label="Tracción" name="traction" value={formData.traction || ''} onChange={handleChange} options={['FWD', 'RWD', 'AWD', '4x4']} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Combustible" name="fuel" value={formData.fuel || ''} onChange={handleChange} options={['Gasolina', 'Diesel', 'Híbrido', 'Eléctrico', 'GLP']} />
                  <Select label="Motor" name="engine_type" value={formData.engine_type || ''} onChange={handleChange} options={['Normal', 'Turbo', 'Supercharged', 'Híbrido']} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormInput label="Cilindros" name="engine_cyl" value={formData.engine_cyl || ''} onChange={handleChange} placeholder="-" />
                  <FormInput label="CC" name="engine_cc" value={formData.engine_cc || ''} onChange={handleChange} placeholder="-" />
                </div>
              </div>


              {/* COL 4: CONFORT & EXTRAS */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
                  <CheckCircle size={14} /> Confort y Extras
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Interior" name="seat_material" value={formData.seat_material || ''} onChange={handleChange} options={['Piel', 'Tela', 'Alcántara']} />
                  <Select label="Filas Asientos" name="seats" value={formData.seats || ''} onChange={handleChange} options={['2', '3', '4', '5']} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Techo" name="roof_type" value={formData.roof_type || ''} onChange={handleChange} options={['Normal', 'Sunroof', 'Panorámico']} />
                  <Select label="Baúl Eléctrico" name="trunk" value={formData.trunk || ''} onChange={handleChange} options={['No', 'Sí']} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Select label="CarPlay" name="carplay" value={formData.carplay || ''} onChange={handleChange} options={['Sí', 'No']} />
                  <Select label="Cámara" name="camera" value={formData.camera || ''} onChange={handleChange} options={['No', 'Reversa', '360°']} />
                </div>
                {/* SENSORS & WINDOWS */}
                <div className="grid grid-cols-2 gap-4">
                  <Select label="Sensores" name="sensors" value={formData.sensors || ''} onChange={handleChange} options={['Sí', 'No']} />
                  <Select label="Cristales Eléct." name="electric_windows" value={formData.electric_windows || ''} onChange={handleChange} options={['Sí', 'No']} />
                </div>
                {/* KEY */}
                <Select label="Llave" name="key_type" value={formData.key_type || ''} onChange={handleChange} options={['Llave Normal', 'Push Button']} />
              </div>

            </div>
          </div>
        </div>

        {/* FULL WIDTH BOTTOM: SAVE BUTTON */}
        <div className="xl:col-span-12">
          {!isSold && !readOnly && (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-6 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-600 transition-all shadow-xl shadow-slate-900/20 hover:shadow-red-600/20 active:scale-95 disabled:opacity-50"
            >
              {loading ? <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin"></div> : <><Save size={24} /> Guardar Cambios</>}
            </button>
          )}
        </div>

      </form>

      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-white/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300 overflow-hidden"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onSwipeEnd}
        >
          {/* HEADER - ABSOLUTE TO NOT PUSH CONTENT DOWN INCORRECTLY */}
          <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-4 sm:p-8 z-50 pointer-events-none">
            <div className="text-slate-900 pointers-events-auto">
              <h4 className="text-lg sm:text-xl font-black uppercase tracking-tighter text-red-600 line-clamp-1 drop-shadow-sm">{formData.make} {formData.model}</h4>
              <p className="text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-0.5 sm:mt-1">Foto {activePhotoIndex + 1} de {formData.images.length}</p>
            </div>
            <button
              onClick={() => setIsLightboxOpen(false)}
              className="p-3 sm:p-4 rounded-full bg-slate-100/80 text-slate-500 hover:bg-slate-100 hover:text-red-600 transition-all shadow-sm pointer-events-auto"
            >
              <X size={24} className="sm:w-[32px] sm:h-[32px]" />
            </button>
          </div>

          <div className="flex-1 w-full h-full flex items-center justify-center p-4 relative">
            <img
              src={formData.images[activePhotoIndex]}
              className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-lg"
              alt="Lightbox View"
            />

            {/* NAV CONTROLS FLOATING */}
            <div className="hidden sm:flex absolute inset-x-4 sm:inset-x-10 top-1/2 -translate-y-1/2 justify-between pointer-events-none">
              <button onClick={(e) => { e.stopPropagation(); prevPhoto(); }} className="p-3 sm:p-4 rounded-full bg-white text-red-600 hover:scale-110 transition-all shadow-2xl border border-red-100 flex items-center justify-center pointer-events-auto">
                <ChevronLeftIcon size={24} className="sm:w-8 sm:h-8" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); nextPhoto(); }} className="p-3 sm:p-4 rounded-full bg-white text-red-600 hover:scale-110 transition-all shadow-2xl border border-red-100 flex items-center justify-center pointer-events-auto">
                <ChevronRightIcon size={24} className="sm:w-8 sm:h-8" />
              </button>
            </div>
          </div>

          {/* THUMBNAILS CAROUSEL IN LIGHTBOX - MOBILE OPTIMIZED */}
          <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
            <div className="flex gap-2 sm:gap-3 overflow-x-auto max-w-full pointer-events-auto no-scrollbar py-2 px-2">
              {formData.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setActivePhotoIndex(idx); }}
                  className={`relative w-14 h-14 sm:w-16 sm:h-16 shrink-0 rounded-lg overflow-hidden transition-all duration-300 shadow-sm ${activePhotoIndex === idx ? 'ring-2 ring-red-600 scale-100 opacity-100' : 'opacity-40 hover:opacity-100 scale-95 grayscale'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
