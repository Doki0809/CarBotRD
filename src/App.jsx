import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
// import imageCompression from 'browser-image-compression';
import { db, auth, storage } from './firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { supabase } from './supabase.js';
import LoginView from './components/LoginView.jsx';
import {
  collection,
  onSnapshot,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  collectionGroup,
  query,
  where,
  getDocs
} from 'firebase/firestore';


import {
  LayoutDashboard, Car, FileText, LogOut, Plus, Search, Edit, Trash2,
  DollarSign, CheckCircle, X, Menu, User, Send, Loader2, FilePlus,
  CreditCard, FileSignature, Files, Fuel, Settings, IdCard, Trash, Undo, Printer, Eye, Download,
  PlusCircle, Box, ArrowUpRight, Building2, Fingerprint, Lock, EyeOff, Share2, Check, ArrowRight, Key, Copy, Link,
  AlertTriangle, TrendingUp, History, Bell, Calendar, Briefcase, Inbox, Headset, Sparkles, Camera,
  ChevronLeft, ChevronRight, Save, ChevronDown, MoreVertical, FileCode, AtSign, Building, LayoutGrid, ShieldCheck
} from 'lucide-react';
import VehicleEditView from './VehicleEditView';
import { generarContratoEnGHL } from './ghl_integration/ghlService';

// Importar html2pdf.js de forma dinámica para evitar problemas de SSR si fuera necesario, 
// o directamente ya que es una SPA de Vite.
// import html2pdf from 'html2pdf.js';

// --- SHARED STYLES FOR TEMPLATES ---
export const SHARED_QUILL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=Mirza:wght@400;700&family=Roboto:wght@400;700&family=Aref+Ruqaa:wght@400;700&display=swap');

  /* Reset */
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  /* Container and Base Typography */
  body, .ql-editor { 
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  /* Quill alignment classes */
  .ql-align-center { text-align: center !important; }
  .ql-align-right { text-align: right !important; }
  .ql-align-left { text-align: left !important; }
  .ql-align-justify { text-align: justify !important; }
  
  /* Quill indentation */
  .ql-indent-1 { padding-left: 3em !important; }
  .ql-indent-2 { padding-left: 6em !important; }
  .ql-indent-3 { padding-left: 9em !important; }
  .ql-indent-4 { padding-left: 12em !important; }
  .ql-indent-5 { padding-left: 15em !important; }
  
  /* Typography */
  h1 { font-size: 2.5em; font-weight: 800; margin-bottom: 0.5em; color: #0f172a; }
  h2 { font-size: 1.75em; font-weight: 700; margin-bottom: 0.5em; color: #0f172a; }
  h3 { font-size: 1.25em; font-weight: 700; margin-bottom: 0.5em; color: #0f172a; }
  p { margin: 0; padding: 0; min-height: 1.25em; }
  
  /* Lists */
  ul, ol { padding-left: 1.5em; margin: 0.75em 0; }
  li { margin: 0.4em 0; }
  
  /* Images */
  img { max-width: 100%; height: auto; display: block; margin: 15px auto; border-radius: 4px; }
  
  /* Quill font sizes */
  .ql-size-small { font-size: 0.8em; }
  .ql-size-large { font-size: 1.5em; }
  .ql-size-huge { font-size: 2.25em; }
  
  /* Quill fonts */
  .ql-font-serif { font-family: Georgia, 'Times New Roman', serif; }
  .ql-font-monospace { font-family: Monaco, 'Courier New', monospace; }
  .ql-font-mirza { font-family: 'Mirza', serif; }
  .ql-font-roboto { font-family: 'Roboto', sans-serif; }
  .ql-font-aref { font-family: 'Aref Ruqaa', serif; }
  .ql-font-helvetica { font-family: 'Helvetica', Arial, sans-serif; }
  .ql-font-inter { font-family: 'Inter', sans-serif; }
  .ql-font-arial { font-family: 'Arial', sans-serif; }
  .ql-font-calibri { font-family: 'Calibri', 'Candara', 'Segoe UI', sans-serif; }
  .ql-font-times-new-roman { font-family: 'Times New Roman', serif; }
  .ql-font-georgia { font-family: 'Georgia', serif; }
  .ql-font-verdana { font-family: 'Verdana', sans-serif; }
  
  /* Text styles */
  strong, b { font-weight: 700; color: #0f172a; }
  em, i { font-style: italic; }
  u { text-decoration: underline; }
  s { text-decoration: line-through; }
  
  /* Horizontal rules */
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
  
  /* Table support */
  table { border-collapse: collapse; width: 100%; margin: 20px 0; table-layout: fixed; }
  td, th { border: 1px solid #cbd5e1; padding: 12px; vertical-align: top; word-wrap: break-word; overflow-wrap: break-word; }
  th { background: #f8fafc; font-weight: 700; }
`;

// --- UI KIT ---
const Button = ({ children, variant = 'primary', className = '', icon: Icon, onClick, ...props }) => {
  const variants = {
    primary: 'bg-red-600 text-white hover:bg-red-500 shadow-glow-red-sm hover:shadow-glow-red',
    secondary: 'bg-glass text-white/80 border border-glass-border hover:border-glass-border-hover hover:bg-glass-light backdrop-blur-xl',
    ghost: 'bg-transparent text-white/50 hover:bg-white/5 hover:text-white/80',
    danger: 'bg-red-600/10 text-red-400 hover:bg-red-600/20 border border-red-600/20',
  };

  const hasManualBg = className.includes('bg-');
  const hasManualText = className.includes('text-');

  const baseClasses = `px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 active:scale-95`;
  const variantClasses = variants[variant] || variants.primary;

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${!hasManualBg && !hasManualText ? variantClasses : ''} ${className}`}
      {...props}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '', noPadding = false }) => {
  const hasBg = className.includes('bg-');
  return (
    <div className={`${hasBg ? '' : 'glass-card'} rounded-3xl overflow-hidden transition-all duration-300 ${className}`}>
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
};

const Badge = ({ status }) => {
  const styles = {
    available: "bg-red-600/15 text-red-400 border-red-600/20 ring-1 ring-red-600/20",
    quoted: "bg-amber-500/15 text-amber-400 border-amber-500/20 ring-1 ring-amber-500/20",
    sold: "bg-white/5 text-white/40 border-white/10 ring-1 ring-white/10",
    pending: "bg-orange-500/15 text-orange-400 border-orange-500/20 ring-1 ring-orange-500/20",
    signed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 ring-1 ring-emerald-500/20",
  };
  const labels = { available: "Disponible", quoted: "Cotizado", sold: "Vendido", pending: "Pendiente Firma", signed: "Firmado" };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.sold}`}>
      {labels[status] || status}
    </span>
  );
};

const Input = ({ label, className = "", type = "text", ...props }) => (
  <div className="mb-4 group text-left">
    {label && (
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-500">
        {label}
      </label>
    )}
    <input
      type={type}
      className={`w-full relative items-stretch shadow-sm rounded-xl px-4 py-3 border border-slate-200 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white font-bold text-slate-800 text-sm placeholder:text-slate-300 transition-all ${className}`}
      {...props}
    />
  </div>
);

const Select = ({ label, options = [], name, defaultValue, value, onChange, disabled, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || defaultValue || (options[0]?.value || options[0]));
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (value !== undefined) setSelectedValue(value);
  }, [value]);

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
    setSelectedValue(val);
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { name, value: val } });
    }
  };

  const currentOption = options.find(opt => (typeof opt === 'object' ? opt.value : opt) === selectedValue);
  const displayLabel = typeof currentOption === 'object' ? currentOption.label : currentOption || selectedValue;

  return (
    <div className="mb-4 group relative text-left" ref={dropdownRef}>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-500">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 shadow-sm rounded-xl font-bold text-sm text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 ${isOpen ? 'ring-2 ring-red-500/20 border-red-500' : 'hover:border-slate-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-red-500' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-2 p-2 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 z-[110] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1">
            {options.map((opt, i) => {
              const isObj = typeof opt === 'object' && opt !== null;
              const optionValue = isObj ? opt.value : opt;
              const optionLabel = isObj ? opt.label : opt;
              const isSelected = selectedValue === optionValue;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(optionValue)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-between
                    ${isSelected
                      ? 'bg-red-50 text-red-600'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  {optionLabel}
                  {isSelected && <Check size={16} className="text-red-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {/* Hidden field for FormData compatibility */}
      <input type="hidden" name={name} value={selectedValue} />
    </div>
  );
};

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => { const timer = setTimeout(onClose, 3000); return () => clearTimeout(timer); }, [onClose]);
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-2xl shadow-glass-lg backdrop-blur-2xl border border-glass-border transform transition-all duration-500 animate-fade-in ${type === 'success' ? 'bg-red-600/90 text-white' : 'bg-surface/90 text-white border-red-600/30'}`}>
      <CheckCircle size={20} className="mr-3" />
      <span className="font-medium tracking-wide">{message}</span>
    </div>
  );
};

const AppLogo = ({ className, size = 32, invert = false }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError) return <div className={`flex items-center justify-center ${invert ? 'text-white' : 'text-red-600'} ${className} `}><Car size={size} /></div>;
  return <img src="/logo.png" alt="Carbot" className={`${className} object-contain`} style={{ height: size, width: 'auto' }} onError={() => setHasError(true)} />;
};

// --- MODALES ---

const ActionSelectionModal = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full h-full sm:h-auto sm:max-w-sm animate-in zoom-in-95 duration-200">
        <Card className="h-full sm:h-auto rounded-none sm:rounded-[24px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">Seleccionar Acción</h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>
          <div className="grid gap-4">
            <button onClick={() => onSelect('quote')} className="flex items-center p-4 rounded-xl border border-gray-200 hover:border-red-500 hover:bg-red-50 transition-all group">
              <div className="p-3 bg-red-100 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors"><Send size={24} /></div>
              <div className="ml-4 text-left"><h4 className="font-bold text-slate-800 group-hover:text-red-700">Cotización</h4><p className="text-xs text-slate-500">Enviar ficha técnica y precio</p></div>
            </button>
            <button onClick={() => onSelect('contract')} className="flex items-center p-4 rounded-xl border border-gray-200 hover:border-red-500 hover:bg-red-50 transition-all group">
              <div className="p-3 bg-red-100 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors"><FilePlus size={24} /></div>
              <div className="ml-4 text-left"><h4 className="font-bold text-slate-800 group-hover:text-red-700">Contrato</h4><p className="text-xs text-slate-500">Generar documento legal</p></div>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const VehicleFormModal = ({ isOpen, onClose, onSave, initialData, userProfile }) => {
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [photos, setPhotos] = useState([]);
  const [currency, setCurrency] = useState('USD');
  const [downPaymentCurrency, setDownPaymentCurrency] = useState('USD');
  const [mileageUnit, setMileageUnit] = useState(initialData?.mileage_unit || 'MI');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [status, setStatus] = useState(initialData?.status || 'available');

  const formatWithCommas = (value) => {
    if (!value && value !== 0) return '';
    const str = value.toString().replace(/\D/g, '');
    return str.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const parseCommaNumber = (str) => {
    return str.toString().replace(/,/g, '');
  };

  const [prices, setPrices] = useState({
    price: initialData?.price_dop > 0 ? initialData.price_dop.toString() : (initialData?.price?.toString() || ''),
    initial: initialData?.initial_payment_dop > 0 ? initialData.initial_payment_dop.toString() : (initialData?.initial_payment?.toString() || '')
  });

  useEffect(() => {
    if (initialData && isOpen) {
      setCurrency(initialData.currency || (initialData.price_dop && !initialData.price ? 'DOP' : 'USD'));
      setDownPaymentCurrency(initialData.downPaymentCurrency || (initialData.initial_payment_dop && !initialData.initial_payment ? 'DOP' : 'USD'));
      setMileageUnit(initialData.mileage_unit || 'MI');
      setPrices({
        price: initialData.price_dop > 0 ? initialData.price_dop.toString() : (initialData.price?.toString() || ''),
        initial: initialData.initial_payment_dop > 0 ? initialData.initial_payment_dop.toString() : (initialData.initial_payment?.toString() || '')
      });
      setStatus(initialData.status || 'available');

      // Populate Photos
      if (initialData.images && Array.isArray(initialData.images)) {
        setPhotos(initialData.images.map(url => ({ url, isExisting: true, file: null })));
      } else if (initialData.image) {
        setPhotos([{ url: initialData.image, isExisting: true, file: null }]);
      } else {
        setPhotos([]);
      }
    } else if (!initialData && isOpen) {
      setCurrency('USD');
      setDownPaymentCurrency('USD');
      setMileageUnit('MI');
      setPrices({ price: '', initial: '' });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    const totalCurrent = photos.length;

    if (totalCurrent + files.length > 10) {
      alert(`Límite excedido.Máximo 10 fotos.`);
      return;
    }

    if (files.length > 0) {
      setIsOptimizing(true);
      try {
        // Dynamic import to avoid build/load issues
        const imageCompression = (await import('browser-image-compression')).default;

        const compressedFilesPromises = files.map(async (file) => {
          // Opciones de compresión inteligente
          const options = {
            maxSizeMB: 2,          // Límite de 2MB
            maxWidthOrHeight: 2000, // Resolución max 2000px
            useWebWorker: true,
            initialQuality: 0.9,   // Calidad visual alta
          };

          try {
            const compressedFile = await imageCompression(file, options);
            // Si por alguna razón la compresión falla o devuelve algo null, usamos el original
            return compressedFile || file;
          } catch (error) {
            console.error("Error al comprimir imagen:", error);
            return file; // Fallback al original
          }
        });

        const compressedFiles = await Promise.all(compressedFilesPromises);

        const newItems = compressedFiles.map(file => ({
          url: URL.createObjectURL(file),
          file: file,
          isExisting: false
        }));

        setPhotos(prev => [...prev, ...newItems]);
      } catch (error) {
        console.error("Error general procesando imágenes:", error);
        alert("Hubo un error procesando alguna de las imágenes.");
      } finally {
        setIsOptimizing(false);
      }
    }
  };

  const removeImage = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const movePhoto = (index, direction) => {
    const newPhotos = [...photos];
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= newPhotos.length) return;
    [newPhotos[index], newPhotos[nextIndex]] = [newPhotos[nextIndex], newPhotos[index]];
    setPhotos(newPhotos);
  };

  const setAsCover = (index) => {
    if (index === 0) return;
    const newPhotos = [...photos];
    const [target] = newPhotos.splice(index, 1);
    newPhotos.unshift(target);
    setPhotos(newPhotos);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // --- PRECIO ---
    const priceValue = Number(prices.price);
    data.price = priceValue;
    data.currency = currency;
    delete data.price_unified;

    // --- INICIAL ---
    const initialValue = Number(prices.initial);
    data.initial_payment = initialValue;
    data.downPaymentCurrency = downPaymentCurrency;
    delete data.initial_unified;

    // --- MILLAJE ---
    data.mileage = Number(data.mileage);
    data.mileage_unit = mileageUnit;

    // --- DATA CLEANUP ---
    data.year = Number(data.year);
    if (data.seats) data.seats = Number(data.seats);

    try {
      let uploadedUrls = [];
      const filesToUpload = photos.filter(p => !p.isExisting && p.file);
      const existingUrls = photos.filter(p => p.isExisting).map(p => p.url);

      uploadedUrls = [...existingUrls];

      if (filesToUpload.length > 0) {
        setUploadProgress(`Subiendo ${filesToUpload.length} foto(s)...`);

        // Prepare folder details for new structure
        // dealer-{Nombre de dealer} -Marcas- {ano} {marca}, {modelo}, {color} {4 ultimos digitos del chasis}
        const cleanDealerName = (userProfile?.dealerName || 'Dealer').replace(/[^a-zA-Z0-9]/g, '_');
        const year = data.year || '0000';
        const make = (data.make || 'Unknown').replace(/[^a-zA-Z0-9]/g, '');
        const model = (data.model || 'Unknown').replace(/[^a-zA-Z0-9]/g, '');
        const color = (data.color || 'Unknown').replace(/[^a-zA-Z0-9]/g, '');
        const last4Vin = (data.vin || '0000').slice(-4);

        const folderName = `${year}_${make}_${model}_${color}_${last4Vin}`.trim();
        const baseStoragePath = `dealer_${cleanDealerName}/Marcas/${folderName}`;

        for (let i = 0; i < filesToUpload.length; i++) {
          const item = filesToUpload[i];
          try {
            const cleanName = (item.file.name || `image_${i}.jpg`).replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
            const storagePath = `${baseStoragePath}/${Date.now()}_${cleanName}`;

            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from('fotos_vehiculos')
              .upload(storagePath, item.file, {
                cacheControl: '3600',
                upsert: true
              });

            if (uploadErr) throw uploadErr;

            const { data: publicUrlData } = supabase.storage
              .from('fotos_vehiculos')
              .getPublicUrl(storagePath);

            if (publicUrlData && publicUrlData.publicUrl) {
              uploadedUrls.push(publicUrlData.publicUrl);
            }
          } catch (err) {
            console.error("Error uploading photo to Supabase:", err);
          }
        }
        setUploadProgress('');
      }

      data.images = uploadedUrls;
      data.image = uploadedUrls[0] || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800';

      if (initialData?.id) {
        data.id = initialData.id;
      }

      await onSave(data);
      setLoading(false);
      onClose();
    } catch (error) {
      console.error("Error al guardar:", error);
      alert("Error al guardar: " + error.message);
      setLoading(false);
    }
  };

  const SectionHeader = ({ title, icon: Icon }) => (
    <div className="flex items-center gap-2 mb-6 mt-2 pb-2 border-b border-slate-100">
      {Icon && <Icon className="text-red-500" size={18} />}
      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide truncate">{title}</h4>
    </div>
  );

  // Determine if editing is locked (only status can unlock it)
  const isLocked = status === 'sold';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-5xl animate-in zoom-in-95 duration-200 h-[100dvh] sm:h-[92vh] flex flex-col bg-white rounded-none sm:rounded-[24px] overflow-hidden shadow-2xl ring-1 ring-black/5">

        {/* HEADER */}
        <div className="flex justify-between items-center px-8 py-5 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-red-50 p-2 rounded-xl">
              <AppLogo size={32} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight leading-none">
                {initialData ? 'Editar Vehículo' : 'Nuevo Vehículo'}
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {initialData ? 'Modifica los detalles del inventario' : 'Agrega una nueva unidad al sistema'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-red-600 rounded-full transition-all hover:rotate-90 duration-300"><X size={24} /></button>
        </div>

        {/* VISUAL BANNER IF LOCKED */}
        {isLocked && (
          <div className="bg-slate-800 text-white px-8 py-3 flex items-center gap-3 shrink-0 animate-in slide-in-from-top-2">
            <Lock size={18} className="text-red-400" />
            <p className="text-xs font-bold uppercase tracking-wide">
              Modo Solo Lectura: Este vehículo está marcado como <span className="text-red-400">VENDIDO</span>.
              <span className="opacity-75 font-normal ml-1 normal-case text-white/80">Cambia el estado a "Disponible" o "Cotizado" para editar los detalles.</span>
            </p>
          </div>
        )}

        {/* SCROLLABLE FORM */}
        <div className="flex-1 overflow-y-auto bg-white">
          <form id="vehicle-main-form" onSubmit={handleSubmit} className="p-8 max-w-5xl mx-auto space-y-10">

            {/* DATOS PRINCIPALES */}
            <div className={isLocked ? "opacity-60 pointer-events-none grayscale-[0.5] transition-all" : "transition-all"}>
              <SectionHeader title="Información Principal" icon={Car} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                <Input name="make" label="Marca" defaultValue={initialData?.make} placeholder="Ej. Toyota" required disabled={isLocked} />
                <Input name="model" label="Modelo" defaultValue={initialData?.model} placeholder="Ej. Camry" required disabled={isLocked} />
                {/* AÑO - small */}
                <Input name="year" label="Año" type="number" onWheel={(e) => e.target.blur()} defaultValue={initialData?.year} placeholder="2026" required disabled={isLocked} />

                <Input name="edition" label="Edición" defaultValue={initialData?.edition} placeholder="Ej. XSE" disabled={isLocked} />
                <Input name="color" label="Color" defaultValue={initialData?.color} placeholder="Ej. Blanco Perla" required disabled={isLocked} />

                {/* MILLAJE CON TOGGLE INTEGRADO */}
                <div className="flex flex-col mb-4 group text-left">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-500">Millaje</label>
                  <div className={`flex relative items-stretch shadow-sm rounded-xl overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 transition-all ${isLocked ? 'bg-slate-50' : 'bg-white'}`}>
                    <input
                      name="mileage"
                      type="number"
                      defaultValue={initialData?.mileage}
                      className="w-full min-w-0 px-4 py-3 bg-transparent focus:outline-none placeholder:text-slate-300 text-slate-800 font-bold text-sm"
                      placeholder="0"
                      disabled={isLocked}
                    />
                    <div className="bg-slate-50 flex p-1 items-center border-l border-slate-200 shrink-0">
                      <div className="flex p-0.5 rounded-lg bg-slate-200/50">
                        {['KM', 'MI'].map((unit) => (
                          <button
                            key={unit}
                            type="button"
                            disabled={isLocked}
                            onClick={() => setMileageUnit(unit)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${mileageUnit === unit ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 border border-transparent'}`}
                          >
                            {unit === 'KM' ? 'KM' : 'MILLA'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <Input
                    name="vin"
                    label="VIN / Chasis"
                    defaultValue={initialData?.vin}
                    className="font-mono uppercase tracking-wider"
                    placeholder="Número de Chasis"
                    disabled={isLocked}
                    onInput={(e) => {
                      e.target.value = e.target.value.toUpperCase().replace(/[O]/g, '');
                    }}
                  />
                </div>
              </div>
            </div>

            {/* FICHA TÉCNICA */}
            <div className={`bg-slate-50/50 rounded-3xl p-6 border border-slate-100 ${isLocked ? "opacity-60 pointer-events-none grayscale-[0.5]" : ""}`}>
              <SectionHeader title="Ficha Técnica y Accesorios" icon={Settings} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                {/* FILA 1 */}
                <Select name="condition" label="Condición" defaultValue={initialData?.condition || 'Usado'} options={['Usado', 'Recién Importado', 'Nuevo', 'Certificado']} disabled={isLocked} />
                <Select name="clean_carfax" label="Clean Carfax" defaultValue={initialData?.clean_carfax || 'No'} options={['Sí', 'No']} disabled={isLocked} />
                <Select name="transmission" label="Transmisión" defaultValue={initialData?.transmission || 'Automática'} options={['Automática', 'Manual', 'CVT', 'Tiptronic', 'DSG']} disabled={isLocked} />

                <Select name="fuel" label="Combustible" defaultValue={initialData?.fuel || 'Gasolina'} options={['Gasolina', 'Diesel', 'Híbrido', 'Eléctrico', 'GLP']} disabled={isLocked} />
                <Select name="traction" label="Tracción" defaultValue={initialData?.traction || 'FWD'} options={['FWD', 'RWD', 'AWD', '4x4']} disabled={isLocked} />
                <Select name="engine_type" label="Aspiración/Tipo" defaultValue={initialData?.engine_type || 'Normal'} options={['Normal', 'Turbo', 'Supercharged', 'Híbrido', 'Eléctrico']} disabled={isLocked} />

                <Input name="engine_cyl" label="Cilindros" defaultValue={initialData?.engine_cyl} placeholder="4 Cil" disabled={isLocked} />
                <Input name="engine_cc" label="Cilindrada" defaultValue={initialData?.engine_cc} placeholder="2.0L" disabled={isLocked} />
                <Select name="carplay" label="CarPlay / Android" defaultValue={initialData?.carplay || 'No'} options={['Sí', 'No']} disabled={isLocked} />

                {/* INTERIOR */}
                <Select name="seat_material" label="Interior" defaultValue={initialData?.seat_material || 'Piel'} options={['Piel', 'Tela', 'Alcántara', 'Piel/Tela', 'Vinil']} disabled={isLocked} />
                <Select name="roof_type" label="Techo" defaultValue={initialData?.roof_type || 'Panorámico'} options={['Normal', 'Panorámico', 'Sunroof', 'Convertible', 'Targa']} disabled={isLocked} />

                {/* EXTRAS */}
                <Select name="camera" label="Cámara" defaultValue={initialData?.camera || 'No'} options={['No', 'Reversa', '360°', 'Frontal + Reversa']} disabled={isLocked} />
                <Select name="sensors" label="Sensores" defaultValue={initialData?.sensors || 'No'} options={['Sí', 'No']} disabled={isLocked} />
                <Select name="is_electric_trunk" label="Baúl Eléctrico" defaultValue={initialData?.trunk_type === 'Eléctrica' ? 'Sí' : 'No'} options={['Sí', 'No']} disabled={isLocked} />
                <Select name="electric_windows" label="Cristales Eléctricos" defaultValue={initialData?.electric_windows || 'Sí'} options={['Sí', 'No']} disabled={isLocked} />
                <Select name="key_type" label="Llave" defaultValue={initialData?.key_type || 'Llave Normal'} options={['Llave Normal', 'Push Button']} disabled={isLocked} />
                <Select name="seats" label="Filas Asientos" defaultValue={initialData?.seats || '2'} options={['1', '2', '3', '4', '5']} disabled={isLocked} />
              </div>
            </div>

            {/* PRECIO & ESTADO */}
            <div className="border-t border-slate-100 pt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* PRECIO */}
                <div className={isLocked ? "opacity-60 pointer-events-none grayscale-[0.5] flex flex-col group" : "flex flex-col group"}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-500">Precio de Venta</label>
                  <div className={`flex relative items-stretch shadow-sm rounded-xl overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 transition-all ${isLocked ? 'bg-slate-50' : 'bg-white'}`}>
                    <input
                      type="text"
                      value={formatWithCommas(prices.price)}
                      onChange={(e) => setPrices(prev => ({ ...prev, price: parseCommaNumber(e.target.value) }))}
                      className="flex-1 min-w-0 px-4 py-3 bg-transparent focus:outline-none font-bold text-slate-800 placeholder:text-slate-300 text-sm"
                      placeholder="0.00"
                      required
                      disabled={isLocked}
                    />
                    <div className="bg-slate-50 flex p-1 items-center border-l border-slate-200 shrink-0">
                      <div className="flex p-0.5 rounded-lg bg-slate-200/50">
                        {['USD', 'DOP'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            disabled={isLocked}
                            onClick={() => setDownPaymentCurrency(c)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${downPaymentCurrency === c ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 border border-transparent'}`}
                          >
                            {c === 'USD' ? 'US$' : 'RD$'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* INICIAL */}
                <div className={isLocked ? "opacity-60 pointer-events-none grayscale-[0.5] flex flex-col group" : "flex flex-col group"}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-500">Inicial</label>
                  <div className={`flex relative items-stretch shadow-sm rounded-xl overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 transition-all ${isLocked ? 'bg-slate-50' : 'bg-white'}`}>
                    <input
                      type="text"
                      value={formatWithCommas(prices.initial)}
                      onChange={(e) => setPrices(prev => ({ ...prev, initial: parseCommaNumber(e.target.value) }))}
                      className="flex-1 min-w-0 px-4 py-3 bg-transparent focus:outline-none font-bold text-slate-800 placeholder:text-slate-300 text-sm"
                      placeholder="0.00"
                      disabled={isLocked}
                    />
                    <div className="bg-slate-50 flex p-1 items-center border-l border-slate-200 shrink-0">
                      <div className="flex p-0.5 rounded-lg bg-slate-200/50">
                        {['USD', 'DOP'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            disabled={isLocked}
                            onClick={() => setDownPaymentCurrency(c)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${downPaymentCurrency === c ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 border border-transparent'}`}
                          >
                            {c === 'USD' ? 'US$' : 'RD$'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ESTADO */}
                {/* ESTADO - PREMIUM SELECTOR */}
                <div className="md:col-span-1 group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-500">Estado del Vehículo</label>
                  <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                    {[
                      { value: 'available', label: 'Disponible', color: 'bg-red-500', text: 'text-red-600', border: 'border-transparent', bg: 'bg-red-50' },
                      { value: 'quoted', label: 'Cotizado', color: 'bg-amber-500', text: 'text-amber-600', border: 'border-transparent', bg: 'bg-amber-50' },
                      { value: 'sold', label: 'Vendido', color: 'bg-slate-400', text: 'text-slate-600', border: 'border-transparent', bg: 'bg-slate-200' }
                    ].map((option) => {
                      const isActive = (initialData?.status || 'available') === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setStatus(option.value);
                          }}
                          className={`flex-1 flex flex-col items-center justify-center py-2 text-xs font-black uppercase tracking-wider transition-all duration-300 rounded-lg ${status === option.value
                            ? `bg-white shadow-md ${option.text} scale-100`
                            : 'text-slate-400 hover:bg-white/50 hover:text-slate-500 border border-transparent'
                            }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full mb-1 ${status === option.value ? option.color : 'bg-slate-300'}`} />
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                  <input type="hidden" name="status" value={status} />
                </div>
              </div>
            </div>

            {/* IMÁGENES */}
            <div className={`md:col-span-2 space-y-4 ${isLocked ? "opacity-60 pointer-events-none grayscale-[0.5]" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <Camera size={16} className="text-red-500" />
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Galería de Imágenes</h3>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => document.getElementById('image-upload').click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-red-400 hover:bg-red-50 transition-all group bg-slate-50/20"
                >
                  <div className="p-2 bg-slate-50 rounded-full group-hover:bg-white transition-colors">
                    {loading ? <Loader2 size={20} className="animate-spin text-slate-400" /> : <Plus size={20} className="text-slate-400 group-hover:text-red-500" />}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 group-hover:text-red-500 text-center px-1">Subir Fotos</span>
                </button>
                <input
                  id="image-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isLocked}
                />

                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden group border border-slate-100 shadow-sm bg-white">
                    <img src={photo.url} alt={`Upload ${index}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button type="button" onClick={() => removeImage(index)} className="p-1.5 bg-red-600 text-white rounded-full hover:scale-110 transition-transform"><X size={12} /></button>
                      {index !== 0 && <button type="button" onClick={() => setAsCover(index)} className="p-1.5 bg-red-500 text-white rounded-full hover:scale-110 transition-transform"><Check size={12} /></button>}
                    </div>
                    {index === 0 && <span className="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-[8px] font-black text-center py-0.5 uppercase tracking-widest">Portada</span>}
                  </div>
                ))}
              </div>
              {/* PROGRESS BAR */}
              {uploadProgress && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 animate-pulse">
                  <Loader2 size={14} className="animate-spin" /> {uploadProgress}
                </div>
              )}
            </div>

            {/* Spacer for mobile safe area */}
            <div className="h-24 md:h-0"></div>
          </form>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20 flex gap-3 shadow-[0_-5px_20px_rgba(0,0,0,0.03)]">
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:block px-6 py-3 font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
            disabled={loading}
          >
            Cancelar
          </button>
          <Button
            type="submit"
            form="vehicle-main-form"
            disabled={loading}
            className="flex-1 py-4 text-sm sm:text-base bg-red-600 text-white hover:bg-red-700 shadow-xl shadow-red-600/20 hover:shadow-red-600/30"
          >
            {loading ? <><Loader2 className="animate-spin mr-2" /> Guardando...</> : <><Save size={20} /> Guardar Vehículo</>}
          </Button>
        </div>
      </div>
    </div>
  );
};

const QuoteModal = ({ isOpen, onClose, vehicle, onConfirm, userProfile, templates = [] }) => {
  const [loading, setLoading] = useState(false);
  const [bankName, setBankName] = useState('');
  const [cedula, setCedula] = useState('');
  const [price, setPrice] = useState(vehicle?.price || '');

  // Get first quote template if available
  const quoteTemplates = useMemo(() => templates.filter(t => t.category === 'quote'), [templates]);
  const defaultTemplate = quoteTemplates[0] || null;

  // Reset price when vehicle changes
  useEffect(() => {
    if (vehicle) {
      // Priorizar precio en DOP (pesos), luego el base (que suele ser USD)
      const autoPrice = vehicle.price_dop > 0 ? vehicle.price_dop : (vehicle.price || '');
      setPrice(autoPrice);
    }
  }, [vehicle]);

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. Tu enlace (El que termina en dd14)
    const baseUrl = "https://services.leadconnectorhq.com/hooks/5YBWavjywU0Ay0Y85R9p/webhook-trigger/c3456437-ef2d-4ed8-b6da-61235568dd14";

    const form = e.target;
    // Usamos elements para evitar conflictos con propiedades reservadas como .name
    const firstName = form.elements.name ? form.elements.name.value : '';
    const lastName = form.elements.lastname ? form.elements.lastname.value : '';
    const tel = form.elements.phone ? form.elements.phone.value : '';

    // 2. Preparamos los datos para el webhook
    const params = new URLSearchParams();
    params.append("firstName", firstName);
    params.append("lastName", lastName);
    params.append("phone", tel);
    params.append("vehicle", `${vehicle.make} ${vehicle.model} ${vehicle.year}`);
    params.append("price", price);
    params.append("source", "App CarBot");

    const quoteData = {
      name: firstName,
      lastname: lastName,
      phone: tel,
      cedula: cedula,
      price: price,
      bank: bankName,
      vehicleId: vehicle.id,
      vehicle: `${vehicle.make} ${vehicle.model}`,
      // Additional vehicle fields for template replacement
      year: vehicle.year || '',
      color: vehicle.color || '',
      version: vehicle.version || '',
      vin: vehicle.vin || '',
      mileage: vehicle.mileage || '',
      fuel: vehicle.fuel || '',
      transmission: vehicle.transmission || '',
      drivetrain: vehicle.drivetrain || '',
      passengers: vehicle.passengers || '',
      // Template data
      template: defaultTemplate?.name || null,
      templateId: defaultTemplate?.id || null,
      templateContent: defaultTemplate?.content || null,
      category: 'quote',
      createdAt: new Date().toISOString()
    };

    const finalUrl = `${baseUrl}?${params.toString()}`;

    // 4. EL TRUCO DEL PIXEL
    const pixel = new Image();
    pixel.src = finalUrl;

    // Simulamos éxito inmediato
    setTimeout(() => {
      onConfirm(quoteData);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full h-full sm:h-auto sm:max-w-md animate-in zoom-in-95 duration-200">
        <Card className="h-full sm:h-auto rounded-none sm:rounded-[24px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <div className="p-2 bg-red-50 rounded-lg mr-3"><Send size={18} className="text-red-600" /></div>
              Cotizar: {userProfile?.dealerName}
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>
          <form onSubmit={handleSend}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input name="name" label="Nombre Cliente" placeholder="Ej. Juan" required />
              <Input name="lastname" label="Apellido" placeholder="Ej. Pérez" required />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input name="phone" label="Teléfono" placeholder="+1 829..." required />
              <Input name="cedula" label="Cédula" value={cedula} onChange={(e) => setCedula(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input label="Precio de Venta" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
              <Input label="Banco Dirigido" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ej. Banco Popular" />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-red-600 text-white hover:bg-red-700">Enviar Cotización</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

const GenerateQuoteModal = ({ isOpen, onClose, inventory, onSave, templates = [] }) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [cedula, setCedula] = useState('');
  const [bank, setBank] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Filter for quote templates
  const quoteTemplates = useMemo(() => templates.filter(t => t.category === 'quote'), [templates]);

  // Auto-fill price when vehicle selected
  useEffect(() => {
    if (selectedVehicleId) {
      const v = inventory.find(i => i.id === selectedVehicleId);
      if (v) {
        const autoPrice = v.price_dop > 0 ? v.price_dop : (v.price || '');
        setPrice(autoPrice);
      }
    }
  }, [selectedVehicleId, inventory]);

  // Auto-select first quote template if available and none selected
  useEffect(() => {
    if (quoteTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(quoteTemplates[0].id);
    }
  }, [quoteTemplates, selectedTemplateId]);

  if (!isOpen) return null;

  const availableVehicles = inventory.filter(v => v.status !== 'sold');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedVehicleId) return;
    setLoading(true);
    const vehicle = inventory.find(v => v.id === selectedVehicleId);

    // Find selected template data
    const templateObj = templates.find(t => t.id === selectedTemplateId);

    setTimeout(() => {
      onSave({
        name,
        lastname,
        phone,
        cedula,
        bank,
        price,
        vehicle: `${vehicle.make} ${vehicle.model}`,
        vehicleId: vehicle.id,
        // Additional vehicle fields for template replacement
        year: vehicle.year || '',
        color: vehicle.color || '',
        version: vehicle.version || '',
        vin: vehicle.vin || '',
        mileage: vehicle.mileage || '',
        fuel: vehicle.fuel || '',
        transmission: vehicle.transmission || '',
        drivetrain: vehicle.drivetrain || '',
        passengers: vehicle.passengers || '',
        template: templateObj?.name || null,
        templateId: templateObj?.id || null,
        templateContent: templateObj?.content || null,
        category: 'quote',
        createdAt: new Date().toISOString()
      });
      setLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full h-full sm:h-auto sm:max-w-lg animate-in zoom-in-95 duration-200">
        <Card className="h-full sm:h-auto rounded-none sm:rounded-[24px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <div className="p-2 bg-blue-50 rounded-lg mr-3"><Send size={20} className="text-blue-600" /></div>
              Nueva Cotización Manual
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">1. Vehículo de Interés</label>
              <select
                className="w-full px-3 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                required
              >
                <option value="">-- Seleccionar vehículo --</option>
                {availableVehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year})</option>
                ))}
              </select>
            </div>

            {quoteTemplates.length > 0 && (
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Plantilla de Cotización</label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {quoteTemplates.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all whitespace-nowrap ${selectedTemplateId === t.id ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">2. Datos del Prospecto</label>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
                <Input label="Apellido" value={lastname} onChange={(e) => setLastname(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                <Input label="Cédula" value={cedula} onChange={(e) => setCedula(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Precio" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
                <Input label="Banco Dirigido" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Ej. Banco Popular" />
              </div>
            </div>
            <div className="pt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-red-600 text-white hover:bg-red-700">{loading ? 'Guardando...' : 'Guardar Cotización'}</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

const GenerateContractModal = ({ isOpen, onClose, inventory, onGenerate, templates = [], initialVehicle, showToast, userProfile }) => {
  const [selectedTemplates, setSelectedTemplates] = useState([]); // Ahora es array
  const [selectedVehicleId, setSelectedVehicleId] = useState(initialVehicle ? initialVehicle.vehicleId || initialVehicle.id : '');
  const [clientName, setClientName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientCedula, setClientCedula] = useState('');
  const [finalPrice, setFinalPrice] = useState(''); // Estado para precio final
  const [downPayment, setDownPayment] = useState(''); // Estado para el inicial
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [loading, setLoading] = useState(false);
  const [ghlTemplates, setGhlTemplates] = useState([]);
  const [ghlToken, setGhlToken] = useState('');

  useEffect(() => {
    if (isOpen && userProfile?.dealerId) {
      const fetchTemplates = async () => {
        setLoading(true);
        try {
          let token = '';
          let locId = '';

          const dealerIdToFetch = userProfile?.supabaseDealerId || userProfile?.dealerId;
          if (dealerIdToFetch) {
            const { data: dealerData, error: dealerError } = await supabase
              .from('dealers')
              .select('ghl_access_token, location_id')
              .eq('id', dealerIdToFetch)
              .single();

            if (!dealerError && dealerData) {
              token = dealerData.ghl_access_token || '';
              locId = dealerData.location_id || '';
              setGhlToken(token);
            }
          }

          const params = new URLSearchParams({
            dealerId: userProfile.dealerId,
            locationId: locId
          });

          if (token) {
            params.append('ghl_access_token', token);
          }

          const res = await fetch(`/api/ghl/templates?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            setGhlTemplates(data);
            setLoading(false);
          } else {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || "Error al obtener plantillas de GHL (" + res.status + ")");
          }
        } catch (error) {
          console.error("Error loading GHL templates:", error);
          if (showToast) {
            showToast(`Error cargando plantillas GHL: ${error.message}`, "error");
          }
          setLoading(false);
        }
      };
      fetchTemplates();
    }
  }, [isOpen, userProfile?.dealerId, userProfile?.supabaseDealerId, showToast]);

  useEffect(() => {
    if (initialVehicle) {
      setSelectedVehicleId(initialVehicle.vehicleId || initialVehicle.id);
      if (initialVehicle.client) {
        const parts = initialVehicle.client.split(' ');
        setClientName(parts[0] || '');
        setClientLastName(parts.slice(1).join(' ') || '');
      } else if (initialVehicle.name) {
        setClientName(initialVehicle.name);
        setClientLastName(initialVehicle.lastname || '');
      } else {
        setClientName('');
        setClientLastName('');
      }
      setClientCedula(initialVehicle.cedula || '');

      // Additional fields if available in quote
      if (initialVehicle.phone) {
        // ...
      }

      // Auto-fill price/downPayment from initial data or the vehicle in inventory
      const v = inventory.find(i => i.id === (initialVehicle.vehicleId || initialVehicle.id));
      setFinalPrice(initialVehicle.price || (v ? (v.price_dop > 0 ? v.price_dop : (v.price || 0)) : 0));
      setDownPayment(initialVehicle.downPayment || initialVehicle.initial || (v ? (v.initial_dop > 0 ? v.initial_dop : (v.initial || 0)) : 0));

      const template = templates.find(t => t.name === initialVehicle.template);
      if (template) setSelectedTemplates([template.id]);
    } else {
      setSelectedTemplates([]);
      setSelectedVehicleId('');
      setClientName('');
      setClientLastName('');
      setClientPhone(''); // Restore phone
      setClientEmail(''); // Restore email
      setClientCedula('');
      setBankName(''); // Restore bank
      setFinalPrice('');
      setDownPayment('');
    }
  }, [initialVehicle, isOpen, inventory]); // Added inventory to dependencies

  // When vehicle selected, auto-fill price if empty and NOT editing
  useEffect(() => {
    if (selectedVehicleId && !initialVehicle) {
      const v = inventory.find(i => i.id === selectedVehicleId);
      if (v) {
        // Predeterminadamente el precio y inicial que ya tiene el carro
        setFinalPrice(v.price_dop > 0 ? v.price_dop : (v.price || 0));
        setDownPayment(v.initial_dop > 0 ? v.initial_dop : (v.initial || 0));
      }
    }
  }, [selectedVehicleId, inventory, initialVehicle]);

  if (!isOpen) return null;

  const availableVehicles = inventory.filter(v => v.status !== 'sold' || (initialVehicle && v.id === initialVehicle.id));

  const toggleTemplate = (tId) => {
    if (selectedTemplates.includes(tId)) {
      setSelectedTemplates(prev => prev.filter(id => id !== tId));
    } else {
      setSelectedTemplates(prev => [...prev, tId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTemplates.length === 0 || !selectedVehicleId) return;

    setLoading(true);
    try {
      const vehicle = inventory.find(v => v.id === selectedVehicleId);
      if (!vehicle) throw new Error("Vehículo no encontrado");

      const cliente = {
        nombre: clientName,
        apellido: clientLastName,
        telefono: clientPhone,
        email: clientEmail
      };

      // GHL Location ID resolution
      const locationId = userProfile?.ghlLocationId || userProfile?.dealerId || 'DURAN-FERNANDEZ-AUTO-SRL';

      console.log(`🚀 Generando contrato(s) en GHL para: ${clientName} ${clientLastName}`);

      const results = [];
      for (const templateId of selectedTemplates) {
        const docUrl = await generarContratoEnGHL(cliente, vehicle, locationId, templateId, userProfile?.dealerId, ghlToken);
        results.push(docUrl);
      }

      // 1. Mostrar éxito y abrir primer documento
      if (results.length > 0) {
        window.open(results[0], '_blank');
        showToast(`${results.length} documento(s) generado(s) con éxito en GHL`, "success");
      }

      // 2. Ejecutar onGenerate local (opcional/compatibilidad)
      if (onGenerate) {
        onGenerate({
          vehicleId: selectedVehicleId,
          clientData: {
            name: clientName,
            lastName: clientLastName,
            cedula: clientCedula,
            phone: clientPhone,
            email: clientEmail
          },
          templateIds: selectedTemplates,
          bankName,
          finalPrice: finalPrice,
          ghlDocumentUrls: results
        });
      }

      onClose();
    } catch (error) {
      console.error("❌ Error GHL integration:", error);
      showToast(`Error: ${error.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full h-full sm:h-auto sm:max-w-3xl animate-in zoom-in-95 duration-200">
        <Card className="h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-[24px] bg-white">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <div className="p-2 bg-red-50 rounded-lg mr-3"><FilePlus size={20} className="text-red-600" /></div>
              Generar Nuevos Documentos
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">1. Selecciona el Vehículo</label>
              <select
                className={`w-full px-3 py-3 border border-gray-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 ${!!initialVehicle ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-gray-50'}`}
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                required
                disabled={!!initialVehicle}
              >
                <option value="">-- Seleccionar vehículo disponible --</option>
                {availableVehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year}) - {v.price_dop > 0 ? `RD$ ${v.price_dop.toLocaleString()}` : `US$ ${v.price.toLocaleString()}`}</option>
                ))}
              </select>
            </div>

            {/* Compact Grid Layout */}
            <div className="space-y-4">
              {/* Row 1: Client Data (4 cols) */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><User size={16} /> 2. Datos del Cliente</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input label="Nombre" placeholder="Ej. Juan" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
                  <Input label="Apellido" placeholder="Ej. Pérez" value={clientLastName} onChange={(e) => setClientLastName(e.target.value)} required />
                  <Input label="Cédula / Pasaporte" placeholder="001-0000000-0" value={clientCedula} onChange={(e) => setClientCedula(e.target.value)} required />
                  <Input label="Teléfono" placeholder="809-555-5555" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                  <Input label="Email" type="email" placeholder="email@ejemplo.com" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                </div>
              </div>

              {/* Row 2: Financial Terms (3 cols) */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><DollarSign size={16} /> 3. Términos Financieros</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input label="Banco / Financiera" placeholder="Ej. Banco Popular" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  <Input label="Precio Final de Venta" type="number" placeholder="Ej. 850000" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} required />
                  <Input label="Inicial / Avance" type="number" placeholder="Ej. 150000" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">4. Elige los Documentos a Generar (Selección Múltiple)</label>

              {/* Group by category if needed, or just list everything */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                {ghlTemplates.map(template => {
                  const isSelected = selectedTemplates.includes(template.id);
                  return (
                    <div
                      key={template.id}
                      onClick={() => toggleTemplate(template.id)}
                      className={`cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 relative flex items-center gap-3 ${isSelected ? 'border-red-600 bg-red-50 shadow-md' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-300'}`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-red-600 border-red-600' : 'border-gray-300 bg-white'}`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>

                      <div className="flex-1">
                        <h4 className={`font-bold text-sm leading-tight uppercase ${isSelected ? 'text-slate-900' : 'text-gray-600'}`}>{template.name}</h4>
                        <span className="text-[10px] font-black uppercase tracking-wider text-red-500">GHL TEMPLATE</span>
                      </div>
                    </div>
                  );
                })}
                {ghlTemplates.length === 0 && (
                  <div className="col-span-full p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Cargando plantillas de GHL... Asegúrate de estar conectado en Ajustes.
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <Button variant="ghost" onClick={onClose} type="button" disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading || selectedTemplates.length === 0 || !selectedVehicleId} className="bg-slate-900 text-white hover:bg-slate-800">
                {loading ? <><Loader2 className="animate-spin mr-2" size={18} /> Procesando...</> : `Generar ${selectedTemplates.length} Documento(s)`}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

// --- HELPER: RENDER CONTRACT WITH DATA ---
const renderContract = (html, data) => {
  if (!html) return '';
  let content = html;

  // Normalizar datos para asegurar que no falte nada
  const clientParts = (data.client || '').split(' ');
  const clientFirstName = data.nombre || clientParts[0] || '';
  const clientLastName = data.apellido || clientParts.slice(1).join(' ') || '';

  const vehicleParts = (data.vehicle || '').split(' ');
  const vehicleMake = data.marca || vehicleParts[0] || '';
  const vehicleModel = data.modelo || vehicleParts.slice(1).join(' ') || '';

  // 1. DICCIONARIO DE DATOS (Data Object) - Estructura exacta solicitada
  const contratoData = {
    // Datos del Cliente
    'nombre': clientFirstName,
    'apellido': clientLastName,
    'cedula': data.cedula || '',
    'telefono': data.telefono || data.phone || '',
    'direccion': data.direccion || data.address || '',

    // Ficha Principal
    'marca': vehicleMake,
    'modelo': vehicleModel,
    'edicion': data.version || data.edicion || '', // Added edicion mapping
    'version': data.version || '',
    'año': data.año || data.year || '',
    'color': data.color || '',
    'chasis': data.chasis || data.vin || '',
    'vin': data.vin || data.chasis || '', // Alias
    'placa': data.placa || data.plate || '',

    // Finanzas
    'precio': data.precio || `RD$ ${Number(data.price || 0).toLocaleString()}`,
    'inicial': data.inicial || `RD$ ${Number(data.downPayment || 0).toLocaleString()}`,
    'banco': data.banco || data.bank || '',

    // Detalles Extra
    'millaje': data.mileage ? Number(data.mileage).toLocaleString() : '',
    'carfax': data.carfax || '',
    'condicion': data.condicion || data.condition || 'Excelentes condiciones',
    'asientos': data.asientos || data.seats || '',
    'motor': data.motor || data.details_engine || data.engineDescription || 'Motor no especificado',
    'transmision': data.transmission || '',
    'combustible': data.fuel || '',

    // Documento
    'fecha': data.date ? new Date(data.date).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }),

    // Bloques de Firma
    'firma_cliente': `
      <div style="width:100%; max-width:350px; margin-top:60px; text-align:center; font-family:sans-serif;">
        <div style="border-top:2px solid #000; width:100%; margin-bottom:8px;"></div>
        <div style="font-weight:bold; font-size:14px; text-transform:uppercase; margin-bottom:4px;">
          ${(clientFirstName).toUpperCase()} ${(clientLastName).toUpperCase()}
        </div>
        <div style="font-weight:bold; font-size:11px; text-transform:uppercase;">CLIENTE/CEDULA/FECHA.</div>
      </div>
    `,
    'firma_vendedor': `
      <div style="width:100%; max-width:350px; margin-top:60px; text-align:center; font-family:sans-serif;">
        <div style="border-top:2px solid #000; width:100%; margin-bottom:8px;"></div>
        <div style="font-weight:bold; font-size:14px; text-transform:uppercase; margin-bottom:4px;">
          ${(data.dealerName || 'AGENTE AUTORIZADO').toUpperCase()}
        </div>
        <div style="font-weight:bold; font-size:11px; text-transform:uppercase;">VENDEDOR AUTORIZADO</div>
      </div>
    `,

    // LEGACY / COMPATIBILIDAD
    'CLIENTE_NOMBRE': clientFirstName,
    'CLIENTE_APELLIDO': clientLastName,
    'CLIENTE_CEDULA': data.cedula || '',
    'VEHICULO_MARCA': vehicleMake,
    'VEHICULO_MODELO': vehicleModel,
    'VEHICULO_VIN': data.chasis || data.vin || '',
  };

  // 2. FUNCIÓN DE REEMPLAZO CORREGIDA (Lógica del usuario)
  let resultado = content;

  Object.keys(contratoData).forEach(key => {
    // Esta Regex busca {{key}} con cualquier cantidad de llaves y espacios
    // Ej: {{nombre}}, {{{ nombre }}}, {{{{nombre}}}}
    const regex = new RegExp(`{+\\s*${key}\\s*}+`, 'gi');
    const valorReal = contratoData[key] !== undefined && contratoData[key] !== null ? contratoData[key] : '';

    // Solo reemplazar si hay valor, o si es explícitamente vacío, pero mantener lógica de reemplazo
    resultado = resultado.replace(regex, valorReal);
  });

  // Limpieza de estilos rojos (legacy)
  resultado = resultado.replace(/<span[^>]*style="[^"]*color:\s*#dc2626[^"]*"[^>]*>(.*?)<\/span>/gi, '$1');

  // 3. LIMPIEZA FINAL DE CUALQUIER ETIQUETA HUÉRFANA
  // Elimina cualquier cosa que parezca un placeholder no reemplazado {{...}}
  return resultado.replace(/{+.*?}+/g, '');
};

// Helper para limpieza quirúrgica de estilos (mismo logic que PlantillaEditor)
const cleanHtmlStyles = (htmlContent) => {
  if (!htmlContent) return '';
  let processed = htmlContent;

  // 1. Convert variable-chip class to inline style (optional, but keep for basic cleanup)
  // We remove the aggressive style regex to preserve bold/italics
  processed = processed.replace(/class=["']variable-chip["']/gi, 'style="color: #000000; display: inline;"');
  processed = processed.replace(/contenteditable=["']false["']/gi, '');

  return processed;
};

// Función de Sanitización Selectiva para PDF (DOM-based)
const prepareElementForPDF = (originalElement) => {
  // 1. Clonamos para no afectar el DOM visible
  const clone = originalElement.cloneNode(true);

  // 2. Buscamos variables (chips), spans con estilos, o divs con fondo de variable
  // Ajustamos el selector para atrapar todo lo que parezca un "chip"
  const variables = clone.querySelectorAll('span, .variable-chip, span[style*="background"], span[style*="border"]');

  variables.forEach(el => {
    // A. ELIMINAR LA CAJA (Estética de editor)
    el.style.backgroundColor = 'transparent';
    el.style.border = 'none';
    el.style.boxShadow = 'none';
    el.style.padding = '0';
    el.style.margin = '0';
    el.style.borderRadius = '0';

    // B. FORZAR APARIENCIA DE TEXTO
    el.style.display = 'inline';
    el.style.color = '#000000'; // Negro puro

    // C. Importante: NO tocamos font-weight ni font-style
    // el.style.fontWeight se mantiene si estaba definido o heredado
  });

  return clone;
};

const generateContractHtml = (contract, userProfile, isPreview = false) => {
  // Merge contract data + userProfile for the renderer
  const fullData = {
    ...contract,
    dealerName: userProfile.dealerName,
    dealerAddress: userProfile.address,
    dealerPhone: userProfile.phone
  };

  // CSS EXTRA PARA IMÁGENES Y CAPAS
  const EXTRA_CSS = `
    /* Capas de imagen (mismas que en el editor) */
    .img-behind {
      position: absolute !important;
      z-index: -1 !important;
      opacity: 0.6;
    }
    .img-front {
      position: absolute !important;
      z-index: 10 !important;
    }
    /* Página estilo Carta */
    .contract-page {
      width: 215.9mm;
      height: 279.4mm;
      position: relative;
      background-color: white;
      page-break-after: always;
      overflow: hidden;
    }
    .contract-page:last-child {
      page-break-after: auto;
    }
    .contract-bg {
      position: absolute;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 1;
      object-fit: fill; /* Estira el fondo al tamaño carta completo */
    }
    .contract-content {
      position: absolute;
      top: 25mm; left: 25mm; right: 25mm; bottom: 25mm;
      z-index: 10;
      font-family: 'Calibri', 'Carlito', sans-serif;
      line-height: 1.15;
      font-size: 11pt;
      color: black;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .contract-floating-img {
      position: absolute;
    }
    /* Ajuste de impresión */
    @media print {
      .img-behind {
         z-index: -1 !important;
         position: absolute !important; 
      }
      body { -webkit-print-color-adjust: exact; }
    }
    /* Reset básico para el contenido */
    #contract-body img {
      display: inline-block;
    }
  `;

  // NUEVO: Si hay páginas estructuradas (del nuevo editor), renderizarlas con fondos
  if (contract.pages && contract.pages.length > 0) {
    const pagesHtml = contract.pages.map((page, idx) => {
      const processedContent = cleanHtmlStyles(renderContract(page.content || '', fullData));
      const bgImage = page.backgroundImage || contract.backgroundImage;

      // Renderizar imágenes flotantes de esta página
      const floatingImages = (contract.images || [])
        .filter(img => img.pageId === page.id)
        .map(img => `<img src="${img.src}" class="contract-floating-img" style="left:${img.x}px; top:${img.y}px; width:${img.width}px; height:${img.height}px; z-index:20;">`)
        .join('');

      return `
        <div class="contract-page">
          ${bgImage ? `<img src="${bgImage}" class="contract-bg" />` : ''}
          ${floatingImages}
          <div class="contract-content">
            ${processedContent}
          </div>
        </div>
      `;
    }).join('');

    return `
        <style>${SHARED_QUILL_STYLES}${EXTRA_CSS}</style>
        ${pagesHtml}
      `;
  }

  // 1. Si hay contenido personalizado legacy (templateContent o content), usarlo
  const legacyContent = contract.templateContent || contract.content;
  if (legacyContent) {
    const content = cleanHtmlStyles(renderContract(legacyContent, fullData));

    return `
      <style>${SHARED_QUILL_STYLES}${EXTRA_CSS}</style>
      <div id="contract-content" class="ql-editor" style="
        font-family: 'Helvetica', 'Arial', sans-serif; 
        padding: 0; 
        background: white;
        ${contract.backgroundImage ? `background-image: url(${contract.backgroundImage}); background-size: 100% 100%; background-repeat: no-repeat;` : ''}
        width: 215.9mm; 
        min-height: 279.4mm;
        margin: 0 auto;
        box-sizing: border-box;
        position: relative;
      ">
        <div id="contract-body" class="contract-body ql-editor" style="padding: 20mm 20mm; overflow-wrap: break-word; word-wrap: break-word; position: relative; z-index: 1;">
          ${content}
        </div>
      </div>
      `;
  }

  // 2. Fallback: Plantilla Hardcoded (Legacy)
  return `
      <style>${SHARED_QUILL_STYLES}</style>
      <div id="contract-content" style="
        font-family: 'Times New Roman', serif; 
        padding: 0; 
        background: white;
        width: 215.9mm; 
        min-height: 279.4mm;
        margin: 0 auto;
        box-sizing: border-box;
        position: relative;
      ">
        <div id="contract-body" style="padding: 15mm 20mm;">
          <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px;">
            <h1 style="margin: 0; color: #1a202c; font-size: 28px;">${userProfile.dealerName}</h1>
            <p style="margin: 5px 0; color: #4a5568; font-size: 14px;">RNC: 1-0000000-1 | Tel: 809-555-5555</p>
            <p style="margin: 0; color: #718096; font-size: 12px; font-style: italic;">Calidad y Confianza sobre Ruedas</p>
          </div>

          <h1 style="text-align: center; font-size: 20px; margin-bottom: 30px; text-transform: uppercase; text-decoration: underline;">${(contract.templateType || contract.template || 'Documento').toUpperCase()}</h1>

          <p style="margin-bottom: 20px; text-align: justify;">En la ciudad de Punta Cana, Provincia La Altagracia, República Dominicana, a los <strong>${contract.date ? new Date(contract.date).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>

          <p style="margin-bottom: 25px; text-align: justify;">
            <strong>DE UNA PARTE:</strong> El señor(a) <strong>${userProfile.name}</strong>, de nacionalidad Dominicana, mayor de edad, actuando en nombre y representación legal de la empresa <strong>${userProfile.dealerName}</strong> (en lo adelante denominado como <strong>EL VENDEDOR</strong>).
            <br /><br />
            <strong>DE LA OTRA PARTE:</strong> El señor(a) <strong>${contract.client}</strong>, portador del documento de identidad No. <strong>${contract.cedula || 'N/A'}</strong> (en lo adelante denominado como <strong>EL COMPRADOR</strong>).
          </p>

          <h2 style="font-size: 16px; margin-top: 30px; border-bottom: 1px solid #000; padding-bottom: 5px; text-transform: uppercase;">PRIMERO: OBJETO DEL CONTRATO</h2>
          <p style="margin-bottom: 15px; text-align: justify;">EL VENDEDOR, por medio del presente acto, vende, cede y traspasa con todas las garantías de derecho al COMPRADOR, quien acepta, el siguiente vehículo de motor:</p>
          <div style="background: #f7fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #edf2f7;">
            <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
              <tr><td style="padding: 4px 0; font-weight: bold; width: 30%;">Vehículo:</td><td>${contract.vehicle}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Condición:</td><td>Usado / Certificado</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Identificación (VIN):</td><td>${contract.vin || 'Verificado en Chasis'}</td></tr>
            </table>
          </div>

          <h2 style="font-size: 16px; margin-top: 30px; border-bottom: 1px solid #000; padding-bottom: 5px; text-transform: uppercase;">SEGUNDO: PRECIO Y FORMA DE PAGO</h2>
          <p style="margin-bottom: 15px; text-align: justify;">El precio total convenido para la presente venta es de <strong>${userProfile.currency === 'USD' ? 'US$' : 'RD$'} ${Number(contract.price || 0).toLocaleString()}</strong>, el cual se compromete a pagar de la siguiente manera:
            ${contract.downPayment && Number(contract.downPayment) > 0
      ? `un pago inicial de <strong>${userProfile.currency === 'USD' ? 'US$' : 'RD$'} ${Number(contract.downPayment).toLocaleString()}</strong> y el balance restante mediante las condiciones acordadas.`
      : `en un único pago al momento de la firma.`}
            El VENDEDOR declara haber recibido conforme a lo pactado, sirviendo el presente documento como carta de pago y descargo legal por los montos recibidos.
          </p>

          <h2 style="font-size: 16px; margin-top: 30px; border-bottom: 1px solid #000; padding-bottom: 5px; text-transform: uppercase;">TERCERO: ESTADO Y GARANTÍA</h2>
          <p style="margin-bottom: 15px; text-align: justify;">El COMPRADOR declara haber revisado minuciosamente el vehículo y aceptarlo en el estado mecánico y de carrocería en que se encuentra ("AS IS"). EL VENDEDOR otorga una garantía limitada de treinta (30) días sobre motor y transmisión, sujeto a uso normal.</p>

          <h2 style="font-size: 16px; margin-top: 30px; border-bottom: 1px solid #000; padding-bottom: 5px; text-transform: uppercase;">CUARTO: JURISDICCIÓN Y LEY APLICABLE</h2>
          <p style="margin-bottom: 40px; text-align: justify;">Para todo lo no previsto en el presente contrato, las partes se remiten al derecho común y eligen domicilio en la jurisdicción de Punta Cana para cualquier proceso derivado del mismo.</p>

          <div style="margin-top: 60px; display: flex; justify-content: space-between; gap: 40px;">
            <div style="width: 45%; border-top: 1px solid #000; padding-top: 10px; text-align: center;">
              <p style="margin: 0; font-weight: bold;">EL VENDEDOR</p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #4a5568;">${userProfile.dealerName}</p>
            </div>
            <div style="width: 45%; border-top: 1px solid #000; padding-top: 10px; text-align: center;">
              <p style="margin: 0; font-weight: bold;">EL COMPRADOR</p>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #4a5568;">${contract.client}</p>
            </div>
          </div>
        </div>
      </div>
      `;
};

const generateQuoteHtml = (quote, userProfile, isPreview = false) => {
  // If quote has templateContent, use it with variable replacements
  if (quote.templateContent) {
    const replacements = {
      // Cliente
      '{{CLIENTE_NOMBRE}}': quote.name || '',
      '{{ CLIENTE_APELLIDO }}': quote.lastname || '',
      '{{ CLIENTE_DOC }}': quote.cedula || '',
      '{{ CLIENTE_TEL }}': quote.phone || '',
      '{{ CLIENTE_CEDULA }}': quote.cedula || '',

      // Vehículo
      '{{ VEHICULO_MARCA }}': quote.vehicle?.split(' ')[0] || '',
      '{{ VEHICULO_MODELO }}': quote.vehicle?.split(' ').slice(1).join(' ') || '',
      '{{ VEHICULO_COMPLETO }}': quote.vehicle || '',
      '{{ VEHICULO_ANO }}': quote.year || '',
      '{{ VEHICULO_ANIO }}': quote.year || '',
      '{{ VEHICULO_COLOR }}': quote.color || '',
      '{{ VEHICULO_VIN }}': quote.vin || '',
      '{{ VEHICULO_VERSION }}': quote.version || '',
      '{{ VEHICULO_MILLAJE }}': quote.mileage ? String(quote.mileage).toLocaleString() : '',
      '{{ VEHICULO_COMBUSTIBLE }}': quote.fuel || '',
      '{{ VEHICULO_TRANSMISION }}': quote.transmission || '',
      '{{ VEHICULO_TRACCION }}': quote.drivetrain || '',
      '{{ VEHICULO_PASAJEROS }}': quote.passengers || '',

      // Negocio
      '{{ PRECIO_VENTA }}': quote.price ? `RD$ ${Number(quote.price).toLocaleString()}` : '',
      '{{ MONTO_INICIAL }}': quote.initial ? `RD$ ${Number(quote.initial).toLocaleString()}` : '',
      '{{ BANCO }}': quote.bank || '',
      '{{ FECHA_VENTA }}': quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }),
      '{{ FECHA_COTIZACION }}': quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }),
      '{{ DEALER_NOMBRE }}': userProfile.dealerName || '',
      '{{ FOLIO }}': `Q-${quote.id?.slice(-6).toUpperCase() || 'TEMP'}`,

      // Legacy
      '{{ client }}': `${quote.name || ''} ${quote.lastname || ''}`.trim(),
      '{{ vehicle }}': quote.vehicle || '',
      '{{ price }}': quote.price ? `RD$ ${Number(quote.price).toLocaleString()}` : '',
    };

    let content = quote.templateContent;
    Object.keys(replacements).forEach(key => {
      const escapedKey = key.replace(/[.*+?^${ }()|[\]\\]/g, '\\$&');
      content = content.replace(new RegExp(escapedKey, 'g'), replacements[key]);
    });

    return `
      <style>${SHARED_QUILL_STYLES}</style>
      <div id="quote-content" style="
        font-family: 'Helvetica', 'Arial', sans-serif; 
        padding: 0; 
        background: white;
        width: 215.9mm; 
        min-height: 279.4mm;
        margin: 0 auto;
        box-sizing: border-box;
        position: relative;
      ">
        <div id="quote-body" style="padding: 15mm 20mm; overflow-wrap: break-word; word-wrap: break-word;">${content}</div>
      </div>
      `;
  }

  // Default format (fallback)
  return `
      <style>${SHARED_QUILL_STYLES}</style>
      <div id="quote-content" style="
        font-family: 'Helvetica', 'Arial', sans-serif; 
        padding: 0; 
        background: white;
        width: 215.9mm; 
        min-height: 279.4mm;
        margin: 0 auto;
        box-sizing: border-box;
        position: relative;
      ">
        <div id="quote-body" style="padding: 15mm 20mm;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 4px solid #b91c1c; padding-bottom: 20px;">
            <div>
              <h1 style="font-size: 28px; margin: 0; color: #0f172a; font-weight: 800;">${userProfile.dealerName}</h1>
              <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Ficha de Cotización de Vehículo</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-weight: bold; color: #b91c1c;">FOLIO: Q-${quote.id?.slice(-6).toUpperCase() || 'PREVIEW'}</p>
              <p style="margin: 5px 0 0; font-size: 12px;">${new Date().toLocaleDateString('es-DO', { long: true })}</p>
            </div>
          </div>

          <div style="margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h2 style="font-size: 14px; text-transform: uppercase; color: #b91c1c; margin-top: 0; margin-bottom: 15px; letter-spacing: 1px; font-weight: 800;">Información del Cliente</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; color: #64748b; font-size: 12px; font-weight: bold;">NOMBRE COMPLETO:</td>
                <td style="padding: 5px 0; color: #0f172a; font-weight: bold;">${quote.name} ${quote.lastname}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #64748b; font-size: 12px; font-weight: bold;">TELÉFONO:</td>
                <td style="padding: 5px 0; color: #0f172a; font-weight: bold;">${quote.phone}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #64748b; font-size: 12px; font-weight: bold;">CÉDULA/ID:</td>
                <td style="padding: 5px 0; color: #0f172a; font-weight: bold;">${quote.cedula || 'N/A'}</td>
              </tr>
            </table>
          </div>

          <div style="margin-bottom: 30px; background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h2 style="font-size: 14px; text-transform: uppercase; color: #b91c1c; margin-top: 0; margin-bottom: 15px; letter-spacing: 1px; font-weight: 800;">Vehículo de Interés</h2>
            <p style="font-size: 24px; font-weight: 900; margin: 0; color: #0f172a;">${quote.vehicle}</p>
            <div style="margin-top: 15px; display: flex; gap: 20px;">
              <div style="padding: 10px 20px; background: #fff1f2; border-radius: 8px; text-align: center; flex: 1;">
                <p style="margin: 0; font-size: 10px; color: #b91c1c; font-weight: bold; text-transform: uppercase;">Estado</p>
                <p style="margin: 5px 0 0; font-weight: 800;">Cotizado</p>
              </div>
            </div>
          </div>

          ${quote.bank ? `
        <div style="margin-bottom: 40px; background: #eff6ff; padding: 20px; border-radius: 12px; border: 1px solid #dbeafe;">
            <h2 style="font-size: 14px; text-transform: uppercase; color: #2563eb; margin-top: 0; margin-bottom: 15px; letter-spacing: 1px; font-weight: 800;">Pre-Aprobación Bancaria</h2>
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0; color: #60a5fa; font-size: 12px; font-weight: bold; width: 30%;">INSTITUCIÓN:</td>
                <td style="padding: 5px 0; color: #1e3a8a; font-weight: 800;">${quote.bank}</td>
              </tr>
            </table>
        </div>
        ` : ''}

          <div style="margin-top: 60px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.6;">
            <p>Esta es una ficha de cotización informativa generada por Carbot para ${userProfile.dealerName}.<br />
              Los precios y la disponibilidad están sujetos a cambios sin previo aviso.</p>
          </div>
        </div>
      </div>
      `;
};

const ContractPreviewModal = ({ isOpen, onClose, contract, userProfile }) => {
  if (!isOpen || !contract) return null;

  const handleDownloadPDF = async () => {
    const element = document.createElement('div');
    element.innerHTML = generateContractHtml(contract, userProfile, false);
    document.body.appendChild(element);

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      // Use contract ID if it adheres to the new format, or fallback to generated name
      filename: contract.id && contract.id.startsWith('Contrato_') ? `${contract.id}.pdf` : `Contrato_${contract.client.replace(/\s+/g, '_')}_${contract.id.slice(0, 5)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const html2pdf = (await import('html2pdf.js')).default;
    const cleanElement = prepareElementForPDF(element);
    html2pdf().set(opt).from(cleanElement).save().then(() => {
      document.body.removeChild(element);
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Contrato</title>
          <style>@page {size: letter; margin: 0; }</style>
        </head>
        <body style="margin: 0;">${generateContractHtml(contract, userProfile)}</body>
      </html>
      `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-4xl h-[100dvh] sm:h-[90vh] animate-in zoom-in-95 duration-200 flex flex-col">
        {/* Replaced Card with simple div to ensure full height scaling */}
        <div className="flex flex-col h-full bg-slate-50 rounded-none sm:rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b bg-white sm:rounded-t-2xl shrink-0 safe-top">
            <h3 className="text-sm sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-red-600 sm:w-[20px] sm:h-[20px]" /> <span className="truncate max-w-[200px]">Contrato: {contract.client}</span>
            </h3>
            <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>

          <div className="flex-1 bg-white overflow-hidden relative">
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Vista Previa del Contrato</title>
                    <style>
                      html { 
                        height: 100%;
                        overflow-y: auto;
                        -webkit-overflow-scrolling: touch;
                      }
                      body {
                        margin: 0;
                        padding: 0;
                        background: #f8fafc;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        min-height: 100%;
                      }
                      .sheet-container {
                        width: 215.9mm;
                        max-width: 100%;
                        background: white;
                        box-shadow: 0 0 20px rgba(0,0,0,0.05);
                        margin: 20px auto;
                        min-height: 279.4mm;
                        position: relative;
                      }
                      @media print {
                        body { background: white; padding: 0; }
                        .sheet-container { box-shadow: none; margin: 0; width: 100%; }
                      }
                      /* Responsive tweak for mobile */
                      @media (max-width: 215.9mm) {
                        .sheet-container {
                          width: 100%;
                          box-shadow: none;
                          margin: 0;
                        }
                      }
                    </style>
                  </head>
                  <body>
                    <div class="sheet-container">
                      ${generateContractHtml(contract, userProfile, true)}
                    </div>
                  </body>
                </html>
              `}
              className="w-full h-full border-none"
              title="Vista Previa del Contrato"
            />
          </div>

          <div className="p-3 bg-white border-t sm:rounded-b-2xl flex gap-3 justify-end shrink-0 safe-bottom">
            <button onClick={handlePrint} className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl sm:rounded-lg flex items-center justify-center gap-2 text-xs sm:text-sm transition-colors">
              <Printer size={16} /> Imprimir
            </button>
            <button onClick={handleDownloadPDF} className="flex-1 sm:flex-none px-4 py-3 sm:py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl sm:rounded-lg flex items-center justify-center gap-2 text-xs sm:text-sm shadow-lg shadow-red-600/20 transition-all active:scale-95">
              <Download size={16} /> Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QuotePreviewModal = ({ isOpen, onClose, quote, userProfile }) => {
  if (!isOpen || !quote) return null;

  const getQuoteHtml = (isPreview = false) => {
    // If quote has templateContent, use it with variable replacements
    if (quote.templateContent) {
      const replacements = {
        // Cliente
        '{{CLIENTE_NOMBRE}}': quote.name || '',
        '{{ CLIENTE_APELLIDO }}': quote.lastname || '',
        '{{ CLIENTE_DOC }}': quote.cedula || '',
        '{{ CLIENTE_TEL }}': quote.phone || '',
        '{{ CLIENTE_CEDULA }}': quote.cedula || '',

        // Vehículo
        '{{ VEHICULO_MARCA }}': quote.vehicle?.split(' ')[0] || '',
        '{{ VEHICULO_MODELO }}': quote.vehicle?.split(' ').slice(1).join(' ') || '',
        '{{ VEHICULO_COMPLETO }}': quote.vehicle || '',
        '{{ VEHICULO_ANO }}': quote.year || '',
        '{{ VEHICULO_ANIO }}': quote.year || '',
        '{{ VEHICULO_COLOR }}': quote.color || '',
        '{{ VEHICULO_VIN }}': quote.vin || '',
        '{{ VEHICULO_VERSION }}': quote.version || '',
        '{{ VEHICULO_MILLAJE }}': quote.mileage ? String(quote.mileage).toLocaleString() : '',
        '{{ VEHICULO_COMBUSTIBLE }}': quote.fuel || '',
        '{{ VEHICULO_TRANSMISION }}': quote.transmission || '',
        '{{ VEHICULO_TRACCION }}': quote.drivetrain || '',
        '{{ VEHICULO_PASAJEROS }}': quote.passengers || '',

        // Negocio
        '{{ PRECIO_VENTA }}': quote.price ? `RD$ ${Number(quote.price).toLocaleString()}` : '',
        '{{ MONTO_INICIAL }}': quote.initial ? `RD$ ${Number(quote.initial).toLocaleString()}` : '',
        '{{ BANCO }}': quote.bank || '',
        '{{ FECHA_VENTA }}': quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }),
        '{{ FECHA_COTIZACION }}': quote.createdAt ? new Date(quote.createdAt).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }),
        '{{ DEALER_NOMBRE }}': userProfile.dealerName || '',
        '{{ FOLIO }}': `Q-${quote.id?.slice(-6).toUpperCase() || 'TEMP'}`,

        // Legacy
        '{{ client }}': `${quote.name || ''} ${quote.lastname || ''}`.trim(),
        '{{ vehicle }}': quote.vehicle || '',
        '{{ price }}': quote.price ? `RD$ ${Number(quote.price).toLocaleString()}` : '',
      };

      let content = quote.templateContent;
      Object.keys(replacements).forEach(key => {
        const escapedKey = key.replace(/[.*+?^${ }()|[\]\\]/g, '\\$&');
        content = content.replace(new RegExp(escapedKey, 'g'), replacements[key]);
      });

      return `
      <style>${SHARED_QUILL_STYLES}</style>
      <div id="quote-content" style="
          font-family: 'Helvetica', 'Arial', sans-serif; 
          padding: 0; 
          background: white;
          width: 215.9mm; 
          min-height: 279.4mm;
          margin: 0 auto;
          box-sizing: border-box;
          position: relative;
        ">
        <div id="quote-body" style="padding: 15mm 20mm; overflow-wrap: break-word; word-wrap: break-word;">${content}</div>
      </div>
      `;
    }

    // Default format (fallback)
    return `
      <style>${SHARED_QUILL_STYLES}</style>
      <div id="quote-content" style="
          font-family: 'Helvetica', 'Arial', sans-serif; 
          padding: 0; 
          background: white;
          width: 215.9mm; 
          min-height: 279.4mm;
          margin: 0 auto;
          box-sizing: border-box;
          position: relative;
        ">
        <div id="quote-body" style="padding: 15mm 20mm;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 4px solid #b91c1c; padding-bottom: 20px;">
            <div>
              <h1 style="font-size: 28px; margin: 0; color: #0f172a; font-weight: 800;">${userProfile.dealerName}</h1>
              <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Ficha de Cotización de Vehículo</p>
            </div>
            <div style="text-align: right;">
              <p style="margin: 0; font-weight: bold; color: #b91c1c;">FOLIO: Q-${quote.id?.slice(-6).toUpperCase() || 'PREVIEW'}</p>
              <p style="margin: 5px 0 0; font-size: 12px;">${new Date().toLocaleDateString('es-DO', { long: true })}</p>
            </div>
          </div>

          <div style="margin-bottom: 30px; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h2 style="font-size: 14px; text-transform: uppercase; color: #b91c1c; margin-top: 0; margin-bottom: 15px; letter-spacing: 1px; font-weight: 800;">Información del Cliente</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 5px 0; color: #64748b; font-size: 12px; font-weight: bold; width: 30%;">NOMBRE COMPLETO:</td>
                <td style="padding: 5px 0; color: #0f172a; font-weight: bold;">${quote.name} ${quote.lastname}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0; color: #64748b; font-size: 12px; font-weight: bold;">TELÉFONO:</td>
                <td style="padding: 5px 0; color: #0f172a; font-weight: bold;">${quote.phone}</td>
              </tr>
              ${quote.cedula ? `
                  <tr>
                    <td style="padding: 5px 0; color: #64748b; font-size: 12px; font-weight: bold;">CÉDULA:</td>
                    <td style="padding: 5px 0; color: #0f172a; font-weight: bold;">${quote.cedula}</td>
                  </tr>
                  ` : ''
      }
            </table>
          </div>

          <div style="margin-bottom: 30px; background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
            <h2 style="font-size: 14px; text-transform: uppercase; color: #b91c1c; margin-top: 0; margin-bottom: 15px; letter-spacing: 1px; font-weight: 800;">Vehículo de Interés</h2>
            <p style="font-size: 24px; font-weight: 900; margin: 0; color: #0f172a;">${quote.vehicle}</p>
            <div style="margin-top: 15px; display: flex; gap: 20px;">
              <div style="padding: 10px 20px; background: #fff1f2; border-radius: 8px; text-align: center; flex: 1;">
                <p style="margin: 0; font-size: 10px; color: #b91c1c; font-weight: bold; text-transform: uppercase;">Estado</p>
                <p style="margin: 5px 0 0; font-weight: 800;">Cotizado</p>
              </div>
            </div>
          </div>

          ${quote.bank ? `
          <div style="margin-bottom: 40px; background: #eff6ff; padding: 20px; border-radius: 12px; border: 1px solid #dbeafe;">
              <h2 style="font-size: 14px; text-transform: uppercase; color: #2563eb; margin-top: 0; margin-bottom: 15px; letter-spacing: 1px; font-weight: 800;">Pre-Aprobación Bancaria</h2>
              <table style="width: 100%;">
                <tr>
                  <td style="padding: 5px 0; color: #60a5fa; font-size: 12px; font-weight: bold; width: 30%;">INSTITUCIÓN:</td>
                  <td style="padding: 5px 0; color: #1e3a8a; font-weight: 800;">${quote.bank}</td>
                </tr>
              </table>
          </div>
          ` : ''
      }

          <div style="margin-top: 60px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.6;">
            <p>Esta es una ficha de cotización informativa generada por Carbot para ${userProfile.dealerName}.<br />
              Los precios y la disponibilidad están sujetos a cambios sin previo aviso.</p>
          </div>
        </div>
      </div>
      `;
  };

  const handleDownloadPDF = async () => {
    const element = document.createElement('div');
    element.innerHTML = getQuoteHtml(false);
    document.body.appendChild(element);

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: quote.id && quote.id.startsWith('Cotizacion_') ? `${quote.id}.pdf` : `Cotizacion_${quote.name}_${quote.lastname}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const html2pdf = (await import('html2pdf.js')).default;
    const cleanElement = prepareElementForPDF(element);
    html2pdf().set(opt).from(cleanElement).save().then(() => {
      document.body.removeChild(element);
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html >
        <head>
          <title>Imprimir Cotización</title>
          <style>@page {size: letter; margin: 0; }</style>
        </head>
        <body style="margin: 0;">${getQuoteHtml()}</body>
      </html>
      `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-4xl h-[100dvh] sm:h-[90vh] animate-in zoom-in-95 duration-200 flex flex-col">
        <div className="flex flex-col h-full bg-slate-50 rounded-none sm:rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex justify-between items-center px-4 py-3 border-b bg-white sm:rounded-t-2xl shrink-0 safe-top">
            <h3 className="text-sm sm:text-xl font-bold text-slate-800 flex items-center gap-2">
              <Send size={18} className="text-red-600 sm:w-[20px] sm:h-[20px]" /> <span className="truncate max-w-[200px]">Cotización: {quote.name} {quote.lastname}</span>
            </h3>
            <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>

          <div className="flex-1 bg-white overflow-hidden relative">
            <iframe
              srcDoc={`
  < !DOCTYPE html >
    <html>
      <head>
        <title>Vista Previa de la Cotización</title>
        <style>
          html {
            height: 100%;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
                      }
          body {
            margin: 0;
          padding: 0;
          background: #f8fafc;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100%;
                      }
          .sheet-container {
            width: 215.9mm;
          max-width: 100%;
          background: white;
          box-shadow: 0 0 20px rgba(0,0,0,0.05);
          margin: 20px auto;
          min-height: 279.4mm;
          position: relative;
                      }
          @media print {
            body {background: white; padding: 0; }
          .sheet-container {box-shadow: none; margin: 0; width: 100%; }
                      }
          /* Responsive tweak for mobile */
          @media (max-width: 215.9mm) {
                        .sheet-container {
            width: 100%;
          box-shadow: none;
          margin: 0;
                        }
                      }
        </style>
      </head>
      <body>
        <div class="sheet-container">
          ${generateQuoteHtml(quote, userProfile, true)}
        </div>
      </body>
    </html>
`}
              className="w-full h-full border-none"
              title="Vista Previa de la Cotización"
            />
          </div>

          <div className="p-3 bg-white border-t sm:rounded-b-2xl flex gap-3 justify-end shrink-0 safe-bottom">
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
            <Button variant="secondary" onClick={handleDownloadPDF} icon={Download} className="border-slate-300">Descargar (PDF)</Button>
            <Button onClick={handlePrint} icon={Printer}>Imprimir</Button>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- VISTAS PRINCIPALES ---

const TrashView = ({ trash, contracts, quotes, onRestore, onPermanentDelete, onRestoreDocument, onPermanentDeleteDocument, onEmptyTrash }) => {
  const [activeTab, setActiveTab] = useState('vehicles'); // 'vehicles' or 'documents'
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  // Filtrar documentos eliminados
  const deletedDocuments = useMemo(() => {
    const deletedContracts = (contracts || []).filter(c => c.status === 'deleted').map(c => ({ ...c, docType: 'contract' }));
    const deletedQuotes = (quotes || []).filter(q => q.status === 'deleted').map(q => ({ ...q, docType: 'quote' }));
    return [...deletedContracts, ...deletedQuotes].sort((a, b) => new Date(b.deletedAt || b.createdAt) - new Date(a.deletedAt || a.createdAt));
  }, [contracts, quotes]);

  const activeList = activeTab === 'vehicles' ? trash : deletedDocuments;

  // Reset selection when tab changes
  useEffect(() => {
    setIsSelectionMode(false);
    setSelectedItems([]);
  }, [activeTab]);

  const toggleSelection = (id) => {
    setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkRestore = async () => {
    if (activeTab === 'vehicles') {
      for (const id of selectedItems) await onRestore(id);
    } else {
      const itemsToRestore = activeList.filter(i => selectedItems.includes(i.id));
      for (const item of itemsToRestore) await onRestoreDocument(item);
    }
    setSelectedItems([]);
    setIsSelectionMode(false);
  };

  const handleBulkDelete = async () => {
    if (confirm(`¿Estás seguro de eliminar permanentemente ${selectedItems.length} ítems? Esta acción NO se puede deshacer.`)) {
      if (activeTab === 'vehicles') {
        await Promise.all(selectedItems.map(id => onPermanentDelete(id, true)));
      } else {
        const itemsToDelete = activeList.filter(i => selectedItems.includes(i.id));
        await Promise.all(itemsToDelete.map(item => onPermanentDeleteDocument(item, true)));
      }
      setSelectedItems([]);
      setIsSelectionMode(false);
    }
  };

  const handleEmptyDocumentsTrash = async () => {
    if (confirm("¿Estás seguro de vaciar TODA la papelera de documentos? Esta acción NO se puede deshacer.")) {
      await Promise.all(deletedDocuments.map(item => onPermanentDeleteDocument(item, true)));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Papelera de Reciclaje</h1>
          <p className="text-slate-500 text-sm mt-1">Los ítems se eliminan permanentemente después de 15 días.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${activeTab === 'vehicles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
            >
              Vehículos ({trash.length})
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wide transition-all ${activeTab === 'documents' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'} `}
            >
              Documentos ({deletedDocuments.length})
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {activeList.length > 0 && (
              <button
                onClick={() => {
                  setIsSelectionMode(!isSelectionMode);
                  setSelectedItems([]);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide border transition-all ${isSelectionMode ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                {isSelectionMode ? 'Cancelar Selección' : 'Seleccionar Varios'}
              </button>
            )}

            {activeList.length > 0 && activeTab === 'vehicles' && (
              <Button variant="danger" icon={Trash2} onClick={onEmptyTrash} className="bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 border-transparent shadow-none whitespace-nowrap">
                Vaciar Vehículos
              </Button>
            )}
            {activeList.length > 0 && activeTab === 'documents' && (
              <Button variant="danger" icon={Trash2} onClick={handleEmptyDocumentsTrash} className="bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 border-transparent shadow-none whitespace-nowrap">
                Vaciar Documentos
              </Button>
            )}
          </div>
        </div>
      </div>

      {activeList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-gray-200">
          <Trash2 size={48} className="mb-4 text-slate-300" />
          <p className="text-lg font-medium">No hay {activeTab === 'vehicles' ? 'vehículos' : 'documentos'} en la papelera.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {activeList.map(item => (
            <div key={item.id} className={`relative group transition-all duration-300 ${isSelectionMode && selectedItems.includes(item.id) ? 'active-card-selection ring-2 ring-blue-500 rounded-2xl transform scale-[1.02]' : 'opacity-80 hover:opacity-100'}`}>

              {/* Checkbox Overlay */}
              {isSelectionMode && (
                <div
                  className="absolute inset-0 z-20 cursor-pointer"
                  onClick={() => toggleSelection(item.id)}
                >
                  <div className={`absolute top-3 right-3 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedItems.includes(item.id) ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-slate-300'}`}>
                    {selectedItems.includes(item.id) && <Check size={14} className="text-white" />}
                  </div>
                </div>
              )}

              <Card noPadding className="flex flex-col h-full border-red-100 bg-red-50/30">
                {activeTab === 'vehicles' ? (
                  <>
                    <div className="relative aspect-[16/10] bg-gray-200 overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                      {item.image && !item.image.includes('unsplash') ? (
                        <img src={item.image} alt={item.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 p-8 group-hover:scale-110 transition-transform duration-700">
                          {userProfile?.dealer_logo ? (
                            <img src={userProfile.dealer_logo} alt="Dealer Logo" className="w-full h-full object-contain opacity-60 drop-shadow-sm" />
                          ) : (
                            <div className="flex flex-col items-center text-slate-400">
                              <Car size={48} className="mb-2 opacity-50" />
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Sin Foto</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-red-900/10 mix-blend-multiply"></div>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-bold text-slate-800 text-lg line-through decoration-red-500/50">{item.make} {item.model}</h3>
                      <p className="text-xs font-semibold text-red-400 mb-4">Eliminado: {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'Hoy'}</p>

                      {!isSelectionMode && (
                        <div className="mt-auto grid grid-cols-2 gap-3">
                          <Button variant="secondary" onClick={() => onRestore(item.id)} className="w-full text-xs font-bold border-green-200 text-green-700 hover:bg-green-50 flex items-center justify-center gap-1 active:scale-95 hover:scale-[1.02] transition-all"><Undo size={14} /> RESTAURAR</Button>
                          <Button variant="secondary" onClick={() => onPermanentDelete(item.id)} className="w-full text-xs font-bold border-red-200 text-red-700 hover:bg-red-50 flex items-center justify-center gap-1 active:scale-95 hover:scale-[1.02] transition-all"><X size={14} /> BORRAR</Button>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-5 flex flex-col flex-1 h-full min-h-[200px]">
                    <div className="mb-4">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider mb-2 ${item.docType === 'contract' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'} `}>
                        {item.docType === 'contract' ? 'Contrato' : 'Cotización'}
                      </span>
                      <h3 className="font-bold text-slate-800 text-lg w-full truncate" title={item.client || item.name}>{item.client || `${item.name || ''} ${item.lastname || ''} `}</h3>
                      <p className="text-xs text-slate-500 font-medium truncate">{item.vehicle || 'Vehículo desconocido'}</p>
                    </div>

                    <p className="text-xs font-semibold text-red-400 mb-6 mt-auto">Eliminado: {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'Desconocido'}</p>

                    {!isSelectionMode && (
                      <div className="grid grid-cols-2 gap-3">
                        <Button variant="secondary" onClick={() => onRestoreDocument(item)} className="w-full text-xs font-bold border-green-200 text-green-700 hover:bg-green-50 flex items-center justify-center gap-1 active:scale-95 hover:scale-[1.02] transition-all"><Undo size={14} /> RESTAURAR</Button>
                        <Button variant="secondary" onClick={() => onPermanentDeleteDocument(item)} className="w-full text-xs font-bold border-red-200 text-red-700 hover:bg-red-50 flex items-center justify-center gap-1 active:scale-95 hover:scale-[1.02] transition-all"><X size={14} /> BORRAR</Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Floating Action Bar for Selection */}
      {isSelectionMode && selectedItems.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white p-2 rounded-2xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <span className="font-bold text-sm px-4 border-r border-slate-700">{selectedItems.length} seleccionados</span>

          <button onClick={handleBulkRestore} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-xs font-black uppercase tracking-wide transition-all flex items-center gap-2">
            <Undo size={16} /> Restaurar
          </button>

          <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-xs font-black uppercase tracking-wide transition-all flex items-center gap-2">
            <Trash2 size={16} /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
};
// --- CONFIRMATION MODAL ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", isDestructive = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-[400px] relative overflow-hidden scale-100 animate-in zoom-in-95 duration-300 border-none p-10 flex flex-col items-center text-center">

        {/* Logo Section */}
        <div className="mb-6 flex flex-col items-center">
          <AppLogo size={90} className="mb-2 drop-shadow-md" />
        </div>

        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-wide leading-tight">{title}</h3>
        <p className="text-base text-slate-500 font-bold mb-8 max-w-[80%] leading-relaxed">{message}</p>

        <div className="w-full space-y-4">
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className="w-full py-4 rounded-full bg-[#E31C25] hover:bg-red-700 text-white font-black text-sm tracking-widest uppercase shadow-xl shadow-red-600/30 transition-all active:scale-[0.98]"
          >
            {confirmText || 'CONFIRMAR ACCIÓN'}
          </button>
          {cancelText && (
            <button
              onClick={onClose}
              className="w-full py-2 text-slate-400 hover:text-slate-600 font-black text-xs tracking-widest uppercase transition-colors"
            >
              {cancelText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


// --- SETTINGS VIEW ---
const SettingsView = ({ userProfile, onLogout, onUpdateProfile, showToast, onDisconnectGhl }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    jobTitle: userProfile?.jobTitle || 'Vendedor',
    newPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        jobTitle: userProfile.jobTitle || 'Vendedor',
        newPassword: ''
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    setIsLoading(true);
    await onUpdateProfile(formData);
    setIsEditing(false);
    setIsLoading(false);
    showToast("Perfil actualizado correctamente");
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    const uploadUserId = userProfile?.id || userProfile?.uid || userProfile?.email?.replace(/\./g, '_');
    if (!file || !uploadUserId) return;

    // Validar tipo de imagen
    if (!file.type.startsWith('image/')) {
      showToast("Por favor selecciona una imagen válida.");
      return;
    }

    try {
      setIsUploading(true);
      const storagePath = `${uploadUserId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase()}`;
      let photoURL = '';

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('fotos_perfil')
        .upload(storagePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('fotos_perfil')
        .getPublicUrl(storagePath);

      photoURL = publicUrl;
      await onUpdateProfile({ ...formData, photoURL });
      showToast("Foto de perfil actualizada");
    } catch (error) {
      console.error("Error al subir foto:", error);
      showToast("Error al subir la foto");
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile?.dealerId) return;

    if (!file.type.startsWith('image/')) {
      showToast("Por favor selecciona una imagen válida.");
      return;
    }

    try {
      setIsUploadingLogo(true);
      const storagePath = `logos/${userProfile.dealerId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase()}`;
      let logoURL = '';

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('fotos_perfil')
        .upload(storagePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('fotos_perfil')
        .getPublicUrl(storagePath);

      logoURL = publicUrl;

      // Update Supabase
      const { error: supaErr } = await supabase
        .from('dealers')
        .update({ logo_url: logoURL })
        .eq('id', userProfile.dealerId);

      if (supaErr) throw supaErr;

      // Update Local userProfile to reflect it immediately
      await onUpdateProfile({ ...formData, dealer_logo: logoUrl });

      showToast("Logo del dealer actualizado");
    } catch (error) {
      console.error("Error al subir logo:", error);
      showToast("Error al subir el logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleOpenBotLink = () => {
    if (!userProfile?.dealerId) return;
    const link = `https://inventarioia-gzhz2ynksa-uc.a.run.app/?dealer=${encodeURIComponent(userProfile.dealerId)}`;
    window.open(link, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#E5E5E0] sm:p-6 md:p-12 flex items-stretch sm:items-center justify-center font-inter selection:bg-red-500/20">
      <div className="max-w-[500px] md:max-w-4xl lg:max-w-5xl w-full bg-[#f2f2f7] sm:rounded-[40px] shadow-2xl overflow-hidden flex flex-col min-h-[100vh] sm:min-h-[850px] relative animate-in fade-in zoom-in-95 duration-700 mx-auto">

        {/* --- BANNER (LIQUID GLASS LOGO CONTAINER) --- */}
        <div className="relative h-64 md:h-72 overflow-hidden bg-black rounded-b-[40px] md:rounded-b-[60px] shadow-sm flex items-center justify-center">

          {/* Base Background: either the logo or the cool liquid glass effect */}
          {userProfile?.dealer_logo ? (
            <div className="absolute inset-0 z-0 bg-slate-100">
              <img src={userProfile.dealer_logo} alt="Dealer Background" className="w-full h-full object-cover opacity-30" />
            </div>
          ) : (
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/40 via-black to-red-900/60 z-0"></div>
              <div className="absolute top-[-50%] left-[-20%] w-[120%] h-[150%] bg-red-500/30 blur-[80px] rounded-full mix-blend-screen animate-pulse z-0"></div>
              <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[100%] bg-white/10 blur-[60px] rounded-full mix-blend-overlay z-0" style={{ animationDelay: '2s' }}></div>
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[20px] z-0"></div>
            </div>
          )}

          {/* Settings Title in Header for Mobile Vibe */}
          <div className="absolute top-12 w-full px-6 flex justify-between items-center z-20">
            <h1 className="text-white text-xl font-bold tracking-wide shadow-black drop-shadow-md">Ajustes</h1>
            <button onClick={onLogout} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-colors shadow-black drop-shadow-md border border-white/10">
              <LogOut size={18} />
            </button>
          </div>

          {/* Dealer Logo Centered Normal */}
          {userProfile?.dealer_logo && (
            <div className="absolute inset-0 z-10 w-full h-full flex items-center justify-center p-8 pt-12 pointer-events-none">
              <img src={userProfile.dealer_logo} alt="Dealer Logo" className="w-full h-full object-contain drop-shadow-2xl" />
            </div>
          )}

          {/* Edit Logo Button */}
          {userProfile?.role === 'Admin' && (
            <div className="absolute bottom-6 right-6 z-30">
              <button
                onClick={() => !isUploadingLogo && logoInputRef.current?.click()}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white hover:bg-black/80 transition-all cursor-pointer shadow-xl hover:scale-105 active:scale-95"
                title="Cambiar Logo del Dealer"
              >
                {isUploadingLogo ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
              </button>
              <input
                type="file"
                ref={logoInputRef}
                onChange={handleLogoUpload}
                className="hidden"
                accept="image/*"
              />
            </div>
          )}
        </div>

        {/* --- PROFILE OVERLAP --- */}
        <div className="relative z-30 flex justify-center -mt-16 md:-mt-20 mb-4">
          <div className="relative group cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-full border-[6px] border-[#f2f2f7] bg-gradient-to-br from-slate-200 to-slate-300 shadow-xl overflow-hidden flex items-center justify-center relative bg-white">
              {(userProfile?.photoURL || userProfile?.avatar_url || userProfile?.foto_url) ? (
                <img src={userProfile.photoURL || userProfile.avatar_url || userProfile.foto_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-400 text-5xl font-black">{userProfile?.name?.charAt(0) || 'U'}</span>
              )}

              {/* Upload Overlay (Hover or Loading) */}
              <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300 ${isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {isUploading ? (
                  <Loader2 size={28} className="text-white animate-spin" />
                ) : (
                  <Camera size={28} className="text-white" />
                )}
              </div>
            </div>

            {/* Shield Badge */}
            <div className="absolute bottom-1 right-2 w-8 h-8 rounded-full border-2 border-[#f2f2f7] bg-red-600 flex items-center justify-center text-white shadow-md">
              <ShieldCheck size={14} />
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              className="hidden"
              accept="image/*"
            />
          </div>
        </div>

        {/* --- MAIN CONTENT (iOS STYLE LISTS) --- */}
        <div className="flex-1 px-4 sm:px-6 md:px-12 pb-12 overflow-y-auto z-20 flex flex-col">

          <div className="text-center mb-8">
            {isEditing ? (
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="text-2xl font-black text-slate-900 bg-transparent text-center border-b-2 border-red-500 outline-none px-2 py-1 focus:ring-4 ring-red-500/10 rounded-md transition-all mb-1"
                autoFocus
              />
            ) : (
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{formData.name || 'Usuario'}</h2>
            )}

            {isEditing ? (
              <input
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="text-sm font-bold text-slate-500 bg-transparent text-center border-b-2 border-slate-300 outline-none px-2 py-1 rounded-md transition-all"
              />
            ) : (
              <p className="text-sm font-bold text-slate-500">{formData.jobTitle || 'Vendedor'}</p>
            )}
          </div>

          {/* Edit Actions */}
          <div className="flex justify-center gap-3 mb-8">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-slate-200/50 hover:bg-slate-200 text-slate-700 rounded-full text-sm font-bold transition-colors"
              >
                Editar Perfil
              </button>
            ) : (
              <>
                <button
                  onClick={() => { setIsEditing(false); setFormData({ name: userProfile?.name || '', jobTitle: userProfile?.jobTitle || 'Vendedor', newPassword: '' }); }}
                  className="px-6 py-2 bg-slate-200/50 hover:bg-slate-200 text-slate-700 rounded-full text-sm font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-bold transition-colors shadow-md shadow-red-600/20 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
                </button>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 max-w-5xl mx-auto w-full">

            {/* COLUMN 1 */}
            <div className="space-y-6">

              {/* --- LIST GROUP: ACCOUNT --- */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cuenta</span>
                </div>
                <div className="px-5 py-4 flex items-center justify-between border-b justify-center border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                      <AtSign size={16} />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-slate-900">{userProfile?.email || 'N/A'}</span>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Canal de Correo</span>
                    </div>
                  </div>
                  <Lock size={14} className="text-slate-300" />
                </div>
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                      <Building size={16} />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-slate-900">{userProfile?.dealerName || 'CarBot Central'}</span>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dealer Asociado</span>
                    </div>
                  </div>
                  <Lock size={14} className="text-slate-300" />
                </div>
              </div>

              {/* Contraseña Edit / View block */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
                {isEditing ? (
                  <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100 text-red-600">
                        <Lock size={16} />
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-slate-900">Cambiar Contraseña</span>
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Opcional</span>
                      </div>
                    </div>
                    <input
                      type="password"
                      placeholder="Nueva contraseña (Mínimo 6 chars)"
                      value={formData.newPassword || ''}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-red-500/50 focus:ring-4 focus:ring-red-500/10 transition-all"
                    />
                    <p className="text-[10px] text-slate-400 mt-2 font-bold tracking-wide">Déjalo en blanco si no deseas cambiarla.</p>
                  </div>
                ) : (
                  <div
                    className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-100"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-500">
                        <Lock size={16} />
                      </div>
                      <div>
                        <span className="block text-sm font-bold text-slate-900">Contraseña</span>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">••••••••</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-[10px] font-black tracking-widest uppercase text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-full transition-colors"
                    >
                      Cambiar
                    </button>
                  </div>
                )}
              </div>

            </div> {/* End Column 1 */}

            {/* COLUMN 2 */}
            <div className="space-y-6">

              {/* --- LIST GROUP: HERRAMIENTAS --- */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm">
                <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Herramientas</span>
                </div>

                {[
                  {
                    title: 'Bot Carbot',
                    icon: Sparkles,
                    color: 'text-purple-500',
                    bg: 'bg-purple-100',
                    action: () => {
                      const link = `https://inventarioia-gzhz2ynksa-uc.a.run.app/?dealer=${encodeURIComponent(userProfile?.dealerId || 'default')}`;
                      navigator.clipboard.writeText(link);
                      showToast("Enlace del Bot copiado al portapapeles");
                    }
                  },
                  {
                    title: 'Estado de Plataforma',
                    icon: Link,
                    isDisconnectable: true,
                    color: !!userProfile?.ghlLocationId ? 'text-blue-500' : 'text-slate-500',
                    bg: !!userProfile?.ghlLocationId ? 'bg-blue-100' : 'bg-slate-100',
                    isConnected: !!userProfile?.ghlLocationId,
                    action: () => {
                      if (!!userProfile?.ghlLocationId) {
                        if (onDisconnectGhl) onDisconnectGhl();
                      } else {
                        const dId = userProfile?.dealerId || 'default';
                        const CLIENT_ID = '699b6f13fb99957c718a1e38-mly8nscv';
                        const REDIRECT_URI = 'https://lpiwkennlavpzisdvnnh.supabase.co/functions/v1/oauth-callback';
                        const scope = 'contacts.readonly contacts.write documents_contracts/list.readonly documents_contracts/sendLink.write';
                        const authUrl = `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scope}&state=${dId}`;
                        window.open(authUrl, '_blank');
                      }
                    }
                  },
                  {
                    title: 'Catálogo Público',
                    icon: LayoutGrid,
                    color: 'text-orange-500',
                    bg: 'bg-orange-100',
                    action: () => {
                      const link = `https://inventarioia-gzhz2ynksa-uc.a.run.app/catalogo?dealerID=${encodeURIComponent(userProfile?.dealerId || 'default')}`;
                      navigator.clipboard.writeText(link);
                      showToast("Enlace del Catálogo copiado al portapapeles");
                    }
                  },
                ].map((tool, idx, arr) => (
                  <div
                    key={idx}
                    onClick={tool.action}
                    className={`px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors active:bg-slate-100 ${idx !== arr.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${tool.isDisconnectable && !tool.isConnected ? 'bg-red-100 text-red-500' : tool.bg + ' ' + tool.color}`}>
                        <tool.icon size={16} />
                      </div>
                      <span className="text-sm font-bold text-slate-900">{tool.title}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {tool.isConnected !== undefined && (
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${tool.isConnected ? 'text-green-500' : 'text-red-500'}`}>
                          {tool.isConnected ? 'Conectado' : 'Desconectado'}
                        </span>
                      )}
                      <ChevronRight size={16} className="text-slate-300" />
                    </div>
                  </div>
                ))}
              </div>

            </div> {/* End Column 2 */}

          </div> {/* End Grid */}

          {/* CarBot System Version footer area inside scroll */}
          <div className="pt-8 text-center pb-4 mt-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] opacity-50">CarBot System v3.0</span>
          </div>

        </div>
      </div>
    </div >
  );
};

const DashboardView = ({ inventory, contracts, onNavigate, userProfile }) => {
  // Stats Calculations
  const availableInventory = inventory.filter(i => i.status === 'available' || i.status === 'quoted');
  const soldInventory = inventory.filter(i => i.status === 'sold');

  const activeInventory = (inventory || []).filter(i => i && i.status !== 'trash');
  const totalValueRD = availableInventory.reduce((acc, item) => acc + (item.price_dop || 0), 0);
  const totalValueUSD = availableInventory.reduce((acc, item) => acc + (item.price || 0), 0);

  const recentContracts = contracts.slice(0, 5);

  // Determine names from verified backend profile first, fallback to GHL iframe parameters if missing
  const params = new URLSearchParams(window.location.search);
  const rawDealerName = userProfile?.dealerName || params.get('location_name') || 'Tu Dealer';
  const displayDealerName = rawDealerName.trim().replace(/[*_~\`]/g, '').toUpperCase();
  const displayUserName = userProfile?.name || params.get('user_name') || 'Usuario';

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Welcome Banner (Red Gradient) - Mobile Optimized */}
      <Card className="relative overflow-hidden border-none bg-gradient-to-br from-red-600 to-red-800 text-white shadow-xl shadow-red-600/20">
        <div className="relative z-10 p-5 sm:p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-5 sm:gap-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black mb-1 tracking-tight">
              Bienvenido a CarBot System para
            </h1>
            <h2 className="text-lg sm:text-2xl md:text-3xl font-black italic text-red-100 tracking-wide mb-3 sm:mb-4">
              {displayDealerName}
            </h2>
            <p className="text-red-50 text-sm sm:text-base md:text-lg font-medium">
              Hola, <span className="font-bold text-white">{displayUserName.split(' ')[0]}</span>.
              Listos para vender y gestionar tu inventario hoy.
            </p>
          </div>

          <div className="flex flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => onNavigate('contracts')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl backdrop-blur-sm border border-white/20 transition-all shadow-lg active:scale-95 text-xs sm:text-base"
            >
              <FileText size={18} className="sm:w-[20px] sm:h-[20px]" />
              <span>Ver Reporte</span>
            </button>
            <button
              onClick={() => onNavigate('inventory')}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-red-600 font-bold rounded-xl shadow-lg hover:bg-gray-50 transition-all active:scale-95 text-xs sm:text-base"
            >
              <PlusCircle size={18} className="sm:w-[20px] sm:h-[20px]" />
              <span>Nuevo Vehículo</span>
            </button>

          </div>
        </div>
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 pointer-events-none"></div>
      </Card>

      {/* Row 1: Key Stats-Side by Side on Mobile */}
      <div className="grid grid-cols-2 md:grid-cols-2 gap-3 sm:gap-6">
        {/* Inventario Card */}
        <Card className="p-4 sm:p-8 border-none shadow-sm bg-white relative overflow-hidden group cursor-pointer hover:shadow-md transition-all" onClick={() => onNavigate('inventory', 'available')}>
          <div className="flex justify-between items-start">
            <div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-2 sm:mb-4 group-hover:scale-110 group-hover:rotate-12 transition-transform">
                <Box size={16} className="sm:w-[24px] sm:h-[24px]" />
              </div>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">INVENTARIO</p>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900">{availableInventory.length}</h2>
            </div>
          </div>
          <Box className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 text-slate-50 group-hover:text-blue-50/50 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500 w-[60px] h-[60px] sm:w-[120px] sm:h-[120px]" />
        </Card>

        {/* Vendidos Card */}
        <Card className="p-4 sm:p-8 border-none shadow-sm bg-white relative overflow-hidden group cursor-pointer hover:shadow-md transition-all" onClick={() => onNavigate('inventory', 'sold')}>
          <div className="flex justify-between items-start">
            <div>
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-2 sm:mb-4 group-hover:scale-110 group-hover:rotate-12 transition-transform">
                <DollarSign size={16} className="sm:w-[24px] sm:h-[24px]" />
              </div>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">VENDIDOS</p>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900">{soldInventory.length}</h2>

            </div>
            <span className="bg-red-100 text-red-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">OK</span>
          </div>
          <DollarSign className="absolute -bottom-6 -right-6 text-red-50/50 group-hover:text-red-100/50 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500" size={120} />
        </Card>
      </div>

      {/* Row 2: Global Figures */}
      <Card className="p-8 border-none shadow-sm bg-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-500/20">
              <DollarSign size={32} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">VALOR TOTAL</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">Cifras Globales</h2>
            </div>
          </div>
          <span className="bg-orange-50 text-orange-600 border border-orange-100 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
            +5.4% ESTE MES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:divide-x divide-slate-100">
          <div className="md:pr-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">EN PESOS DOMINICANOS</p>
            <p className="text-3xl sm:text-4xl font-black text-slate-900">RD$ {totalValueRD.toLocaleString()}</p>
          </div>
          <div className="md:pl-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">EN DÓLARES USD</p>
            <p className="text-3xl sm:text-4xl font-black text-red-600">US$ {totalValueUSD.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {/* Row 3: Contracts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Contratos Recientes */}
        <Card className="lg:col-span-2 p-8 border-none shadow-sm bg-white h-full">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-lg font-black text-slate-900">Contratos Recientes</h3>
            <button onClick={() => onNavigate('contracts')} className="text-[10px] font-black text-red-600 hover:text-red-700 uppercase tracking-widest flex items-center gap-1 transition-colors">
              VER TODOS <ArrowUpRight size={14} />
            </button>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">ÚLTIMAS TRANSACCIONES GENERADAS EN EL SISTEMA</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                <tr>
                  <th className="pb-4 pl-2">PRODUCTO / VEHÍCULO</th>
                  <th className="pb-4">CLIENTE</th>
                  <th className="pb-4">FECHA</th>
                  <th className="pb-4 text-right pr-2">MONTO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentContracts.length > 0 ? recentContracts.map(contract => (
                  <tr key={contract.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-2">
                      <p className="font-bold text-slate-900 text-sm">{contract.vehicle}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{contract.template}</p>
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-500 uppercase">{contract.client}</td>
                    <td className="py-4 text-xs font-bold text-slate-400 uppercase">{new Date(contract.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 text-right pr-2 font-black text-slate-900 text-sm">
                      {contract.price > 0 ? `RD$ ${contract.price.toLocaleString()}` : 'N/A'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <Box size={48} className="text-slate-300 mb-3" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">NO HAY CONTRATOS RECIENTES</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Actividad Reciente */}
        <Card className="p-8 border-none shadow-sm bg-white h-full">
          <h3 className="text-lg font-black text-slate-900 mb-1 border-b-2 border-slate-900 pb-2 inline-block">Actividad Reciente</h3>

          <div className="mt-8 space-y-6">
            <div className="flex items-center gap-3 opacity-50">
              <div className="w-2 h-2 rounded-full bg-slate-200"></div>
              <p className="text-xs font-bold text-slate-300">Sin actividad reciente</p>
            </div>
          </div>
        </Card>
      </div>

    </div>
  );
};
const InventoryView = ({ inventory, quotes = [], showToast, onGenerateContract, onGenerateQuote, onVehicleSelect, onSave, onDelete, activeTab, setActiveTab, userProfile, searchTerm, requestConfirmation, templates = [] }) => {
  const [localSearch, setLocalSearch] = useState(''); // Search inside the view
  const [sortConfig, setSortConfig] = useState('brand_asc'); // Default alphabetical by Make
  // const [activeTab, setActiveTab] = useState('available'); // Levantado al padre
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    const handleGlobalClick = () => setOpenMenuId(null);
    if (openMenuId) {
      window.addEventListener('click', handleGlobalClick);
    }
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [openMenuId]);

  const handleDuplicate = async (e, vehicle) => {
    e.stopPropagation();
    setOpenMenuId(null);

    // Preparar el duplicado sin fotos
    const { id, images, image, createdAt, updatedAt, ...rest } = vehicle;

    // Añadimos un sufijo único para evitar colisiones de ID
    const uniqueSuffix = '-' + Date.now().toString().slice(-4);
    const duplicatedData = {
      ...rest,
      vin: (rest.vin || '').trim() + uniqueSuffix,
      images: [],
      image: '',
      status: 'available'
    };

    requestConfirmation({
      title: 'Duplicar Vehículo',
      message: `¿Deseas duplicar los datos de ${vehicle.make} ${vehicle.model}? Se creará una copia sin fotos.`,
      confirmText: 'Duplicar Ahora',
      onConfirm: async () => {
        try {
          await onSave(duplicatedData);
          showToast(`¡Copia de ${vehicle.model} creada con éxito!`);
        } catch (err) {
          showToast("Error al duplicar el vehículo", "error");
        }
      }
    });
  };

  const filteredInventory = useMemo(() => {
    let result = inventory.filter(item => {
      // Robust Search String Construction
      const searchContent = `
      ${item.make || ''}
      ${item.model || ''}
      ${item.year || ''}
      ${item.color || ''}
      ${item.vin || ''}
      `.toLowerCase();

      const globalMatches = !searchTerm || searchContent.includes(searchTerm.toLowerCase());
      const localMatches = !localSearch || searchContent.includes(localSearch.toLowerCase());

      let matchesTab = true;
      if (activeTab === 'available') matchesTab = item.status === 'available' || item.status === 'quoted';
      if (activeTab === 'quoted') matchesTab = item.status === 'quoted';
      if (activeTab === 'sold') matchesTab = item.status === 'sold';
      if (activeTab === 'all') matchesTab = true;

      return globalMatches && localMatches && matchesTab;
    });

    // APLICAR ORDEN
    result.sort((a, b) => {
      switch (sortConfig) {
        case 'date_desc': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        case 'date_asc': return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        case 'updated_desc': return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
        case 'name_asc': return `${a.make || ''} ${a.model || ''}`.localeCompare(`${b.make || ''} ${b.model || ''}`);
        case 'brand_asc':
          const brandCompare = (a.make || '').localeCompare(b.make || '');
          if (brandCompare !== 0) return brandCompare;
          return (a.model || '').localeCompare(b.model || '');
        default: return 0;
      }
    });

    return result;
  }, [inventory, searchTerm, localSearch, activeTab, sortConfig]);

  const groupedInventory = useMemo(() => {
    const groups = {};
    const isBrandSort = sortConfig === 'brand_asc';

    filteredInventory.forEach(item => {
      const groupKey = isBrandSort ? item.make : "RESULTADOS";
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  }, [filteredInventory, sortConfig]);

  const sortedBrands = sortConfig === 'brand_asc'
    ? Object.keys(groupedInventory).sort()
    : Object.keys(groupedInventory);

  const handleCreate = () => { setCurrentVehicle(null); setIsModalOpen(true); };

  const handleSaveWrapper = async (data) => {
    await onSave(data);
    setIsModalOpen(false);
    setCurrentVehicle(null);
  };

  const handleDeleteWrapper = (id) => {
    requestConfirmation({
      title: '¿Confirmar Eliminación?',
      message: '¿Seguro que deseas mover este vehículo a la papelera?',
      confirmText: 'Mover a Papelera',
      isDestructive: true,
      onConfirm: () => onDelete(id)
    });
  };

  const openActionModal = (vehicle) => { setCurrentVehicle(vehicle); setIsActionModalOpen(true); };
  const handleActionSelect = (action) => {
    setIsActionModalOpen(false);
    if (action === 'quote') setIsQuoteModalOpen(true);
    else if (action === 'contract') setIsContractModalOpen(true);
  };

  const handleSellQuoted = (vehicle) => {
    // Buscar la última cotización para este vehículo (la más reciente)
    const lastQuote = quotes.find(q => q.vehicleId === vehicle.id);
    setCurrentVehicle(lastQuote || vehicle); // Si hay cotización, pasamos sus datos, sino solo el vehículo
    setIsContractModalOpen(true);
  };

  const handleQuoteSent = (quoteData) => {
    setIsQuoteModalOpen(false);
    showToast("Cotización enviada a GoHighLevel");
    // 1. Guardar la cotización en Firestore (Parent function)
    if (onGenerateQuote) onGenerateQuote(quoteData);

    // 2. Actualizar estado en Firebase a 'quoted'
    if (currentVehicle) onSave({ ...currentVehicle, status: 'quoted' });
    setCurrentVehicle(null);
  };

  const handleContractGenerated = (contractData) => {
    onGenerateContract(contractData);
    setIsContractModalOpen(false);
    setCurrentVehicle(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-4 sm:pb-6">
        <div><h1 className="text-xl sm:text-2xl font-bold text-slate-900">Inventario: <span className="text-red-700">{(new URLSearchParams(window.location.search).get('location_name') || userProfile?.dealerName || 'Mi Dealer').trim().replace(/[*_~\`]/g, '')}</span></h1><p className="text-slate-500 text-[10px] sm:text-sm mt-0.5 sm:mt-1 font-medium tracking-tight">Organizado por marcas • {filteredInventory.length} vehículos</p></div>
        <Button onClick={handleCreate} icon={Plus} className="w-full sm:w-auto shadow-lg shadow-red-600/20 py-3 sm:py-2.5">Agregar Vehículo</Button>
      </div>

      <div className="flex space-x-1 bg-slate-100/80 p-1 rounded-xl w-full sm:w-fit backdrop-blur-sm overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('available')} className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-black whitespace-nowrap transition-all duration-300 ${activeTab === 'available' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>Disponibles</button>
        <button onClick={() => setActiveTab('quoted')} className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-black whitespace-nowrap transition-all duration-300 ${activeTab === 'quoted' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>Cotizados</button>
        <button onClick={() => setActiveTab('sold')} className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-black whitespace-nowrap transition-all duration-300 ${activeTab === 'sold' ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>Vendidos</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md group w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Filtrar en esta vista..."
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-400 uppercase whitespace-nowrap">Ordenar por:</span>
          <select
            value={sortConfig}
            onChange={(e) => setSortConfig(e.target.value)}
            className="flex-1 sm:flex-none px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none cursor-pointer"
          >
            <option className="text-slate-800" value="date_desc">Más Recientes</option>
            <option className="text-slate-800" value="date_asc">Más Antiguos</option>
            <option className="text-slate-800" value="updated_desc">Última Actualización</option>
            <option className="text-slate-800" value="name_asc">Nombre (A-Z)</option>
            <option className="text-slate-800" value="brand_asc">Marca</option>
          </select>
        </div>
      </div>

      <div className="space-y-6 sm:space-y-10 mt-4">
        {sortedBrands.map(brand => (
          <div key={brand}>
            <div className="flex items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-black text-slate-800 mr-2 sm:mr-3">{brand}</h2>
              <div className="h-px flex-1 bg-gray-100"></div>
              <span className="text-[10px] font-black text-slate-400 ml-2 sm:ml-3 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">{groupedInventory[brand].length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {groupedInventory[brand].map(item => (
                <div key={item.id} onClick={() => onVehicleSelect(item)} className="cursor-pointer">
                  <Card noPadding className="group flex flex-col h-full hover:-translate-y-1 hover:shadow-xl transition-all duration-500 border-none bg-white rounded-[2rem] !overflow-visible relative">
                    <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden rounded-t-[2rem]">
                      {item.image && !item.image.includes('unsplash') ? (
                        <img src={item.image} alt={item.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-slate-50 group-hover:scale-110 transition-transform duration-1000 ease-out">
                          {userProfile?.dealer_logo ? (
                            <img src={userProfile.dealer_logo} alt="Dealer Logo" className="w-full h-full object-contain opacity-60 drop-shadow-sm" />
                          ) : (
                            <div className="flex flex-col items-center text-slate-300">
                              <Car size={48} className="mb-2 opacity-50" />
                              <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Sin Foto</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="absolute top-4 right-4 shadow-xl"><Badge status={item.status} /></div>

                      {/* Premium Overlay on Hover */}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/20">
                          Ver Detalles
                        </div>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-black text-slate-900 text-lg leading-tight">{item.make} {item.model}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.year} • {item.edition || 'EDICIÓN'} • {item.color || 'COLOR'}</p>
                        </div>
                      </div>

                      {/* Precio Section */}

                      <div className="mb-6">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Precio</p>
                        <p className="text-2xl font-black text-red-700 tracking-tighter">
                          {item.price_dop > 0 ? `RD$ ${item.price_dop.toLocaleString()}` : `US$ ${item.price.toLocaleString()}`}
                        </p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                          Inicial: <span className="text-slate-900 font-black">{item.initial_payment_dop > 0 ? `RD$ ${item.initial_payment_dop.toLocaleString()}` : `US$ ${item.initial_payment.toLocaleString()}`}</span>
                        </p>
                      </div>

                      <div className="mt-auto space-y-2">
                        {activeTab === 'quoted' ? (
                          <Button
                            className="w-full bg-slate-900 text-white hover:bg-red-700 py-3.5 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all"
                            onClick={(e) => { e.stopPropagation(); handleSellQuoted(item); }}
                          >
                            <FilePlus size={16} /> VENDER AHORA
                          </Button>
                        ) : (
                          <div className="flex items-center gap-2 relative">
                            <Button
                              variant="secondary"
                              className="flex-1 text-[10px] font-black bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-2xl flex items-center justify-center gap-2 py-3 active:scale-95 transition-all"
                              onClick={(e) => { e.stopPropagation(); openActionModal(item); }}
                            >
                              <Files size={14} /> EXPEDIENTE
                            </Button>

                            <button
                              onClick={(e) => { e.stopPropagation(); setCurrentVehicle(item); setIsModalOpen(true); }}
                              className="p-3.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-700 rounded-2xl transition-all active:scale-90"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>

                            <div className="relative">
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                                className="p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-2xl transition-all active:scale-90"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {openMenuId === item.id && (
                                <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-[2rem] shadow-2xl border border-slate-100 py-3 z-[60] animate-in slide-in-from-bottom-2">
                                  <button onClick={(e) => handleDuplicate(e, item)} className="w-full px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-3">
                                    <Copy size={14} /> Duplicar
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteWrapper(item.id); }} className="w-full px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3">
                                    <Trash2 size={14} /> Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        ))}
        {sortedBrands.length === 0 && <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-gray-200"><Car size={48} className="mb-4 text-slate-200" /><p className="text-lg font-medium">No hay vehículos. ¡Agrega uno!</p></div>}
      </div>

      <VehicleFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveWrapper} initialData={currentVehicle} userProfile={userProfile} />
      <ActionSelectionModal isOpen={isActionModalOpen} onClose={() => setIsActionModalOpen(false)} onSelect={handleActionSelect} />
      <QuoteModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} vehicle={currentVehicle} onConfirm={handleQuoteSent} userProfile={userProfile} templates={templates} />
      <GenerateContractModal isOpen={isContractModalOpen} onClose={() => { setIsContractModalOpen(false); setCurrentVehicle(null); }} inventory={inventory} onGenerate={handleContractGenerated} initialVehicle={currentVehicle} templates={templates} userProfile={userProfile} />
    </div>
  );
};

const ContractsView = ({ contracts, quotes, inventory, onGenerateContract, onDeleteContract, onGenerateQuote, onDeleteQuote, templates, onSaveTemplate, onDeleteTemplate, userProfile, searchTerm, requestConfirmation, showToast }) => {
  const [activeView, setActiveView] = useState('contracts'); // 'contracts', 'quotes', or 'templates'
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedContractPreview, setSelectedContractPreview] = useState(null);
  const [selectedQuotePreview, setSelectedQuotePreview] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [sortConfig, setSortConfig] = useState('date_desc');


  const filteredData = useMemo(() => {
    const dataToFilter = (activeView === 'contracts' ? contracts : quotes) || [];

    // 1. Filtrar por búsqueda y status
    const filtered = dataToFilter.filter(item => {

      if (item.status === 'deleted') return false; // Filter out deleted items
      const search = searchTerm.toLowerCase();


      if (activeView === 'contracts') {
        return (item?.client || '').toLowerCase().includes(search) ||
          (item?.vehicle || '').toLowerCase().includes(search) ||
          (item?.template || '').toLowerCase().includes(search);
      } else {
        return (item?.name || '').toLowerCase().includes(search) ||
          (item?.lastname || '').toLowerCase().includes(search) ||
          (item?.vehicle || '').toLowerCase().includes(search) ||
          (item?.phone || '').toLowerCase().includes(search);
      }
    });

    // 2. Ordenar
    filtered.sort((a, b) => {
      const da = new Date(a.createdAt || 0);
      const db = new Date(b.createdAt || 0);
      switch (sortConfig) {
        case 'date_desc': return db - da;
        case 'date_asc': return da - db;
        case 'client_asc': {
          const nameA = activeView === 'contracts' ? (a.client || '') : `${a.name || ''} ${a.lastname || ''}`;
          const nameB = activeView === 'contracts' ? (b.client || '') : `${b.name || ''} ${b.lastname || ''}`;
          return nameA.localeCompare(nameB);
        }
        case 'vehicle_asc': return (a.vehicle || '').localeCompare(b.vehicle || '');
        default: return 0;
      }
    });

    // 3. Agrupar por mes
    const groups = {};
    filtered.forEach(item => {
      let groupKey = "RESULTADOS DE BÚSQUEDA";
      if (sortConfig.startsWith('date')) {
        const d = item.createdAt ? new Date(item.createdAt) : new Date();
        const validDate = isNaN(d.getTime()) ? new Date() : d;
        groupKey = validDate.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' }).toUpperCase();
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  }, [contracts, quotes, activeView, searchTerm, sortConfig]);

  const handleDeleteItem = (id) => {
    const isContract = activeView === 'contracts';
    requestConfirmation({
      title: '¿Confirmar Eliminación?',
      message: isContract
        ? "¿ESTÁS SEGURO? Esta acción eliminará el contrato permanentemente."
        : "¿Seguro que deseas eliminar esta cotización?",
      confirmText: 'Eliminar',
      isDestructive: true,
      onConfirm: () => {
        if (isContract) onDeleteContract(id);
        else onDeleteQuote(id);
      }
    });
  };

  const downloadContractPDF = async (contract) => {
    const tempEl = document.createElement('div');
    tempEl.innerHTML = generateContractHtml(contract, userProfile);

    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: contract.id && contract.id.startsWith('Contrato_') ? `${contract.id}.pdf` : `Contrato_${contract.client}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    const html2pdf = (await import('html2pdf.js')).default;
    const cleanElement = prepareElementForPDF(tempEl);
    html2pdf().set(opt).from(cleanElement).save();
  };

  const downloadQuotePDF = async (quote) => {
    const tempEl = document.createElement('div');
    tempEl.innerHTML = generateQuoteHtml(quote, userProfile);
    const opt = {
      margin: [0.5, 0.5, 0.5, 0.5],
      filename: quote.id && quote.id.startsWith('Cotizacion_') ? `${quote.id}.pdf` : `Cotizacion_${quote.name}_${quote.lastname}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    const html2pdf = (await import('html2pdf.js')).default;
    const cleanElement = prepareElementForPDF(tempEl);
    html2pdf().set(opt).from(cleanElement).save();
  };

  const printContract = (contract) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Contrato</title>
          <style>@page {size: letter; margin: 0; }</style>
        </head>
        <body style="margin: 0;">${generateContractHtml(contract, userProfile)}</body>
      </html>
      `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const printQuote = (quote) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Cotización</title>
          <style>@page {size: letter; margin: 0; }</style>
        </head>
        <body style="margin: 0;">${generateQuoteHtml(quote, userProfile)}</body>
      </html>
      `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const totalItems = Object.values(filteredData).flat().length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Documentos del Negocio</h1>
          <p className="text-slate-500 text-sm mt-1">Historial organizado • {totalItems} registros</p>
        </div>

        <div className="bg-slate-200 p-1.5 rounded-xl w-full md:w-[400px] flex relative shadow-inner h-11">
          {/* VISUAL TOGGLE BACKGROUND RED */}
          <div
            className={`absolute top-1.5 bottom-1.5 rounded-lg bg-red-600 shadow-lg shadow-red-600/20 transition-all duration-300 ease-in-out z-0`}
            style={{
              left: activeView === 'contracts' ? '6px' : 'calc(50% + 2px)',
              width: 'calc(50% - 8px)',
            }}
          />

          <button
            onClick={() => setActiveView('contracts')}
            className={`relative z-10 flex-1 text-center text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${activeView === 'contracts' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Contratos
          </button>
          <button
            onClick={() => setActiveView('quotes')}
            className={`relative z-10 flex-1 text-center text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${activeView === 'quotes' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Cotizaciones
          </button>
        </div>
      </div>

      {activeView === 'contracts' || activeView === 'quotes' ? (
        <>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase">Ordenar:</span>
              <select
                value={sortConfig}
                onChange={(e) => setSortConfig(e.target.value)}
                className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none cursor-pointer outline-none"
              >
                <option className="text-slate-800" value="date_desc">Más Recientes</option>
                <option className="text-slate-800" value="date_asc">Más Antiguos</option>
                <option className="text-slate-800" value="client_asc">Nombre</option>
                <option className="text-slate-800" value="vehicle_asc">Vehiculo</option>
              </select>
            </div>

            {/* DESKTOP ACTION BUTTON */}
            <div className="hidden sm:block">
              {activeView === 'contracts' ? (
                <Button icon={FilePlus} onClick={() => { setEditingContract(null); setIsGenerateModalOpen(true); }} className="w-full sm:w-auto">
                  Nuevo Contrato
                </Button>
              ) : (
                <Button icon={Send} onClick={() => setIsQuoteModalOpen(true)} className="w-full sm:w-auto" variant="primary">
                  Nueva Cotización
                </Button>
              )}
            </div>
          </div>

          {/* MOBILE FIXED ACTION BUTTON */}
          <div className="sm:hidden fixed bottom-28 right-4 left-4 z-[60]">
            {activeView === 'contracts' ? (
              <Button icon={FilePlus} onClick={() => { setEditingContract(null); setIsGenerateModalOpen(true); }} className="w-full py-3 shadow-xl shadow-red-600/30 border-2 border-white/50">
                Nuevo Contrato
              </Button>
            ) : (
              <Button icon={Send} onClick={() => setIsQuoteModalOpen(true)} className="w-full py-3 shadow-xl shadow-red-600/30 border-2 border-white/50" variant="primary">
                Nueva Cotización
              </Button>
            )}
          </div>

          <div className="space-y-12">
            {Object.keys(filteredData).map(groupName => (
              <div key={groupName} className="space-y-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-sm font-black text-slate-400 tracking-widest uppercase">{groupName}</h2>
                  <div className="h-px flex-1 bg-slate-100"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredData[groupName].map(item => (
                    <div key={item.id} className="bg-white rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.04)] ring-1 ring-slate-100 group hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-300">
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className={`p-3 rounded-2xl shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${activeView === 'contracts' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {activeView === 'contracts' ? <FileText size={24} /> : <Send size={24} />}
                          </div>
                          <div className="flex gap-1">
                            {activeView === 'contracts' ? (
                              <>
                                <button onClick={() => setSelectedContractPreview(item)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transform hover:scale-110 active:scale-95 transition-all" title="Ver Contrato"><Eye size={18} /></button>
                                <button onClick={() => { setEditingContract(item); setIsGenerateModalOpen(true); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transform hover:scale-110 active:scale-95 transition-all" title="Editar"><Edit size={18} /></button>
                                <button onClick={() => printContract(item)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transform hover:scale-110 active:scale-95 transition-all" title="Imprimir"><Printer size={18} /></button>
                                <button onClick={() => downloadContractPDF(item)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transform hover:scale-110 active:scale-95 transition-all" title="Descargar PDF"><Download size={18} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => setSelectedQuotePreview(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transform hover:scale-110 active:scale-95 transition-all" title="Ver Cotización"><Eye size={18} /></button>
                                <button onClick={() => printQuote(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transform hover:scale-110 active:scale-95 transition-all" title="Imprimir"><Printer size={18} /></button>
                                <button onClick={() => downloadQuotePDF(item)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transform hover:scale-110 active:scale-95 transition-all" title="Descargar Ficha"><Download size={18} /></button>
                              </>
                            )}
                            <button onClick={() => handleDeleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transform hover:scale-110 active:scale-95 transition-all" title="Eliminar"><Trash2 size={18} /></button>
                          </div>
                        </div>

                        <h3 className="text-lg font-black text-slate-900 mb-1">
                          {activeView === 'contracts' ? item.client : `${item.name} ${item.lastname}`}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-1">
                          <Car size={12} /> {item.vehicle}
                        </p>

                        {activeView === 'quotes' && (
                          <div className="space-y-2 mt-4 pt-4 border-t border-slate-50">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-400 font-bold uppercase">Teléfono:</span>
                              <span className="text-slate-700 font-bold">{item.phone}</span>
                            </div>
                            {item.bank && (
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-bold uppercase">Banco:</span>
                                <span className="text-slate-700 font-bold">{item.bank}</span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            {item.createdAt && !isNaN(new Date(item.createdAt).getTime())
                              ? new Date(item.createdAt).toLocaleDateString()
                              : 'Sin fecha'}
                          </div>
                          {activeView === 'contracts' && <span className="px-2 py-0.5 bg-slate-100 rounded-md text-slate-600">{item.template}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {totalItems === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <Files size={64} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">No hay {activeView === 'contracts' ? 'contratos' : 'cotizaciones'} registradas</p>
              </div>
            )}
          </div>

          {isGenerateModalOpen && (
            <GenerateContractModal
              isOpen={isGenerateModalOpen}
              onClose={() => setIsGenerateModalOpen(false)}
              inventory={inventory}
              templates={templates} // Pass dynamic templates
              onGenerate={onGenerateContract}
              initialVehicle={editingContract}
              userProfile={userProfile}
            />
          )}

          {isQuoteModalOpen && (
            <GenerateQuoteModal
              isOpen={isQuoteModalOpen}
              onClose={() => setIsQuoteModalOpen(false)}
              inventory={inventory}
              onSave={onGenerateQuote}
              templates={templates}
            />
          )}

          {selectedContractPreview && (
            <ContractPreviewModal
              isOpen={!!selectedContractPreview}
              onClose={() => setSelectedContractPreview(null)}
              contract={selectedContractPreview}
              userProfile={userProfile}
            />
          )}

          {selectedQuotePreview && (
            <QuotePreviewModal
              isOpen={!!selectedQuotePreview}
              onClose={() => setSelectedQuotePreview(null)}
              quote={selectedQuotePreview}
              userProfile={userProfile}
            />
          )}
        </>
      ) : null}
    </div >
  );
};

// --- LAYOUT ---
const AppLayout = ({ children, activeTab, setActiveTab, onLogout, userProfile, searchTerm, onSearchChange }) => {
  const menuItems = [
    { id: 'dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
    { id: 'inventory', label: 'INVENTARIO', icon: Box },
    { id: 'contracts', label: 'CONTRATOS', icon: FileText },
    { id: 'settings', label: 'AJUSTES', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-red-200 selection:text-red-900 pb-20 sm:pb-0">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm px-4 sm:px-6 py-2 sm:py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          {/* Left: Logo & Brand */}
          <div className="flex-1 flex items-center">
            <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <AppLogo size={50} className="sm:h-[65px]" />
              <div className="hidden lg:flex flex-col leading-none ml-2">
                <span className="text-sm font-bold text-slate-500 tracking-[0.05em] mb-[-3px]">
                  CarBot
                </span>
                <span className="text-lg font-black tracking-tighter mt-[-2px] text-red-600">
                  System
                </span>
              </div>
            </div>
          </div>

          {/* Center: Main Nav Items (Hidden on Mobile) */}
          <nav className="hidden sm:flex items-center justify-center flex-1 px-8 gap-2">
            {menuItems.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 border border-transparent ${isActive
                    ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 font-black tracking-wide transform scale-105'
                    : 'text-slate-500 font-bold hover:bg-slate-50 hover:text-slate-800 hover:border-slate-100'
                    }`}
                >
                  <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="uppercase text-[11px] tracking-widest">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Side: Search, Trash, User */}
          <div className="flex-1 flex items-center gap-2 sm:gap-4 justify-end">

            {/* Trash Icon (Visible on all sizes, but adjusted for mobile) */}
            <button
              onClick={() => setActiveTab('trash')}
              className={`p-2 rounded-xl transition-all ${activeTab === 'trash' ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'} `}
              title="Ir a Basurero"
            >
              <Trash2 size={18} className="sm:w-[20px] sm:h-[20px]" />
            </button>

            {/* User Profile Info */}
            <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 leading-tight">
                  {userProfile?.name || new URLSearchParams(window.location.search).get('user_name') || 'Usuario'}
                </p>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-tighter">
                  {(userProfile?.dealerName || new URLSearchParams(window.location.search).get('location_name') || 'Mi Dealer').trim().replace(/[*_~\`]/g, '')}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center text-red-600 text-xs sm:text-base font-black border-2 border-white shadow-sm ring-1 ring-red-100 overflow-hidden">
                {userProfile?.avatar_url ? (
                  <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  (userProfile?.name || new URLSearchParams(window.location.search).get('user_name') || 'U').charAt(0)
                )}
              </div>
              <button onClick={onLogout} className="p-1 sm:p-2 text-slate-300 hover:text-red-600 transition-colors">
                <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500" >
        {children}
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-around shadow-[0_-4px_10px_rgba(0,0,0,0.03)] backdrop-blur-lg bg-white/90" >
        {
          menuItems.map(item => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 transition-all duration-300 ${isActive ? 'text-red-600 scale-110' : 'text-slate-400'}`}
              >
                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
                {isActive && <div className="w-1 h-1 bg-red-600 rounded-full mt-0.5"></div>}
              </button>
            );
          })
        }
      </div>
    </div>
  );
};

// --- Reemplaza tu LoginScreen actual con este ---
const LoginScreen = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    const email = e.target.elements.email.value;
    const password = e.target.elements.password.value;
    setTimeout(() => {
      const normalizedEmail = email.trim().toLowerCase();
      onLogin({ email: normalizedEmail, password });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-[420px] bg-white rounded-[32px] shadow-2xl border border-white/50 flex flex-col justify-center relative overflow-hidden p-8 sm:p-10">

        {/* Top Red Border */}
        <div className="absolute top-0 left-0 w-full h-2 bg-[#E31C25]"></div>

        <div className="text-center mb-10 flex flex-col items-center mt-4">
          <div className="relative mb-6">
            <AppLogo size={72} className="relative z-10 drop-shadow-md" />
          </div>
          <div className="flex flex-col items-center leading-tight">
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
              CarBot <span className="text-[#E31C25]">System</span>
            </h1>
            <p className="text-slate-500 font-semibold text-sm mt-3 tracking-wide">Gestión inteligente de inventario</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center font-medium">
            <AlertTriangle size={18} className="mr-2 shrink-0" /> {error}
          </div>
        )}

        <div className="space-y-6">

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1 mb-2 block">Correo Electrónico</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    name="email"
                    type="email"
                    placeholder="tu@correo.com"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/50 transition-all font-bold text-slate-800 placeholder:text-slate-300"
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1 mb-2 block">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/50 transition-all font-bold text-slate-800 placeholder:text-slate-300 text-lg tracking-widest"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center pt-2">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${rememberMe ? 'bg-red-600 border-red-600' : 'border-slate-300 bg-white group-hover:border-red-400'}`}>
                  {rememberMe && <Check size={14} className="text-white stroke-[4]" />}
                </div>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="hidden"
                />
                <span className="text-sm text-slate-600 font-bold group-hover:text-slate-800 transition-colors">Mantener sesión abierta</span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="w-full py-3.5 bg-[#E31C25] hover:bg-red-700 text-white font-black text-base rounded-2xl shadow-lg shadow-red-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <span>Entrar al Sistema</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-8 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Diseñado por <span className="text-red-500">CARBOT RD</span></p>
            <p className="text-[11px] font-black text-slate-500 font-mono">V3.0 • © 2026</p>
          </div>

        </div>
      </div>
    </div>
  );
};

// Función robusta para normalizar IDs (Sin acentos, sin fantasmas)
// Esta versión es agresiva: quita tildes, puntos, comas y deja solo letras/números/espacios
const normalizeStringForId = (str) => {
  if (!str) return '';

  // 1. Intento de reparar mojibake si detectamos errores comunes de GHL
  let clean = str;
  if (str.includes('Ã')) {
    try { clean = decodeURIComponent(escape(str)); } catch (e) { }
  }

  // NUEVO ESTÁNDAR: Eliminar puntos antes de normalizar para evitar S R L
  return clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\./g, '')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};


export default function CarbotApp() {
  // --- 0. DETECCIÓN SÍNCRONA DE PARÁMETROS GHL ---
  // --- 0. DETECCIÓN SÍNCRONA DE PARÁMETROS GHL & ROUTING ---
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const pathname = window.location.pathname;

  // Pretty URL Detection: /tienda/:slug o /inventario/:slug o /inventario/:slug/:id
  const isStoreRoute = pathname.startsWith('/tienda/') || pathname.startsWith('/inventario/');
  const pathParts = decodeURIComponent(pathname).split('/').filter(Boolean); // [tienda|inventario, slug, id?]
  const storeDealerSlug = pathParts[1] || null;
  const vehicleIdFromPath = pathParts[0] === 'inventario' ? pathParts[2] : null;

  const urlLocationId = params.get('location_id');
  const urlLocationName = params.get('location_name') || (isStoreRoute && storeDealerSlug ? storeDealerSlug.replace(/-/g, ' ').toUpperCase() : null);
  const urlUserName = params.get('user_name');
  const urlUserEmail = (params.get('user_email') || '').toLowerCase();
  const urlUserId = params.get('user_id'); // Nuevo: ID del usuario enviado por GHL

  const getStandardDealerId = (name, id) => {
    // CAMBIO SOLICITADO: ID del Documento = Nombre Normalizado (Sin tildes/Ñ)
    if (name) {
      return normalizeStringForId(name).toUpperCase();
    }
    // Fallback solo si no hay nombre
    if (id) return id;
    return null; // Cambiado de 'MI DEALER' para evitar falsos positivos en búsqueda
  };

  // Trigger login if location_id is present OR we have a previously saved session OR we are in Store Mode
  const isAutoLogin = !!(urlLocationId || isStoreRoute) && sessionStorage.getItem('manualLogout') !== 'true';
  const [isLoggedIn, setIsLoggedIn] = useState(isAutoLogin || !!localStorage.getItem('lastUserEmail'));
  const [ghlSSOLoading, setGhlSSOLoading] = useState(isAutoLogin && !!urlUserEmail);
  const [activeTab, setActiveTab] = useState(() => {
    if (isStoreRoute) return 'inventory';
    return localStorage.getItem('activeTab') || 'dashboard';
  });

  // --- CONFIRMATION STATE ---
  const [confirmationModal, setConfirmationModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDestructive: false,
    confirmText: 'Confirmar'
  });

  const requestConfirmation = ({ title, message, onConfirm, isDestructive = false, confirmText = 'Confirmar' }) => {
    setConfirmationModal({ isOpen: true, title, message, onConfirm, isDestructive, confirmText });
  };


  const [globalSearch, setGlobalSearch] = useState('');
  // Nuevo Estado: Filtro de Inventario (Levantamos el estado para controlarlo desde Dashboard)
  const [inventoryTab, setInventoryTab] = useState('available');

  // 1. ESTADO DE DATOS (Vacío al inicio, se llena desde Firebase)
  const [inventory, setInventory] = useState([]);
  const [legacyContracts, setLegacyContracts] = useState([]);
  const [legacyQuotes, setLegacyQuotes] = useState([]);
  const [legacyDocs, setLegacyDocs] = useState([]);
  const [newContracts, setNewContracts] = useState([]);
  const [newQuotes, setNewQuotes] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [userProfile, setUserProfile] = useState(null);
  const [resolvedDealerId, setResolvedDealerId] = useState(null);

  const [toast, setToast] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => { localStorage.setItem('activeTab', activeTab); }, [activeTab]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  // 1.b AUTH STATE LISTENER
  const [initializing, setInitializing] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState(() => (urlUserEmail || localStorage.getItem('lastUserEmail') || '').toLowerCase());

  // --- SYNC USUARIOS ACTIVOS (GHL SPECIFIC) ---
  useEffect(() => {
    // Only sync if NOT in store route (Don't track public visitors as GHL users)
    if ((urlLocationName || urlLocationId) && !isStoreRoute) {
      const syncActiveUser = async () => {
        try {
          const cleanDisplayName = (urlLocationName || '').trim().replace(/[*_~\`]/g, '');
          const stableId = getStandardDealerId(urlLocationName, urlLocationId);

          // VERIFICACIÓN DE UNICIDAD: ghlLocationId solo para 1 dealer
          if (urlLocationId) {
            const dealerQuery = query(collection(db, "Dealers"), where("ghlLocationId", "==", urlLocationId));
            const dealerSnap = await getDocs(dealerQuery);
            if (!dealerSnap.empty && dealerSnap.docs[0].id !== stableId) {
              console.warn("ALERTA: ghlLocationId ya pertenece a otro dealer:", dealerSnap.docs[0].id);
              // Podríamos lanzar error o simplemente registrarlo. Por ahora advertimos.
            }
          }

          const activeUserRef = doc(db, "usuarios_activos", stableId);
          await setDoc(activeUserRef, {
            location_id: urlLocationId || '',
            location_name: cleanDisplayName,
            user_name: urlUserName || urlUserEmail?.split('@')[0] || 'Usuario GHL',
            user_email: (urlUserEmail || '').toLowerCase(),
            user_id: urlUserId || '', // Nuevo: ID del usuario desde GHL
            lastActive: new Date().toISOString(),
            source: 'GoHighLevel',
            stableId: stableId
          }, { merge: true });
        } catch (error) {
          console.error("Error sincronizando usuario activo:", error);
        }
      };
      syncActiveUser();
    }
  }, [urlLocationName, urlLocationId, urlUserName, urlUserEmail, isStoreRoute]);

  // ── GHL Auto-Login SSO ─────────────────────────────────────────
  useEffect(() => {
    if (!urlUserEmail || !urlLocationId || sessionStorage.getItem('manualLogout') === 'true') {
      return; // No params or manually logged out → normal login flow
    }

    const runGHLSSO = async () => {
      setGhlSSOLoading(true);
      try {
        const res = await fetch(
          'https://lpiwkennlavpzisdvnnh.supabase.co/functions/v1/ghl-autologin',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: urlUserEmail,
              name: urlUserName || '',
              location_id: urlLocationId,
              location_name: urlLocationName || '',
            }),
          }
        );
        const result = await res.json();

        if (result.hashed_token) {
          // Verify OTP → creates real Supabase session
          const { error: verifyErr } = await supabase.auth.verifyOtp({
            token_hash: result.hashed_token,
            type: 'email',
          });
          if (!verifyErr) {
            // Clean URL params for security
            window.history.replaceState({}, '', window.location.pathname);
          }
        }
        // Whether SSO succeeded or had error, mark as logged in (GHL trust)
        setCurrentUserEmail(urlUserEmail);
        setIsLoggedIn(true);
      } catch (e) {
        console.error('GHL SSO error:', e);
        // Fallback: trust GHL params anyway
        setCurrentUserEmail(urlUserEmail);
        setIsLoggedIn(true);
      } finally {
        setGhlSSOLoading(false);
      }
    };

    runGHLSSO();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // ── Supabase Auth listener (reemplaza onAuthStateChanged de Firebase) ──
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setIsLoggedIn(true);
        setCurrentUserEmail(session.user.email);
        localStorage.setItem('lastUserEmail', session.user.email);
      } else if (isAutoLogin) {
        const emailToUse = (urlUserEmail || localStorage.getItem('lastUserEmail') || (urlUserId ? `${urlUserId}@ghl.com` : (urlLocationId ? `admin@${urlLocationId}.com` : ''))).toLowerCase();
        if (emailToUse || isStoreRoute) {
          setCurrentUserEmail(emailToUse);
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
      }
      setInitializing(false);
    });
    return () => subscription.unsubscribe();
  }, [isAutoLogin, urlUserEmail, isStoreRoute, urlLocationId, urlLocationName]);

  // --- AUTO-SELECT VEHICLE FROM URL ---
  useEffect(() => {
    if (vehicleIdFromPath && inventory.length > 0 && !selectedVehicle) {
      const vehicle = inventory.find(v => v.id === vehicleIdFromPath);
      if (vehicle) {
        console.log("🎯 Auto-seleccionando vehículo desde URL:", vehicleIdFromPath);
        setSelectedVehicle(vehicle);
      }
    }
  }, [vehicleIdFromPath, inventory, selectedVehicle]);

  // --- RESOLUCIÓN DE DEALER POR SLUG (PUBLIC MODE) ---
  useEffect(() => {
    if (isStoreRoute && storeDealerSlug) {
      const resolveDealer = async () => {
        try {
          // 1. Intentar ID directo (Normalizado)
          const potentialId = getStandardDealerId(storeDealerSlug);
          if (potentialId) {
            const dRef = doc(db, "Dealers", potentialId);
            const dSnap = await getDoc(dRef);
            if (dSnap.exists()) {
              setResolvedDealerId(potentialId);
              return;
            }
          }

          // 2. Buscar por campo 'slug' (Normalizado con guiones)
          const normalizedSlug = storeDealerSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          const q = query(collection(db, "Dealers"), where("slug", "==", normalizedSlug));
          const s = await getDocs(q);
          if (!s.empty) {
            setResolvedDealerId(s.docs[0].id);
            return;
          }

          // 3. Last Resort: usaremos el normalizado
          setResolvedDealerId(potentialId);
        } catch (err) {
          console.error("Error resolviendo dealer:", err);
        }
      };
      resolveDealer();
    }
  }, [isStoreRoute, storeDealerSlug]);

  // --- 1.c RESOLUCIÓN DE CONTEXTO (IFRAME SAFE) ---
  const effectiveDealerId = useMemo(() => {
    return userProfile?.dealerId || resolvedDealerId || getStandardDealerId(urlLocationName, urlLocationId);
  }, [userProfile?.dealerId, resolvedDealerId, urlLocationName, urlLocationId]);

  // Perfil "Sombra" para cuando fall Auth en IFRAME
  const shadowProfile = useMemo(() => {
    if (userProfile) return userProfile;
    if (!effectiveDealerId) return null;
    return {
      dealerId: effectiveDealerId,
      dealerName: urlLocationName || 'Mi Dealer',
      name: urlUserName || urlUserEmail?.split('@')[0] || 'Usuario GHL',
      email: urlUserEmail || '',
      role: 'Admin', // Default for GHL context
      ghlLocationId: urlLocationId || '',
      dealer_logo: userProfile?.dealer_logo || '',
      avatar_url: userProfile?.avatar_url || userProfile?.foto_url || ''
    };
  }, [userProfile, effectiveDealerId, urlLocationName, urlUserName, urlUserEmail, urlLocationId]);

  // --- LIMPIEZA DE ESTADO AL CAMBIAR DE CONTEXTO ---
  useEffect(() => {
    if (urlLocationId || urlLocationName) {
      console.log("🧹 Contexto cambiado, limpiando inventario y documentos...");
      setInventory([]);
      setNewContracts([]);
      setNewQuotes([]);
      setLegacyContracts([]);
      setLegacyQuotes([]);
      setLegacyDocs([]);
      setUserProfile(null);
    }
  }, [urlLocationId, urlLocationName]);

  // --- FILTROS GLOBALES ---
  const activeInventory = useMemo(() => (inventory || []).filter(i => i && i.status !== 'trash'), [inventory]);
  const trashInventory = useMemo(() => (inventory || []).filter(i => i && i.status === 'trash'), [inventory]);

  // Fetch user profile when logged in
  useEffect(() => {
    if (isLoggedIn && currentUserEmail) {
      const fetchUserProfile = async () => {
        try {
          const emailLower = currentUserEmail.toLowerCase();
          const userId = emailLower.replace(/\./g, '_');
          let profileData = null;
          let dealerIdToUse = getStandardDealerId(urlLocationName, urlLocationId);

          // ESTRATEGIA DE BÚSQUEDA ROBUSTA (MIGRACIÓN):
          console.log("🔍 Iniciando búsqueda de perfil para:", emailLower);

          // 1. Scoped: Dealers/[ID]/usuarios/[USER_ID]
          if (dealerIdToUse) {
            const diRef = doc(db, "Dealers", dealerIdToUse, "usuarios", userId);
            const diSnap = await getDoc(diRef);
            if (diSnap.exists()) {
              console.log("✅ Perfil encontrado en Scoped Collection (New ID):", dealerIdToUse);
              profileData = diSnap.data();
              profileData.dealerId = dealerIdToUse;
            } else {
              // FALLBACK A ID LEGADO (Con espacios)
              const legacyId = dealerIdToUse.split('').join(' ').replace(/\s+/g, ' ');
              const legacyScopedRef = doc(db, "Dealers", legacyId, "usuarios", userId);
              const legacyScopedSnap = await getDoc(legacyScopedRef);
              if (legacyScopedSnap.exists()) {
                console.log("✅ Perfil encontrado en Scoped Collection (Legacy ID):", legacyId);
                profileData = legacyScopedSnap.data();
                profileData.dealerId = legacyId;
              }
            }
          }

          // 2. BUSQUEDA GLOBAL: collectionGroup (Solo para Manual Login o si no hay dealerIdToUse específico)
          if (!profileData && !dealerIdToUse) {
            try {
              console.log("🔍 Buscando usuario vía Global Search...");
              const ugq = query(collectionGroup(db, "usuarios"), where("email", "==", emailLower));
              const ugs = await getDocs(ugq);
              if (!ugs.empty) {
                const ud = ugs.docs[0];
                const realDealerId = ud.ref.parent.parent.id;
                console.log("✅ Usuario encontrado bajo el dealer (Global):", realDealerId);
                profileData = ud.data();
                profileData.dealerId = realDealerId;
              }
            } catch (err) {
              console.warn("⚠️ Global lookup fail (Probablemente falta índice):", err);
            }
          }

          // 3. RECUPERACIÓN (Escaneo Manual Seguro): Solo para Manual Login
          if (!profileData && !dealerIdToUse) {
            try {
              console.log("⚡ Iniciando escaneo manual de seguridad...");
              const dealersSnap = await getDocs(collection(db, "Dealers"));
              for (const dealerDoc of dealersSnap.docs) {
                const userInDealerRef = doc(db, "Dealers", dealerDoc.id, "usuarios", userId);
                const userInDealerSnap = await getDoc(userInDealerRef);
                if (userInDealerSnap.exists()) {
                  console.log("🎯 Usuario encontrado en Dealer:", dealerDoc.id);
                  profileData = userInDealerSnap.data();
                  profileData.dealerId = dealerDoc.id;
                  break;
                }
              }
            } catch (err) { console.error("❌ Falló escaneo manual:", err); }
          }

          // 4. Fallback AutoLogin (Creates or links profile if in GHL/Store context)
          if (!profileData && isAutoLogin) {
            console.log("✨ Perfil nuevo detectado vía AutoLogin");
            const urlName = params.get('user_name');
            const urlDealerName = params.get('location_name');
            const cleanDisplayDealerName = urlDealerName ? urlDealerName.trim().replace(/[*_~\`]/g, '') : (urlLocationName || 'Mi Dealer');
            const stableDealerId = getStandardDealerId(urlLocationName || 'Mi Dealer', urlLocationId);

            profileData = {
              name: urlName || emailLower.split('@')[0] || 'Usuario GHL',
              email: emailLower,
              dealerId: stableDealerId,
              dealerName: cleanDisplayDealerName,
              jobTitle: 'Admin',
              role: 'Admin',
              uid: auth.currentUser?.uid || null,
              createdAt: new Date().toISOString(),
              ghlLocationId: urlLocationId || '',
              ghlUserId: urlUserId || ''
            };
          }

          // 5. Fallback Supabase (Para usuarios sincronizados que aún no existen en Firebase local)
          if (!profileData && !isAutoLogin) {
            try {
              console.log("⚡ Buscando usuario en Supabase (migración transparente)...");
              const { data: supaUser, error: supaErr } = await supabase
                .from('usuarios')
                .select('nombre, correo, rol, dealer_id, avatar_url, foto_url, dealers(nombre, ghl_location_id, logo_url)')
                .eq('correo', emailLower)
                .maybeSingle();

              if (supaUser && supaUser.dealers && supaUser.dealer_id) {
                console.log("🎯 Usuario recuperado desde Supabase:", supaUser.dealer_id);
                profileData = {
                  name: supaUser.nombre || emailLower.split('@')[0],
                  email: supaUser.correo,
                  dealerId: supaUser.dealer_id,
                  dealerName: supaUser.dealers.nombre || 'Mi Dealer',
                  jobTitle: supaUser.rol || 'Asesor',
                  role: supaUser.rol || 'Asesor',
                  uid: auth.currentUser?.uid || null,
                  createdAt: new Date().toISOString(),
                  ghlLocationId: supaUser.dealers.ghl_location_id || '',
                  ghlUserId: '',
                  avatar_url: supaUser.avatar_url || supaUser.foto_url || '',
                  dealer_logo: supaUser.dealers.logo_url || ''
                };
              }
            } catch (err) {
              console.error("❌ Falló búsqueda en Supabase:", err);
            }
          }

          if (profileData && profileData.dealerId) {
            const userId = emailLower.replace(/\./g, '_');

            // Garantizar que exista un ID válido para Storage Uploads y referencias
            profileData.id = profileData.id || auth.currentUser?.uid || userId;

            const dealerUserRef = doc(db, "Dealers", profileData.dealerId, "usuarios", userId);

            // Verificación estricta de contraseña si no es AutoLogin
            if (!isAutoLogin && auth.currentUser) {
              // Aquí delegamos la seguridad a Firebase Auth. Si llegó aquí está authenticado.
            }

            // SINCRO DEFINITIVA DE DEALER Y BOT
            try {
              const dealerRef = doc(db, "Dealers", profileData.dealerId);
              const dealerName = profileData.dealerName || 'Mi Dealer';
              const idBusqueda = dealerName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9 ]/g, "");

              await setDoc(dealerRef, {
                name: dealerName,
                id_busqueda: idBusqueda,
                nombre: dealerName,
                lastActive: new Date().toISOString(),
                ghlLocationId: profileData.ghlLocationId || ''
              }, { merge: true });

              // Solo guardamos el perfil SI el dealerId coincide (o si no teníamos uno)
              await setDoc(dealerUserRef, profileData, { merge: true });

              // Inicializar configuración de Bot
              const botConfigRef = doc(db, "Dealers", profileData.dealerId, ":DATA BOT RN", "CONFIG");
              const cleanLinkName = dealerName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
              const linkTienda = `https://carbotsystem.web.app/tienda/${cleanLinkName}`;

              await setDoc(botConfigRef, {
                LINK_INVENTARIO_GHL: `https://inventarioia-gzhz2ynksa-uc.a.run.app/?dealer=${encodeURIComponent(profileData.dealerId)}`,
                LINK_TIENDA: linkTienda,
                bot_active: true,
                lastSyncFromApp: new Date().toISOString(),
                dealerName: dealerName
              }, { merge: true });
            } catch (syncErr) {
              console.warn("⚠️ No se pudo sincronizar data de Dealer/Bot (Permisos):", syncErr);
            }

            // --- FETCH SUPABASE GHL ONBOARDING DATA ---
            try {
              const { data: supaUser, error: supaErr } = await supabase
                .from('usuarios')
                .select('dealer_id, avatar_url, role_en_ghl, phone, dealers(logo_url, address, website)')
                .eq('correo', emailLower)
                .maybeSingle();

              if (supaUser) {
                profileData.avatar_url = supaUser.avatar_url;
                profileData.ghl_role = supaUser.role_en_ghl;
                profileData.phone = supaUser.phone;
                if (supaUser.dealer_id) {
                  profileData.supabaseDealerId = supaUser.dealer_id;
                }
                if (supaUser.dealers) {
                  profileData.dealer_logo = supaUser.dealers.logo_url;
                  profileData.dealer_website = supaUser.dealers.website;
                  profileData.dealer_address = supaUser.dealers.address;
                }
              }

              // --- DEEP RESOLUTION FALLBACK (RESOLVER UUID POR GHL LOCATION ID) ---
              if (!profileData.supabaseDealerId && urlLocationId) {
                console.log("🔍 Buscando UUID del dealer por GHL Location ID:", urlLocationId);
                const { data: dealerData, error: dealerErr } = await supabase
                  .from('dealers')
                  .select('id, logo_url, address, website')
                  .eq('ghl_location_id', urlLocationId)
                  .maybeSingle();

                if (dealerData) {
                  console.log("✅ UUID de Dealer resuelto:", dealerData.id);
                  profileData.supabaseDealerId = dealerData.id;
                  profileData.dealer_logo = profileData.dealer_logo || dealerData.logo_url;
                  profileData.dealer_address = profileData.dealer_address || dealerData.address;
                  profileData.dealer_website = profileData.dealer_website || dealerData.website;
                }
              }
            } catch (err) {
              console.error("No se pudo obtener data de Supabase:", err);
            }

            setUserProfile(profileData);
          } else {
            // No se pudo determinar el dealer
            if (!isAutoLogin) {
              showToast("No se encontró cuenta asociada. Contacta soporte.", "error");
              await supabase.auth.signOut();
              setIsLoggedIn(false);
            } else {
              // Si es auto-login pero falló todo, evitamos el hang poniendo isLoggedIn en false
              setIsLoggedIn(false);
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          showToast("Error de conexión", "error");
        }
      };
      fetchUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [isLoggedIn, currentUserEmail, isAutoLogin, params, isStoreRoute, urlLocationId, urlLocationName]);

  const handleUpdateProfile = async (updatedData) => {
    if (!currentUserEmail || !userProfile?.dealerId) return;
    try {
      const emailLower = currentUserEmail.toLowerCase();
      const userId = currentUserEmail.replace(/\./g, '_');

      const allowedUpdates = {
        name: updatedData.name,
        jobTitle: updatedData.jobTitle,
        updatedAt: new Date().toISOString()
      };

      if (updatedData.photoURL) {
        allowedUpdates.photoURL = updatedData.photoURL;
        allowedUpdates.foto_url = updatedData.photoURL;
        allowedUpdates.avatar_url = updatedData.photoURL;
      }

      if (updatedData.dealer_logo) {
        allowedUpdates.dealer_logo = updatedData.dealer_logo;
      }

      // Update Firebase (Legacy/Main sync)
      const userRef = doc(db, "users", userId);
      const dealerUserRef = doc(db, "Dealers", effectiveDealerId, "usuarios", userId);
      await setDoc(dealerUserRef, allowedUpdates, { merge: true });
      try { await setDoc(userRef, allowedUpdates, { merge: true }); } catch (e) { }

      // Update Supabase (New Identity Provider)
      const supaUpdates = {
        nombre: updatedData.name,
        rol: updatedData.jobTitle,
      };
      if (updatedData.photoURL) {
        supaUpdates.avatar_url = updatedData.photoURL;
      }
      await supabase.from('usuarios').update(supaUpdates).eq('correo', emailLower);

      // Password Reset
      if (updatedData.newPassword && updatedData.newPassword.length >= 6) {
        if (auth.currentUser) {
          try { await updatePassword(auth.currentUser, updatedData.newPassword); } catch (e) { }
        }

        const { error: supaErr } = await supabase.auth.updateUser({
          password: updatedData.newPassword
        });

        if (supaErr) {
          console.error("Supabase password error:", supaErr);
          showToast("Error actualizando la contraseña", "error");
          return;
        }
      }

      setUserProfile(prev => ({ ...prev, ...allowedUpdates }));
      showToast("Perfil actualizado");
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast("Error al actualizar perfil", "error");
    }
  };

  // ... (keep existing firebase connection useEffect)

  // ... (rest of functions)

  // handleLogin is now handled inside LoginView (Supabase auth)
  // onLoginSuccess is called by LoginView after successful auth
  const handleLoginSuccess = (supUser) => {
    setIsLoggedIn(true);
    setCurrentUserEmail(supUser.email);
    localStorage.setItem('lastUserEmail', supUser.email);
    setInitializing(false);
  };

  const handleDisconnectGhl = () => {
    requestConfirmation({
      title: 'Desconectar Plataforma',
      message: '¿Estás seguro de que deseas desconectar GoHighLevel? Perderás acceso a la generación de contratos y sincronización de inventario.',
      confirmText: 'Desconectar',
      isDestructive: true,
      onConfirm: async () => {
        try {
          let hasSupaError = false;
          let supaErrorMsg = "";

          if (userProfile?.supabaseDealerId) {
            const { error: supaErr } = await supabase
              .from('dealers')
              .update({
                ghl_access_token: null,
                location_id: null,
                ghl_location_id: null
              })
              .eq('id', userProfile.supabaseDealerId);

            if (supaErr) {
              console.warn("Supabase auth cleanup failed (Check RLS or Null constraints):", supaErr);
              hasSupaError = true;
              supaErrorMsg = supaErr.message || supaErr.code || "Error en Supabase";
              // We intentionally don't throw here to allow Firestore fallback to clear the local UI block
            }
          }

          if (userProfile?.dealerId) {
            const dealerRef = doc(db, "Dealers", userProfile.dealerId);
            await setDoc(dealerRef, { ghlLocationId: '' }, { merge: true });
          }

          setUserProfile(prev => ({ ...prev, ghlLocationId: '', location_id: '', ghl_access_token: '' }));

          if (hasSupaError) {
            showToast(`Desconectado localmente (Advertencia: ${supaErrorMsg})`, "warning");
          } else {
            showToast("Plataforma desconectada correctamente");
          }

        } catch (error) {
          console.error("Error crítico al desconectar GHL:", error);
          showToast(`Error al desconectar: ${error.message || 'Desconocido'}`, "error");
        }
      }
    });
  };

  const handleLogout = () => {
    requestConfirmation({
      message: '¿Estás seguro de que deseas salir del sistema?',
      confirmText: 'Salir',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error("Error signing out", error);
        }
        localStorage.removeItem('lastUserEmail');
        sessionStorage.setItem('manualLogout', 'true');
        setIsLoggedIn(false);
        setUserProfile(null);
        setCurrentUserEmail('');
        // Force redirect to clean URL without GHL parameters to prevent auto-login
        window.location.href = window.location.origin + window.location.pathname;
      }
    });
  };

  const fetchVehiclesFromSupabase = useCallback(async () => {
    try {
      let query = supabase.from('vehiculos').select('*').order('created_at', { ascending: false });

      // El RLS ya filtra auto-mágicamente por dealer_id si hay sesión activa,
      // pero incluimos filtro por si estamos en vista pública / GHL
      // Intentamos filtrar por el ID que tengamos disponible (UUID o el ID clásico)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const dealerUuid = userProfile?.supabaseDealerId || (uuidRegex.test(effectiveDealerId) ? effectiveDealerId : null);

      if (dealerUuid) {
        query = query.eq('dealer_id', dealerUuid);
      } else if (urlLocationId) {
        query = query.eq('ghl_location_id', urlLocationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let vehiclesData = (data || []).map(v => {
        const makeFromTitle = v.detalles?.make || v.titulo_vehiculo?.split(' ')[1] || 'N/A';
        const modelFromTitle = v.detalles?.model || v.titulo_vehiculo?.split(' ').slice(2).join(' ') || 'N/A';
        const yearFromTitle = v.detalles?.year || v.titulo_vehiculo?.split(' ')[0] || '';

        return {
          ...v,
          ...(v.detalles || {}),
          make: makeFromTitle,
          marca: makeFromTitle,
          model: modelFromTitle,
          modelo: modelFromTitle,
          year: yearFromTitle,

          price: parseFloat(v.precio || 0),
          status: v.deleted_at ? 'trash' : (v.estado === 'Vendido' ? 'sold' : (v.estado === 'Cotizado' ? 'quoted' : 'available')),
          images: v.fotos || [],
          image: (v.fotos && v.fotos.length > 0 ? v.fotos[0] : null),
          documents: v.documentos || [],

          exteriorColor: v.color,
          carfaxCondition: v.condicion_carfax,
          vin: v.chasis_vin,
          drivetrain: v.traccion,
          transmission: v.transmision,
          engine: v.motor,
          roof: v.techo,
          fuelType: v.combustible,
          keyType: v.llave,
          camera: v.camara,
          interiorMaterial: v.material_asientos,

          initial_payment: parseFloat(v.inicial || 0),
          mileage: parseFloat(v.millas || 0),
          seats: parseInt(v.cantidad_asientos || 0),

          powerTrunk: v.baul_electrico,
          sensors: v.sensores,
          appleCarplay: v.carplay,
          powerWindows: v.vidrios_electricos,

          ghlLocationId: v.ghl_location_id,
          createdAt: v.created_at,
          updatedAt: v.created_at
        };
      });

      // Filtro estricto local de seguridad extra
      if (urlLocationId) {
        vehiclesData = vehiclesData.filter(v => v.ghl_location_id === urlLocationId || v.ghlLocationId === urlLocationId);
      }
      setInventory(vehiclesData);

    } catch (err) {
      console.error("❌ Error fetch Supabase Vehiculos:", err);
    }
  }, [effectiveDealerId, userProfile, urlLocationId]);

  // 2. DATA LISTENERS (REACTIVE TO CONTEXT)
  useEffect(() => {
    if (!effectiveDealerId) {
      console.log("⏳ Esperando context/dealerId para iniciar listeners...");
      return;
    }

    console.log("📡 [LISTENERS] Iniciando para Dealer:", effectiveDealerId, "(GHL Mode:", !!urlLocationId, ")");

    // 1. Listen to Vehicles (Migrado a Supabase ✅)
    fetchVehiclesFromSupabase();


    // Supabase Realtime Subscription para vehiculos
    const vehicleSubscription = supabase
      .channel(`vehiculos_dealer_${effectiveDealerId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'vehiculos',
        filter: `dealer_id=eq.${effectiveDealerId}`
      }, (payload) => {
        fetchVehiclesFromSupabase();
      })
      .subscribe();

    // 2. Listen to Documents
    const newConRef = collection(db, "Dealers", effectiveDealerId, "documentos", "contratos", "items");
    const unsubscribeNewContracts = onSnapshot(newConRef, (snapshot) => {
      setNewContracts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const newQuoRef = collection(db, "Dealers", effectiveDealerId, "documentos", "cotizaciones", "items");
    const unsubscribeNewQuotes = onSnapshot(newQuoRef, (snapshot) => {
      setNewQuotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Legacy: Listen to top-level collections
    const legacyConRef = collection(db, "Dealers", effectiveDealerId, "contracts");
    const unsubscribeLegacyContracts = onSnapshot(legacyConRef, (snapshot) => {
      setLegacyContracts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const legacyQuoRef = collection(db, "Dealers", effectiveDealerId, "quotes");
    const unsubscribeLegacyQuotes = onSnapshot(legacyQuoRef, (snapshot) => {
      setLegacyQuotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 4. Backward Compatibility for 'documentos' root
    const docRef = collection(db, "Dealers", effectiveDealerId, "documentos");
    const unsubscribeLegacyDocs = onSnapshot(docRef, (snapshot) => {
      setLegacyDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 5. Listen to Templates
    const tempRef = collection(db, "Dealers", effectiveDealerId, "documentos", "plantillas", "items");
    const unsubscribeTemplates = onSnapshot(tempRef, (snapshot) => {
      setTemplates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      console.log("🛑 Limpiando listeners de Dealer:", effectiveDealerId);
      supabase.removeChannel(vehicleSubscription);
      unsubscribeNewContracts();
      unsubscribeNewQuotes();
      unsubscribeLegacyContracts();
      unsubscribeLegacyQuotes();
      unsubscribeLegacyDocs();
      unsubscribeTemplates();
    };
  }, [effectiveDealerId, urlLocationId]); // Re-activar si cambia el contexto

  // --- SCRIPT DE REPARACIÓN ---
  useEffect(() => {
    if (!effectiveDealerId || !urlLocationId) return;

    const repairUntaggedVehicles = async () => {
      try {
        const vehRef = collection(db, "Dealers", effectiveDealerId, "vehiculos");
        const snapshot = await getDocs(vehRef);

        const batchUpdates = [];
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          if (!data.ghlLocationId) {
            console.log(`🔧 Reparando vehículo ${docSnap.id} con ghlLocationId: ${urlLocationId}`);
            batchUpdates.push(updateDoc(docSnap.ref, { ghlLocationId: urlLocationId }));
          }
        });

        if (batchUpdates.length > 0) {
          await Promise.all(batchUpdates);
          console.log(`✅ Reparados ${batchUpdates.length} vehículos.`);
        }
      } catch (err) {
        console.warn("⚠️ Falló script de reparación (Permisos?):", err);
      }
    };

    repairUntaggedVehicles();
  }, [effectiveDealerId, urlLocationId]);

  // Derived merged data
  const contracts = useMemo(() => {
    const all = [
      ...legacyContracts,
      ...legacyDocs.filter(d => d.type === 'contract' || d.id.startsWith('Contrato')),
      ...newContracts
    ];
    return all.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [legacyContracts, legacyDocs, newContracts]);

  const quotes = useMemo(() => {
    const all = [
      ...legacyQuotes,
      ...legacyDocs.filter(d => d.type === 'quote' || d.id.startsWith('Cotizacion')),
      ...newQuotes
    ];
    return all.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [legacyQuotes, legacyDocs, newQuotes]);


  // 3. GUARDAR (Crear o Editar en Supabase)
  const handleSaveVehicle = async (vehicleData) => {
    if (!effectiveDealerId) {
      console.error("No effectiveDealerId available");
      showToast("Error: No se encontró el ID del Dealer. Reintenta loguear.", "error");
      return;
    }
    const existingId = vehicleData.id;
    try {
      const titulo = vehicleData.titulo_vehiculo ||
        `${vehicleData.year || ''} ${vehicleData.make || vehicleData.marca || ''} ${vehicleData.model || vehicleData.modelo || ''}`.trim() || 'Vehículo Sin Título';
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const dealerUuid = userProfile?.supabaseDealerId || (uuidRegex.test(effectiveDealerId) ? effectiveDealerId : null);

      if (!dealerUuid) {
        console.error("🚨 DEBUG DEALER UUID INVALIDO 🚨", {
          userProfile,
          effectiveDealerId,
          dealerUuid,
          profileDataSupabaseDealerId: userProfile?.supabaseDealerId,
          isEffectiveIdValid: uuidRegex.test(effectiveDealerId)
        });
        throw new Error("UUID de Dealer inválido. No se puede guardar en Supabase.");
      }

      const dataToSave = {
        dealer_id: dealerUuid,
        titulo_vehiculo: titulo.toUpperCase(),
        estado: (vehicleData.status === 'sold' || vehicleData.estado === 'Vendido') ? 'Vendido' : 'Disponible',

        color: vehicleData.exteriorColor || vehicleData.color || null,
        condicion_carfax: vehicleData.carfaxCondition || vehicleData.condicion_carfax || null,
        chasis_vin: vehicleData.vin || vehicleData.chasis_vin || null,
        traccion: vehicleData.drivetrain || vehicleData.traccion || null,
        transmision: vehicleData.transmission || vehicleData.transmision || null,
        motor: vehicleData.engine || vehicleData.motor || null,
        techo: vehicleData.roof || vehicleData.techo || null,
        combustible: vehicleData.fuelType || vehicleData.combustible || null,
        llave: vehicleData.keyType || vehicleData.llave || null,
        camara: vehicleData.camera || vehicleData.camara || null,
        material_asientos: vehicleData.interiorMaterial || vehicleData.material_asientos || null,

        precio: parseFloat(vehicleData.price_unified || vehicleData.precio || vehicleData.price) || 0,
        inicial: parseFloat(vehicleData.initial_unified || vehicleData.inicial || vehicleData.initial_payment) || 0,
        millas: parseFloat(vehicleData.mileage || vehicleData.millas) || 0,
        cantidad_asientos: parseInt(vehicleData.seats || vehicleData.cantidad_asientos) || null,

        baul_electrico: !!(vehicleData.powerTrunk || vehicleData.baul_electrico),
        sensores: !!(vehicleData.sensors || vehicleData.sensores),
        carplay: !!(vehicleData.appleCarplay || vehicleData.carplay),
        vidrios_electricos: !!(vehicleData.powerWindows || vehicleData.vidrios_electricos),

        fotos: vehicleData.images || vehicleData.fotos || (vehicleData.image ? [vehicleData.image] : []),
        documentos: vehicleData.documents || vehicleData.documentos || []
      };

      if (vehicleData.status === 'sold' && !existingId) {
        dataToSave.fecha_venta = new Date().toISOString();
      }

      if (existingId && existingId.length > 20) {
        // En Supabase el ID debe existir (escription UUID o texto compatible). Update.
        const { error } = await supabase.from('vehiculos').update(dataToSave).eq('id', existingId);
        if (error) throw error;
        showToast("Vehículo actualizado con éxito");
      } else {
        // Create new
        dataToSave.created_at = new Date().toISOString();

        const { error } = await supabase.from('vehiculos').insert([dataToSave]);
        if (error) throw error;
        showToast("Vehículo guardado con éxito");
      }

      // Refresh inventory after save
      fetchVehiclesFromSupabase();
    } catch (error) {
      console.error("Error al guardar en Supabase:", error);
      showToast(`Error: ${error?.message || 'Error al guardar en el Dealer'}`, "error");
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!userProfile?.dealerId) return;
    try {
      const { error } = await supabase.from('vehiculos').update({
        deleted_at: new Date().toISOString()
      }).eq('id', id);
      if (error) throw error;
      showToast("Vehículo movido a la papelera");
    } catch (error) {
      console.error(error);
      showToast("Error al mover a papelera", "error");
    }
  };

  const handleRestoreVehicle = async (id) => {
    if (!userProfile?.dealerId) return;
    try {
      const { error } = await supabase.from('vehiculos').update({
        deleted_at: null
      }).eq('id', id);
      if (error) throw error;
      showToast("Vehículo restaurado");
    } catch (e) {
      showToast("Error al restaurar", "error");
    }
  };

  const handlePermanentDelete = (id, force = false) => {
    if (!userProfile?.dealerId) return;

    const doDelete = async () => {
      try {
        const { error } = await supabase.from('vehiculos').delete().eq('id', id);
        if (error) throw error;
        if (!force) showToast("Eliminado permanentemente");
      } catch (error) {
        showToast("Error al eliminar", "error");
      }
    };

    if (force) return doDelete();

    requestConfirmation({
      title: 'Eliminar Permanentemente',
      message: '¿ESTÁS SEGURO? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar para Siempre',
      isDestructive: true,
      onConfirm: doDelete
    });
  };

  const handleRestoreDocument = async (item) => {
    if (!effectiveDealerId) return;
    try {
      let ref;
      // Determinar la referencia correcta basada en el ID y la lógica de colecciones
      if (item.id.startsWith('Contrato')) {
        ref = doc(db, "Dealers", effectiveDealerId, "documentos", "contratos", "items", item.id);
      } else if (item.id.startsWith('Cotizacion')) {
        ref = doc(db, "Dealers", effectiveDealerId, "documentos", "cotizaciones", "items", item.id);
      } else {
        // Legacy fallback
        const isContract = item.type === 'contract' || (item.client && !item.name);
        ref = doc(db, "Dealers", effectiveDealerId, isContract ? "contracts" : "quotes", item.id);
      }

      await updateDoc(ref, { status: 'active' });
      showToast("Documento restaurado");
    } catch (e) {
      console.error(e);
      showToast("Error al restaurar documento", "error");
    }
  };

  const handlePermanentDeleteDocument = (item, force = false) => {
    if (!effectiveDealerId) return;

    const doDelete = async () => {
      try {
        let ref;
        if (item.id.startsWith('Contrato')) {
          ref = doc(db, "Dealers", effectiveDealerId, "documentos", "contratos", "items", item.id);
        } else if (item.id.startsWith('Cotizacion')) {
          ref = doc(db, "Dealers", effectiveDealerId, "documentos", "cotizaciones", "items", item.id);
        } else {
          const isContract = item.type === 'contract' || (item.client && !item.name);
          ref = doc(db, "Dealers", effectiveDealerId, isContract ? "contracts" : "quotes", item.id);
        }

        await deleteDoc(ref);
        // También intentar borrar de la colección raíz 'documentos' por si acaso es legacy
        try { await deleteDoc(doc(db, "Dealers", effectiveDealerId, "documentos", item.id)); } catch (e) { }

        if (!force) showToast("Documento eliminado permanentemente");
      } catch (e) {
        console.error(e);
        showToast("Error al eliminar documento", "error");
      }
    };

    if (force) return doDelete();

    requestConfirmation({
      title: '¿Eliminar Documento?',
      message: 'Esta acción es irreversible.',
      confirmText: 'Eliminar Definitivamente',
      isDestructive: true,
      onConfirm: doDelete
    });
  };

  const handleEmptyTrash = () => {
    if (!userProfile?.dealerId) return;
    requestConfirmation({
      title: 'Vaciar Papelera',
      message: '¿Seguro que deseas eliminar todos los vehículos de la papelera? Esta acción es permanente.',
      confirmText: 'Vaciar Todo',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const trashItems = inventory.filter(i => i.status === 'trash');
          if (trashItems.length > 0) {
            const idsToDelete = trashItems.map(i => i.id);
            const { error } = await supabase.from('vehiculos').delete().in('id', idsToDelete);
            if (error) throw error;
          }
          showToast("Papelera vaciada");
        } catch (e) {
          showToast("Error al vaciar papelera", "error");
        }
      }
    });
  };

  // Funciones locales (Contratos, etc.)
  const handleQuoteSent = async (quoteData) => {
    if (!userProfile?.dealerId) return;
    try {
      // Limpiar undefined antes de enviar a Firestore
      const cleanQuoteData = Object.fromEntries(
        Object.entries(quoteData).filter(([_, v]) => v !== undefined)
      );

      const vId = cleanQuoteData.vehicleId || selectedVehicle?.id;
      const vName = cleanQuoteData.vehicle || (selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : 'Vehículo Desconocido');

      // GENERAR ID DINÁMICO: Cotizacion_Cliente_Marca_Modelo_Ultimos4Chasis
      // 1. Limpieza de datos
      const clientName = `${quoteData.name || ''} ${quoteData.lastname || ''}`.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');

      // Intentar obtener datos del vehículo del inventario si es posible para tener Marca/Modelo limpios
      let make = 'MARCA';
      let model = 'MODELO';
      let last4Vin = '0000';

      if (vId) {
        // Si tenemos ID, intentamos buscarlo en el inventario activo (si está cargado)
        // O inferirlo del nombre string si no hay otra opción
        const vehicleObj = activeInventory.find(v => v.id === vId);
        if (vehicleObj) {
          make = (vehicleObj.make || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          model = (vehicleObj.model || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          last4Vin = (vehicleObj.vin || '0000').slice(-4);
        } else {
          // Fallback parsing from "make model year" string if object not found
          const parts = vName.split(' ');
          if (parts.length >= 2) {
            make = parts[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
            model = parts[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
          }
        }
      }

      const customId = `Cotizacion_${clientName}_${make}_${model}_${last4Vin}`;

      const newQuote = {
        ...cleanQuoteData,
        id: customId, // Guardar el ID también dentro del documento
        vehicleId: vId,
        vehicle: vName,
        type: 'quote', // Identificador de tipo para nueva colección unificada
        createdAt: new Date().toISOString()
      };

      // GUARDAR EN SUBCOLECCIÓN 'documentos/cotizaciones'
      await setDoc(doc(db, "Dealers", effectiveDealerId, "documentos", "cotizaciones", "items", customId), newQuote);

      if (vId) {
        await supabase.from('vehiculos')
          .update({ estado: 'Cotizado', updated_at: new Date().toISOString() })
          .eq('id', vId);
      }
      requestConfirmation({
        title: 'Cotización Enviada',
        message: '¡Cotización enviada a GHL y guardada!',
        onConfirm: () => { },
        confirmText: 'Cerrar',
        cancelText: null
      });
    } catch (error) {
      console.error("Error al guardar cotización:", error);
      showToast("Error al procesar la cotización", "error");
    }
  };

  const handleGenerateMultiContract = async (contractsArray) => {
    console.log("handleGenerateMultiContract called with:", contractsArray);
    if (!userProfile?.dealerId) {
      console.error("MultiGen: Missing dealerId", userProfile);
      showToast("Error critico: No hay perfil de usuario cargado", "error");
      return;
    }
    if (!Array.isArray(contractsArray)) {
      console.error("MultiGen: Input is not an array", contractsArray);
      return;
    }

    try {
      let generatedCount = 0;
      let firstVehicleId = null;

      for (const contractData of contractsArray) {
        // Reuse the single contract logic structure
        // Clean data
        const cleanData = Object.fromEntries(
          Object.entries(contractData).filter(([_, v]) => v !== undefined)
        );
        const { id, category, ...data } = cleanData;

        // GENERAR ID DINÁMICO
        const clientName = (data.client || 'Cliente').toUpperCase().replace(/[^A-Z0-9]/g, '_');
        let make = 'MARCA';
        let model = 'MODELO';
        let last4Vin = '0000';

        if (contractData.vehicleId) {
          firstVehicleId = contractData.vehicleId;
          const vehicleObj = activeInventory.find(v => v.id === contractData.vehicleId);
          if (vehicleObj) {
            make = (vehicleObj.make || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            model = (vehicleObj.model || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            last4Vin = (vehicleObj.vin || '0000').slice(-4);
          } else if (data.vehicle) {
            const parts = data.vehicle.split(' ');
            if (parts.length >= 2) {
              make = parts[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
              model = parts[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
            }
          }
        }

        const docType = category === 'quote' ? 'Cotizacion' : 'Contrato';
        const docCollection = category === 'quote' ? 'cotizaciones' : 'contratos';

        // Unique ID including Template Name to avoid collision if multiple docs for same car/client
        const templateTag = (data.template || 'Doc').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5);
        const customId = `${docType}_${clientName}_${make}_${model}_${last4Vin}_${templateTag}_${Date.now().toString().slice(-4)}`;

        const newDoc = {
          ...data,
          id: customId,
          type: category || 'contract',
          category: category || 'contract',
          createdAt: new Date().toISOString()
        };

        // Guardar
        await setDoc(doc(db, "Dealers", effectiveDealerId, "documentos", docCollection, "items", customId), newDoc);
        generatedCount++;
      }

      // Update vehicle status ONLY if at least one contract was generated (not just quotes)
      // If mixed, mark as sold? Or let user decide? For now, if any contract, mark sold.
      const hasContract = contractsArray.some(c => c.category === 'contract' || !c.category);
      if (firstVehicleId) {
        const newEstado = hasContract ? 'Vendido' : 'Cotizado';
        await supabase.from('vehiculos')
          .update({ estado: newEstado, updated_at: new Date().toISOString() })
          .eq('id', firstVehicleId);
      }

      showToast(`${generatedCount} documentos generados con éxito`);
      setIsContractModalOpen(false);

    } catch (error) {
      console.error("Error multi-gen:", error);
      showToast("Error generando documentos: " + error.message, "error");
    }
  };

  const handleGenerateContract = async (contractDataInput) => {
    if (!userProfile?.dealerId) return;

    // Support Input Array for multi-gen
    if (Array.isArray(contractDataInput)) {
      return handleGenerateMultiContract(contractDataInput);
    }

    const contractData = contractDataInput; // Single object case

    try {
      // Limpiar undefined antes de enviar a Firestore
      const cleanData = Object.fromEntries(
        Object.entries(contractData).filter(([_, v]) => v !== undefined)
      );

      const { id, ...data } = cleanData;

      // GENERAR ID DINÁMICO: Contrato_Cliente_Marca_Modelo_Ultimos4Chasis
      const clientName = (data.client || 'Cliente').toUpperCase().replace(/[^A-Z0-9]/g, '_');

      // Parsear vehículo string "Marca Modelo Año" o similar
      let make = 'MARCA';
      let model = 'MODELO';
      let last4Vin = '0000'; // Contrato data doesn't explicitly have VIN often, might need lookup or defaults

      // Si tenemos vehicleId, buscamos en inventario para más precisión
      if (contractData.vehicleId) {
        const vehicleObj = activeInventory.find(v => v.id === contractData.vehicleId);
        if (vehicleObj) {
          make = (vehicleObj.make || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          model = (vehicleObj.model || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
          last4Vin = (vehicleObj.vin || '0000').slice(-4);
        } else if (data.vehicle) {
          const parts = data.vehicle.split(' ');
          if (parts.length >= 2) {
            make = parts[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
            model = parts[1].toUpperCase().replace(/[^A-Z0-9]/g, '');
          }
        }
      }

      const customId = `Contrato_${clientName}_${make}_${model}_${last4Vin}`;

      if (id) {
        // En caso de edición, mantenemos el ID original (o decidimos migrarlo, pero mejor mantener por simplicidad si ya existe)
        // Pero si es nuevo sistema, asumimos que 'id' vendría de una edición anterior.
        // Si queremos forzar el nuevo formato habría que borrar y crear, pero updateDoc es más seguro para ediciones.
        const contractRef = doc(db, "Dealers", effectiveDealerId, "documentos", "contratos", "items", id);
        await setDoc(contractRef, {
          ...data,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        showToast("Contrato actualizado");
      } else {
        const newContract = {
          ...data,
          id: customId,
          type: 'contract', // Identificador de tipo
          createdAt: new Date().toISOString()
        };

        // GUARDAR EN SUBCOLECCIÓN 'documentos/contratos'
        await setDoc(doc(db, "Dealers", effectiveDealerId, "documentos", "contratos", "items", customId), newContract);

        if (contractData.vehicleId) {
          await supabase.from('vehiculos')
            .update({ estado: 'Vendido', updated_at: new Date().toISOString() })
            .eq('id', contractData.vehicleId);
        }
        showToast("Contrato generado");
      }
      showToast("Contrato generado");
    } catch (error) {
      console.error(error);
      showToast("Error: " + error.message, "error");
    }
  };


  const handleDeleteContract = async (id) => {
    if (!effectiveDealerId) return; // Usar effectiveDealerId
    try {
      if (id.startsWith('Contrato')) {
        await updateDoc(doc(db, "Dealers", effectiveDealerId, "documentos", "contratos", "items", id), { status: 'deleted' });
      } else {
        await updateDoc(doc(db, "Dealers", effectiveDealerId, "contracts", id), { status: 'deleted' });
      }
      showToast("Contrato movido a papelera");
    } catch (error) {
      console.error(error);
      showToast("Error al eliminar: " + error.message, "error");
    }
  };

  const handleDeleteQuote = async (id) => {
    if (!effectiveDealerId) return;
    try {
      if (id.startsWith('Cotizacion')) {
        await updateDoc(doc(db, "Dealers", effectiveDealerId, "documentos", "cotizaciones", "items", id), { status: 'deleted' });
      } else {
        await updateDoc(doc(db, "Dealers", effectiveDealerId, "quotes", id), { status: 'deleted' });
      }
      showToast("Cotización movida a papelera");
    } catch (error) {
      console.error(error);
      showToast("Error al eliminar: " + error.message, "error");
    }
  };

  const handleSaveTemplate = async (templateData) => {
    if (!effectiveDealerId) return;
    try {
      const { id, ...data } = templateData;
      // Normalizar nombre para el ID o usar timestamp
      const nameSlug = (data.name || 'Plantilla').toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const templateId = id || `Plantilla_${nameSlug}_${Date.now()}`;

      const tempRef = doc(db, "Dealers", effectiveDealerId, "documentos", "plantillas", "items", templateId);

      await setDoc(tempRef, {
        ...data,
        id: templateId,
        updatedAt: new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString()
      }, { merge: true });

      showToast(id ? "Plantilla actualizada" : "Plantilla creada");
    } catch (error) {
      console.error("Error saving template:", error);
      showToast("Error al guardar la plantilla", "error");
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!effectiveDealerId) return;
    try {
      await deleteDoc(doc(db, "Dealers", effectiveDealerId, "documentos", "plantillas", "items", id));
      showToast("Plantilla eliminada");
    } catch (error) {
      showToast("Error al eliminar: " + error.message, "error");
    }
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleNavigate = (tab, filter = 'available') => {
    setSelectedVehicle(null);
    setActiveTab(tab);
    if (tab === 'inventory' && filter) setInventoryTab(filter);
  };

  const renderContent = () => {
    if (selectedVehicle) {
      const associatedContract = contracts.find(c => c.vehicleId === selectedVehicle.id);
      return (
        <VehicleEditView
          vehicle={selectedVehicle}
          contract={associatedContract}
          readOnly={isStoreRoute}
          onBack={() => setSelectedVehicle(null)}
          onSave={async (data) => {
            await handleSaveVehicle(data);
            setSelectedVehicle(null);
          }}
          userProfile={shadowProfile}
        />
      );
    }
    switch (activeTab) {
      case 'settings': return <SettingsView userProfile={shadowProfile} onLogout={handleLogout} onUpdateProfile={handleUpdateProfile} showToast={showToast} onDisconnectGhl={handleDisconnectGhl} />;
      case 'dashboard': return <DashboardView inventory={activeInventory} contracts={contracts || []} onNavigate={handleNavigate} userProfile={shadowProfile} />;
      case 'inventory': return <InventoryView inventory={activeInventory} quotes={quotes || []} templates={templates} activeTab={inventoryTab} setActiveTab={setInventoryTab} showToast={showToast} onGenerateContract={handleGenerateContract} onGenerateQuote={handleQuoteSent} onVehicleSelect={handleVehicleSelect} onSave={handleSaveVehicle} onDelete={handleDeleteVehicle} userProfile={shadowProfile} searchTerm={globalSearch} requestConfirmation={requestConfirmation} />;
      case 'contracts': return <ContractsView contracts={contracts || []} quotes={quotes || []} templates={templates} inventory={activeInventory}
        onGenerateContract={handleGenerateContract}
        onDeleteContract={handleDeleteContract} onGenerateQuote={handleQuoteSent} onDeleteQuote={handleDeleteQuote} onSaveTemplate={handleSaveTemplate} onDeleteTemplate={handleDeleteTemplate} setActiveTab={setActiveTab} userProfile={shadowProfile} searchTerm={globalSearch} requestConfirmation={requestConfirmation} showToast={showToast} />;
      case 'trash': return <TrashView trash={trashInventory} contracts={contracts} quotes={quotes} onRestore={handleRestoreVehicle} onPermanentDelete={handlePermanentDelete} onRestoreDocument={handleRestoreDocument} onPermanentDeleteDocument={handlePermanentDeleteDocument} onEmptyTrash={handleEmptyTrash} showToast={showToast} />;
      default: return <DashboardView inventory={activeInventory} contracts={contracts} onNavigate={handleNavigate} userProfile={shadowProfile} />;
    }
  };

  // --- RENDER CONDICIONAL DE PANTALLA COMPLETA ---
  // Si no hay perfil pero tenemos contexto de URL, NO bloqueamos (Iframe safe)
  if (initializing || (isLoggedIn && !shadowProfile && currentUserEmail)) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center animate-pulse">
          <AppLogo className="w-16 h-16 mb-4" size={64} />
          <p className="text-slate-400 font-medium">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  // GHL SSO: autenticando silenciosamente con parámetros de URL
  if (ghlSSOLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#060608',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}>
        <img src="/logo.png" alt="CarBot"
          style={{ width: 120, marginBottom: 32, mixBlendMode: 'multiply', filter: 'drop-shadow(0 4px 24px rgba(220,38,38,0.5))' }} />
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: '3px solid rgba(220,38,38,0.2)',
          borderTopColor: '#DC2626',
          animation: 'spin 0.8s linear infinite',
          marginBottom: 24,
        }} />
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500, letterSpacing: '0.05em' }}>
          Autenticando de forma segura...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Sin parámetros GHL y sin sesión → mostrar Login manual
  if (!isLoggedIn && !shadowProfile) {
    return (
      <>
        <LoginView onLoginSuccess={handleLoginSuccess} />
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </>
    );
  }

  return (
    <>
      <AppLayout
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        onLogout={handleLogout}
        userProfile={shadowProfile}
        searchTerm={globalSearch}
        onSearchChange={setGlobalSearch}
      >
        {renderContent()}
      </AppLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* GLOBAL CONFIRMATION MODAL */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText={confirmationModal.confirmText}
        isDestructive={confirmationModal.isDestructive}
      />
    </>
  );
}


