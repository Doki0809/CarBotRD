import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
// import imageCompression from 'browser-image-compression';
import { db, auth, storage } from './firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  signOut,
  onAuthStateChanged,
  updatePassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
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
// import ContractTemplateEditor from './components/dashboard/ContractTemplateEditor';
import ContractTemplateEditor from './components/dashboard/PlantillaEditor';

import {
  LayoutDashboard, Car, FileText, LogOut, Plus, Search, Edit, Trash2,
  DollarSign, CheckCircle, X, Menu, User, Send, Loader2, FilePlus,
  CreditCard, FileSignature, Files, Fuel, Settings, IdCard, Trash, Undo, Printer, Eye, Download,
  PlusCircle, Box, ArrowUpRight, Building2, Fingerprint, Lock, EyeOff, Share2, Check, ArrowRight, Key, Copy,
  AlertTriangle, TrendingUp, History, Bell, Calendar, Briefcase, Inbox, Headset, Sparkles, Camera,
  ChevronLeft, ChevronRight, Save, ChevronDown, MoreVertical, FileCode, Truck
} from 'lucide-react';
import VehicleEditView from './VehicleEditView';

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
    primary: 'bg-red-600 text-white hover:bg-red-700 shadow-xl shadow-red-600/20 hover:shadow-red-600/30',
    secondary: 'bg-white text-slate-700 border-2 border-slate-100 hover:bg-slate-50 shadow-md',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border-2 border-red-100',
  };

  const hasManualBg = className.includes('bg-');
  const hasManualText = className.includes('text-');

  const baseClasses = `px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 active: scale-95`;
  const variantClasses = variants[variant] || variants.primary;

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${!hasManualBg && !hasManualText ? variantClasses : ''} ${className} `}
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
    <div className={`${hasBg ? '' : 'bg-white'} rounded-[24px] shadow-[0_8px_30px_rgb(0, 0, 0, 0.04)] border border-slate-100 overflow-hidden transition-all duration-300 ${className} `}>
      <div className={noPadding ? '' : 'p-6'}>{children}</div>
    </div>
  );
};

const Badge = ({ status }) => {
  const styles = {
    available: "bg-emerald-50 text-emerald-700 border-emerald-100 ring-1 ring-emerald-600/10",
    quoted: "bg-amber-50 text-amber-700 border-amber-100 ring-1 ring-amber-600/10",
    sold: "bg-slate-100 text-slate-600 border-slate-200 ring-1 ring-slate-600/10",
    pending: "bg-red-50 text-red-700 border-red-100 ring-1 ring-red-600/10",
    signed: "bg-green-50 text-green-700 border-green-100 ring-1 ring-green-600/10",
  };
  const labels = { available: "Disponible", quoted: "Cotizado", sold: "Vendido", pending: "Pendiente Firma", signed: "Firmado" };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.sold} `}>
      {labels[status] || status}
    </span>
  );
};

const Input = ({ label, className = "", type = "text", error, ...props }) => (
  <div className="mb-4 group">
    {label && (
      <label className={`block text-[10px] font-black uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors ${error ? 'text-red-600' : 'text-slate-400 group-focus-within:text-red-600'}`}>
        {label}
      </label>
    )}
    <input
      type={type}
      className={`w-full px-4 py-3 bg-slate-50 border-2 rounded-2xl text-slate-900 font-bold text-sm focus:outline-none focus:bg-white focus:ring-4 transition-all outline-none ${error ? 'border-red-500 focus:border-red-600 focus:ring-red-500/20 bg-red-50/50' : 'border-slate-50 focus:border-red-500/20 focus:ring-red-500/5'} ${className} `}
      {...props}
    />
  </div>
);

const Select = ({ label, options = [], name, defaultValue, value, onChange, disabled, ...props }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value !== undefined ? value : (defaultValue !== undefined ? defaultValue : (options[0]?.value || options[0])));
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
  const displayLabel = currentOption ? (typeof currentOption === 'object' ? currentOption.label : currentOption) : (selectedValue || "-");

  return (
    <div className="mb-4 group relative" ref={dropdownRef}>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-600">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl text-slate-900 font-bold text-sm transition-all outline-none ${isOpen ? 'bg-white border-red-500/20 ring-4 ring-red-500/5' : 'hover:bg-slate-100'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} `}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-red-500' : ''} `} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-2 p-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[110] animate-in fade-in zoom-in-95 duration-200">
          <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col gap-1">
            {options.map((opt, i) => {
              const isObj = typeof opt === 'object' && opt !== null;
              const val = isObj ? opt.value : opt;
              const labelText = isObj ? opt.label : opt;
              const isActive = selectedValue === val;

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelect(val)}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive
                    ? 'bg-red-50 text-red-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-red-500'
                    } `}
                >
                  {labelText}
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
    <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-xl shadow-2xl transform transition-all duration-500 animate -in slide -in -from-top-5 fade -in ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'} `}>
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
      setPhotos([]);
      setStatus('available');
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
    if (currency === 'USD') {
      data.price = priceValue;
      data.price_dop = 0;
    } else {
      data.price_dop = priceValue;
      data.price = 0;
    }
    delete data.price_unified;

    // --- INICIAL ---
    const initialValue = Number(prices.initial);
    data.downPaymentCurrency = downPaymentCurrency;
    if (downPaymentCurrency === 'USD') {
      data.initial_payment = initialValue;
      data.initial_payment_dop = 0;
    } else {
      data.initial_payment_dop = initialValue;
      data.initial_payment = 0;
    }
    data.currency = currency;
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

        const folderName = `${year} ${make} ${model} ${color} ${last4Vin} `.trim();
        const baseStoragePath = `dealer - ${cleanDealerName} /Marcas/${folderName} `;

        for (let i = 0; i < filesToUpload.length; i++) {
          const item = filesToUpload[i];
          try {
            const cleanName = (item.file.name || `image_${i}.jpg`).replace(/[^a-zA-Z0-9.]/g, '_').toLowerCase();
            const storagePath = `${baseStoragePath}/${Date.now()}_${cleanName}`;
            const storageRef = ref(storage, storagePath);
            const snapshot = await uploadBytes(storageRef, item.file);
            const downloadUrl = await getDownloadURL(snapshot.ref);
            if (downloadUrl) uploadedUrls.push(downloadUrl);
          } catch (err) {
            console.error(err);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-md transition-opacity duration-300">
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
              <span className="opacity-75 font-normal ml-1 normal-case">Cambia el estado a "Disponible" o "Cotizado" para editar los detalles.</span>
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
                <Input
                  name="make"
                  label="Marca"
                  defaultValue={initialData?.make}
                  placeholder="Ej. Toyota"
                  required
                  disabled={isLocked}
                  onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                />
                <Input
                  name="model"
                  label="Modelo"
                  defaultValue={initialData?.model}
                  placeholder="Ej. Camry"
                  required
                  disabled={isLocked}
                  onInput={(e) => { e.target.value = e.target.value.toUpperCase(); }}
                />
                {/* AÑO - small */}
                <Input name="year" label="Año" type="number" defaultValue={initialData?.year} placeholder="2026" required disabled={isLocked} />

                <Input name="edition" label="Edición" defaultValue={initialData?.edition} placeholder="Ej. XSE" disabled={isLocked} />
                <Input name="color" label="Color" defaultValue={initialData?.color} placeholder="Ej. Blanco Perla" required disabled={isLocked} />

                {/* MILLAJE CON TOGGLE INTEGRADO */}
                <div className="flex flex-col mb-4 group text-left">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-600">Millaje</label>
                  <div className={`flex shadow-sm rounded-xl overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 transition-all ${isLocked ? 'bg-slate-50' : 'bg-white'}`}>
                    <input
                      name="mileage"
                      type="number"
                      defaultValue={initialData?.mileage}
                      className="w-full min-w-0 px-3 py-2.5 bg-transparent focus:outline-none placeholder:text-slate-300 text-slate-700 font-bold text-sm"
                      placeholder="0"
                      disabled={isLocked}
                    />
                    <div className="bg-slate-100 flex p-1 items-center border-l border-slate-200 shrink-0">
                      <div className="flex bg-slate-200/50 p-1 rounded-lg">
                        {['KM', 'MI'].map((unit) => (
                          <button
                            key={unit}
                            type="button"
                            disabled={isLocked}
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

                <div className="md:col-span-2">
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
                <div className="md:col-span-1">
                  <Input
                    name="license_plate"
                    label="Placa"
                    defaultValue={initialData?.license_plate}
                    className="font-mono uppercase tracking-wider"
                    placeholder="A000000"
                    disabled={isLocked}
                    onInput={(e) => {
                      e.target.value = e.target.value.toUpperCase();
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
                <Select name="condition" label="Condición" defaultValue={initialData?.condition || ''} options={['Usado', 'Recién Importado', 'Nuevo', 'Certificado']} disabled={isLocked} />
                <Select name="clean_carfax" label="Estado Carfax" defaultValue={initialData?.clean_carfax || ''} options={['Clean Carfax', '-']} disabled={isLocked} />
                <Select name="type" label="Tipo de Vehículo" defaultValue={initialData?.type || ''} options={['Automóvil', 'Jeepeta', 'Camioneta', 'Camión', 'Autobús', 'Moto']} disabled={isLocked} />
                <Select name="transmission" label="Transmisión" defaultValue={initialData?.transmission || ''} options={['Automática', 'Manual', 'CVT', 'Tiptronic', 'DSG']} disabled={isLocked} />

                <Select name="fuel" label="Combustible" defaultValue={initialData?.fuel || ''} options={['Gasolina', 'Diesel', 'Híbrido', 'Eléctrico', 'GLP']} disabled={isLocked} />
                <Select name="traction" label="Tracción" defaultValue={initialData?.traction || ''} options={['FWD', 'RWD', 'AWD', '4x4']} disabled={isLocked} />
                <Select name="engine_type" label="Aspiración/Tipo" defaultValue={initialData?.engine_type || ''} options={['Normal', 'Turbo', 'Supercharged', 'Híbrido', 'Eléctrico']} disabled={isLocked} />

                <Input name="engine_cyl" label="Cilindros" defaultValue={initialData?.engine_cyl} placeholder="4 Cil" disabled={isLocked} />
                <Input name="engine_cc" label="Cilindrada" defaultValue={initialData?.engine_cc} placeholder="2.0L" disabled={isLocked} />
                <Select name="carplay" label="CarPlay / Android" defaultValue={initialData?.carplay || ''} options={['Sí', 'No']} disabled={isLocked} />

                {/* INTERIOR */}
                <Select name="seat_material" label="Interior" defaultValue={initialData?.seat_material || ''} options={['Piel', 'Tela', 'Alcántara', 'Piel/Tela', 'Vinil']} disabled={isLocked} />
                <Select name="seats" label="Filas Asientos" defaultValue={initialData?.seats || ''} options={['1', '2', '3', '4', '5']} disabled={isLocked} />

                {/* EXTRAS */}
                <Select name="roof_type" label="Techo" defaultValue={initialData?.roof_type || ''} options={['Normal', 'Panorámico', 'Sunroof', 'Convertible', 'Targa']} disabled={isLocked} />
                <Select name="camera" label="Cámara" defaultValue={initialData?.camera || ''} options={['No', 'Reversa', '360°', 'Frontal + Reversa']} disabled={isLocked} />
                <Select name="sensors" label="Sensores" defaultValue={initialData?.sensors || ''} options={['Sí', 'No']} disabled={isLocked} />
                <Select name="is_electric_trunk" label="Baúl Eléctrico" defaultValue={initialData ? (initialData.trunk_type === 'Eléctrica' ? 'Sí' : 'No') : ''} options={['Sí', 'No']} disabled={isLocked} />
                <Select name="electric_windows" label="Cristales Eléctricos" defaultValue={initialData?.electric_windows || ''} options={['Sí', 'No']} disabled={isLocked} />
                <Select name="key_type" label="Llave" defaultValue={initialData?.key_type || ''} options={['Llave Normal', 'Push Button']} disabled={isLocked} />
              </div>
            </div>

            {/* PRECIO & ESTADO */}
            <div className="border-t border-slate-100 pt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* PRECIO */}
                <div className={isLocked ? "opacity-60 pointer-events-none grayscale-[0.5] flex flex-col group" : "flex flex-col group"}>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-600">Precio de Venta</label>
                  <div className={`flex relative items-stretch shadow-sm rounded-xl overflow-hidden ring-1 ring-slate-200 ${isLocked ? 'bg-slate-50' : 'bg-white'}`}>
                    <input
                      type="text"
                      value={formatWithCommas(prices.price)}
                      onChange={(e) => setPrices(prev => ({ ...prev, price: parseCommaNumber(e.target.value) }))}
                      className="flex-1 min-w-0 px-2.5 py-3 bg-transparent focus:outline-none font-black text-slate-800 text-sm"
                      placeholder="0.00"
                      required
                      disabled={isLocked}
                    />
                    <div className="bg-slate-100 flex p-1 items-center border-l border-slate-200 shrink-0">
                      <div className="flex bg-slate-200/50 p-1 rounded-lg">
                        {['USD', 'DOP'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            disabled={isLocked}
                            onClick={() => setCurrency(c)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${currency === c ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
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
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-600">Inicial</label>
                  <div className={`flex relative items-stretch shadow-sm rounded-xl overflow-hidden ring-1 ring-slate-200 ${isLocked ? 'bg-slate-50' : 'bg-white'}`}>
                    <input
                      type="text"
                      value={formatWithCommas(prices.initial)}
                      onChange={(e) => setPrices(prev => ({ ...prev, initial: parseCommaNumber(e.target.value) }))}
                      className="flex-1 min-w-0 px-2.5 py-3 bg-transparent focus:outline-none font-black text-slate-800 text-sm"
                      placeholder="0.00"
                      disabled={isLocked}
                    />
                    <div className="bg-slate-100 flex p-1 items-center border-l border-slate-200 shrink-0">
                      <div className="flex bg-slate-200/50 p-1 rounded-lg">
                        {['USD', 'DOP'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            disabled={isLocked}
                            onClick={() => setDownPaymentCurrency(c)}
                            className={`px-3 py-1.5 rounded-md text-[10px] font-black transition-all ${downPaymentCurrency === c ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
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
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-600">Estado del Vehículo</label>
                  <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                    {[
                      { value: 'available', label: 'Disponible', color: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' },
                      { value: 'quoted', label: 'Cotizado', color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' },
                      { value: 'sold', label: 'Vendido', color: 'bg-slate-500', text: 'text-slate-600', bg: 'bg-slate-200' }
                    ].map((option) => {
                      const isActive = (initialData?.status || 'available') === option.value;
                      // Local state handling if we weren't using a form... 
                      // actually we need to make sure this updates the form correctly.
                      // Since we are using native form inputs, we should add a hidden input for status
                      // and manage state for this visual selector.
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            // Update a hidden input or state? 
                            // The form uses uncontrolled inputs for some things, but let's check.
                            // The modal uses `initialData` but we don't have a direct state for `status`.
                            // Let's add a hidden input for status and a state for it.
                            setStatus(option.value);
                          }}
                          className={`flex-1 flex flex-col items-center justify-center py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all duration-300 ${status === option.value
                            ? `bg-white shadow-md ${option.text} scale-100`
                            : 'text-slate-400 hover:bg-white/50 hover:text-slate-500'
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
                  className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-red-400 hover:bg-red-50 transition-all group"
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
                      {index !== 0 && <button type="button" onClick={() => setAsCover(index)} className="p-1.5 bg-emerald-500 text-white rounded-full hover:scale-110 transition-transform"><Check size={12} /></button>}
                    </div>
                    {index === 0 && <span className="absolute bottom-0 left-0 right-0 bg-emerald-500 text-white text-[8px] font-black text-center py-0.5 uppercase tracking-widest">Portada</span>}
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
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [price, setPrice] = useState(vehicle?.price || '');
  const [downPayment, setDownPayment] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [errors, setErrors] = useState({});

  // Get first quote template if available
  const quoteTemplates = useMemo(() => templates.filter(t => t.category === 'quote'), [templates]);

  // Auto-select template
  useEffect(() => {
    if (quoteTemplates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(quoteTemplates[0].id);
    }
  }, [quoteTemplates, selectedTemplateId]);

  // Reset and pre-fill when vehicle changes (handles both new and editing)
  useEffect(() => {
    if (vehicle) {
      // ONLY pre-fill client data if it's already a quote (status === 'quoted')
      const isQuoted = vehicle.status === 'quoted';

      setName(isQuoted ? (vehicle.name || '') : '');
      setLastname(isQuoted ? (vehicle.lastname || '') : '');
      setPhone(isQuoted ? (vehicle.phone || '') : '');
      setCedula(isQuoted ? (vehicle.cedula || '') : '');
      setBankName(isQuoted ? (vehicle.bank || '') : '');

      const autoPrice = vehicle.price_quoted || (vehicle.price_dop > 0 ? vehicle.price_dop : (vehicle.price || ''));
      setPrice(autoPrice);
      setDownPayment(vehicle.initial_quoted || vehicle.initial_payment_dop || vehicle.initial_payment || vehicle.initial_dop || vehicle.initial || vehicle.downPayment || 0);
    }
  }, [vehicle]);

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!name.trim()) newErrors.name = true;
    if (!lastname.trim()) newErrors.lastname = true;
    if (!cedula.trim()) newErrors.cedula = true;
    if (!bankName.trim()) newErrors.bankName = true;
    if (!String(price).trim()) newErrors.price = true;
    if (!String(downPayment).trim()) newErrors.downPayment = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast?.('Por favor completa los campos requeridos marcados en rojo', 'error');
      setTimeout(() => setErrors({}), 3000);
      return;
    }

    setLoading(true);

    const baseUrl = "https://services.leadconnectorhq.com/hooks/5YBWavjywU0Ay0Y85R9p/webhook-trigger/c3456437-ef2d-4ed8-b6da-61235568dd14";

    const params = new URLSearchParams();
    params.append("firstName", name);
    params.append("lastName", lastname);
    params.append("phone", phone);
    params.append("vehicle", `${vehicle.make} ${vehicle.model} ${vehicle.year}`);
    params.append("price", price);
    params.append("source", "App CarBot");

    const quoteData = {
      name: name,
      lastname: lastname,
      phone: phone,
      cedula: cedula,
      price: price,
      initial: downPayment,
      bank: bankName,
      vehicleId: vehicle.id,
      vehicle: `${vehicle.make} ${vehicle.model}`,
      year: vehicle.year || '',
      color: vehicle.color || '',
      version: vehicle.version || '',
      vin: vehicle.vin || '',
      mileage: vehicle.mileage || '',
      fuel: vehicle.fuel || '',
      transmission: vehicle.transmission || '',
      drivetrain: vehicle.drivetrain || '',
      passengers: vehicle.passengers || '',
      template: quoteTemplates.find(t => t.id === selectedTemplateId)?.name || null,
      templateId: selectedTemplateId || null,
      templateContent: quoteTemplates.find(t => t.id === selectedTemplateId)?.content || null,
      category: 'quote',
      createdAt: new Date().toISOString()
    };

    const finalUrl = `${baseUrl}?${params.toString()}`;
    const pixel = new Image();
    pixel.src = finalUrl;

    setTimeout(() => {
      onConfirm(quoteData);
      setLoading(false);
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full h-full sm:h-auto sm:max-w-3xl animate-in zoom-in-95 duration-200">
        <Card className="h-full sm:h-auto rounded-none sm:rounded-[24px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <div className="p-2 bg-red-50 rounded-lg mr-3"><FilePlus size={20} className="text-red-600" /></div>
              Cotizar: {userProfile?.dealerName}
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>

          <form onSubmit={handleSend} className="space-y-5">
            {/* 1. Vehicle Selection (Locked) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">1. Vehículo Seleccionado</label>
              <div className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-xl flex items-center gap-4 select-none relative overflow-hidden group">
                {/* Decorative Lock Icon */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-200 group-hover:text-emerald-300 transition-colors">
                  <Lock size={20} />
                </div>

                <div className="w-12 h-12 rounded-lg bg-white border border-emerald-100 shadow-sm flex items-center justify-center shrink-0">
                  <AppLogo size={24} />
                </div>

                <div className="flex-1 pr-8">
                  <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">
                    {vehicle?.make} {vehicle?.model}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-bold text-slate-500">
                      {vehicle?.year}
                    </span>
                    <span className="text-[10px] text-slate-300">•</span>
                    <span className="text-xs font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                      {vehicle?.price_dop > 0
                        ? `RD$ ${vehicle?.price_dop.toLocaleString()}`
                        : `US$ ${Number(vehicle?.price || 0).toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Template Selection */}
            {quoteTemplates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Plantilla de Cotización</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {quoteTemplates.map(t => {
                    const isSelected = selectedTemplateId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id)}
                        className={`cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 relative flex items-center gap-3 ${isSelected ? 'border-red-600 bg-red-50 shadow-md' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-300'}`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-red-600 border-red-600' : 'border-gray-300 bg-white'}`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>

                        <div className="flex-1">
                          <h4 className={`font-bold text-sm leading-tight ${isSelected ? 'text-slate-900' : 'text-gray-600'}`}>{t.name}</h4>
                          <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Cotización</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Row 1: Client Data (4 cols) */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><User size={16} /> 2. Datos del Prospecto</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input name="name" label="Nombre" placeholder="Ej. Juan" value={name} onChange={(e) => setName(e.target.value)} required error={errors.name} />
                  <Input name="lastname" label="Apellido" placeholder="Ej. Pérez" value={lastname} onChange={(e) => setLastname(e.target.value)} required error={errors.lastname} />
                  <Input name="phone" label="Teléfono" placeholder="+1 829..." value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <Input name="cedula" label="Cédula" placeholder="001-0000000-0" value={cedula} onChange={(e) => setCedula(e.target.value)} required error={errors.cedula} />
                </div>
              </div>

              {/* Row 2: Financial Terms (3 cols) */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><DollarSign size={16} /> 3. Términos Financieros</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input name="price" label="Precio" type="number" placeholder="Ej. 850000" value={price} onChange={(e) => setPrice(e.target.value)} required error={errors.price} />
                  <Input name="downPayment" label="Inicial / Avance" type="number" placeholder="Ej. 150000" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} required error={errors.downPayment} />
                  <Input name="bankName" label="Banco Dirigido" placeholder="Ej. Banco Popular" value={bankName} onChange={(e) => setBankName(e.target.value)} required error={errors.bankName} />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <Button variant="ghost" onClick={onClose} type="button" disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading} variant="primary">
                {loading ? <><Loader2 className="animate-spin mr-2" size={18} /> Procesando...</> : 'COMPLETAR'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

const GenerateQuoteModal = ({ isOpen, onClose, inventory, onSave, templates = [], initialVehicle, showToast }) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [cedula, setCedula] = useState('');
  const [bank, setBank] = useState('');
  const [price, setPrice] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [errors, setErrors] = useState({});

  // Filter for quote templates
  const quoteTemplates = useMemo(() => templates.filter(t => t.category === 'quote'), [templates]);

  // Auto-fill price when vehicle selected
  // Handle initialVehicle
  // Handle initialVehicle
  useEffect(() => {
    if (initialVehicle) {
      setSelectedVehicleId(initialVehicle.vehicleId || initialVehicle.id);

      const v = inventory.find(i => i.id === (initialVehicle.vehicleId || initialVehicle.id));
      if (v) {
        setPrice(v.price_dop > 0 ? v.price_dop : (v.price || ''));
        setDownPayment(v.initial_payment_dop || v.initial_payment || v.initial_dop || v.initial || v.downPayment || 0);
      }
    }
  }, [initialVehicle, inventory]);

  // Auto-fill price when vehicle selected (only if not initialVehicle to avoid overwrite)
  useEffect(() => {
    if (selectedVehicleId && !initialVehicle) {
      const v = inventory.find(i => i.id === selectedVehicleId);
      if (v) {
        const autoPrice = v.price_dop > 0 ? v.price_dop : (v.price || '');
        setPrice(autoPrice);
        setDownPayment(v.initial_payment_dop || v.initial_payment || v.initial_dop || v.initial || v.downPayment || 0);
      }
    }
  }, [selectedVehicleId, inventory, initialVehicle]);

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

    // Validation
    const newErrors = {};
    if (!selectedVehicleId) newErrors.vehicle = true;
    if (!name.trim()) newErrors.name = true;
    if (!lastname.trim()) newErrors.lastname = true;
    if (!cedula.trim()) newErrors.cedula = true;
    if (!String(price).trim()) newErrors.price = true;
    if (!String(downPayment).trim()) newErrors.downPayment = true;
    if (!bank.trim()) newErrors.bank = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (showToast) showToast('Por favor completa los campos requeridos marcados en rojo', 'error');
      // Reset errors after 3 seconds
      setTimeout(() => setErrors({}), 3000);
      return;
    }

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
        initial: downPayment, // Add initial/downPayment
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
      <div className="w-full h-full sm:h-auto sm:max-w-3xl animate-in zoom-in-95 duration-200">
        <Card className="h-full sm:h-auto rounded-none sm:rounded-[24px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <div className="p-2 bg-red-50 rounded-lg mr-3"><FilePlus size={20} className="text-red-600" /></div>
              Nueva Cotización Manual
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. Selecciona el Vehículo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">1. Selecciona el Vehículo</label>
              {initialVehicle ? (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-xl flex items-center gap-4 select-none relative overflow-hidden group">
                  {/* Decorative Lock Icon */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-200 group-hover:text-emerald-300 transition-colors">
                    <Lock size={20} />
                  </div>

                  <div className="w-12 h-12 rounded-lg bg-white border border-emerald-100 shadow-sm flex items-center justify-center shrink-0">
                    <AppLogo size={24} />
                  </div>

                  <div className="flex-1 pr-8">
                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">
                      {inventory.find(v => v.id === selectedVehicleId)?.make} {inventory.find(v => v.id === selectedVehicleId)?.model}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-slate-500">
                        {inventory.find(v => v.id === selectedVehicleId)?.year}
                      </span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-xs font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {inventory.find(v => v.id === selectedVehicleId)?.price_dop > 0
                          ? `RD$ ${inventory.find(v => v.id === selectedVehicleId)?.price_dop.toLocaleString()}`
                          : `US$ ${Number(inventory.find(v => v.id === selectedVehicleId)?.price || 0).toLocaleString()}`}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <select className="w-full px-3 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} required>
                  <option value="">-- Seleccionar vehículo disponible --</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year}) - {v.price_dop > 0 ? `RD$ ${v.price_dop.toLocaleString()}` : `US$ ${Number(v.price || 0).toLocaleString()}`}</option>
                  ))}
                </select>
              )}
            </div>

            {quoteTemplates.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Plantilla de Cotización</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {quoteTemplates.map(t => {
                    const isSelected = selectedTemplateId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id)}
                        className={`cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 relative flex items-center gap-3 ${isSelected ? 'border-red-600 bg-red-50 shadow-md' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-300'}`}
                      >
                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-red-600 border-red-600' : 'border-gray-300 bg-white'}`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>

                        <div className="flex-1">
                          <h4 className={`font-bold text-sm leading-tight ${isSelected ? 'text-slate-900' : 'text-gray-600'}`}>{t.name}</h4>
                          <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Cotización</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Compact Grid Layout */}
            <div className="space-y-4">
              {/* Row 1: Client Data (4 cols) */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><User size={16} /> 2. Datos del Prospecto</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input name="name" label="Nombre" placeholder="Ej. Juan" value={name} onChange={(e) => setName(e.target.value)} required error={errors.name} />
                  <Input name="lastname" label="Apellido" placeholder="Ej. Pérez" value={lastname} onChange={(e) => setLastname(e.target.value)} required error={errors.lastname} />
                  <Input name="phone" label="Teléfono" placeholder="809-555-5555" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <Input name="cedula" label="Cédula" placeholder="001-0000000-0" value={cedula} onChange={(e) => setCedula(e.target.value)} required error={errors.cedula} />
                </div>
              </div>

              {/* Row 2: Financial Terms (2 cols) */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><DollarSign size={16} /> 3. Términos Financieros</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input name="price" label="Precio" type="number" placeholder="Ej. 850000" value={price} onChange={(e) => setPrice(e.target.value)} required error={errors.price} />
                  <Input name="downPayment" label="Inicial / Avance" type="number" placeholder="Ej. 150000" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} required error={errors.downPayment} />
                  <Input name="bank" label="Banco Dirigido" placeholder="Ej. Banco Popular" value={bank} onChange={(e) => setBank(e.target.value)} required error={errors.bank} />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20">
                {loading ? <><Loader2 className="animate-spin mr-2" size={18} /> Procesando...</> : 'COMPLETAR'}
              </Button>
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
  const [clientPhone, setClientPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [finalPrice, setFinalPrice] = useState(''); // Estado para precio final
  const [downPayment, setDownPayment] = useState(''); // Estado para el inicial
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastGeneratedDoc, setLastGeneratedDoc] = useState(null);

  // 1. Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setShowSuccess(false);
      setLastGeneratedDoc(null);
    }
  }, [isOpen]);

  // 2. Initialize data when modal opens (only if not already showing success)
  useEffect(() => {
    if (isOpen && !showSuccess) {
      if (initialVehicle) {
        setSelectedVehicleId(initialVehicle.vehicleId || initialVehicle.id);

        // Only pre-fill client data if it comes from a quoted vehicle
        const isQuoted = initialVehicle.status === 'quoted' || !!initialVehicle.parentVehicleId;

        if (isQuoted && (initialVehicle.client || initialVehicle.name || initialVehicle.lastname)) {
          // If it's a linked quote entry in inventory, it has 'name' and 'lastname'
          if (initialVehicle.name || initialVehicle.lastname) {
            setClientName(initialVehicle.name || '');
            setClientLastName(initialVehicle.lastname || '');
          } else if (initialVehicle.client) {
            // If it's a document-style object with full string
            const parts = initialVehicle.client.split(' ');
            setClientName(parts[0] || '');
            setClientLastName(parts.slice(1).join(' ') || '');
          }

          setClientCedula(initialVehicle.cedula || initialVehicle.clientCedula || '');
          setClientPhone(initialVehicle.phone || initialVehicle.clientPhone || '');
          setBankName(initialVehicle.bank || initialVehicle.bankName || '');
        } else {
          // Clear client data when generating from available inventory
          setClientName('');
          setClientLastName('');
          setClientCedula('');
          setClientPhone('');
          setBankName('');
        }

        // Auto-fill price/downPayment from initial data or the vehicle in inventory
        const v = inventory.find(i => i.id === (initialVehicle.vehicleId || initialVehicle.id));
        setFinalPrice(initialVehicle.price_quoted || initialVehicle.price || initialVehicle.precio || (v ? (v.price_dop > 0 ? v.price_dop : (v.price || 0)) : 0));
        setDownPayment(initialVehicle.initial_quoted || initialVehicle.downPayment || initialVehicle.initial || (v ? (v.initial_payment_dop || v.initial_payment || v.initial_dop || v.initial || v.downPayment || 0) : 0));

        const template = templates.find(t => t.name === (initialVehicle.template || initialVehicle.templateName));
        if (template) setSelectedTemplates([template.id]);
      } else {
        setSelectedTemplates([]);
        setSelectedVehicleId('');
        setClientName('');
        setClientLastName('');
        setClientPhone(''); // clear phone
        setClientCedula('');
        setBankName('');    // clear bank
        setFinalPrice('');
        setDownPayment('');
      }
    }
  }, [initialVehicle, isOpen, showSuccess, inventory, templates]); // Added showSuccess, inventory, templates to dependencies

  // 3. Persistent Confetti Effect
  useEffect(() => {
    let interval;
    if (showSuccess && isOpen) {
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 200 };
      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      interval = setInterval(() => {
        confetti({ ...defaults, particleCount: 40, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount: 40, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [showSuccess, isOpen]);

  // When vehicle selected, auto-fill price if empty and NOT editing
  useEffect(() => {
    if (selectedVehicleId && !initialVehicle) {
      const v = inventory.find(i => i.id === selectedVehicleId);
      if (v) {
        // Predeterminadamente el precio y inicial que ya tiene el carro
        setFinalPrice(v.price_dop > 0 ? v.price_dop : (v.price || 0));
        setDownPayment(v.initial_payment_dop || v.initial_payment || v.initial_dop || v.initial || v.downPayment || 0);
      }
    }
  }, [selectedVehicleId, inventory, initialVehicle]);

  const toggleTemplate = (id) => {
    setSelectedTemplates(prev =>
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  if (!isOpen) return null;

  const availableVehicles = inventory.filter(v => v.status !== 'sold' || (initialVehicle && v.id === initialVehicle.id));

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!selectedVehicleId) newErrors.vehicle = true;
    if (selectedTemplates.length === 0) newErrors.templates = true;
    if (!clientName.trim()) newErrors.clientName = true;
    if (!clientLastName.trim()) newErrors.clientLastName = true;
    if (!clientCedula.trim()) newErrors.clientCedula = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (showToast) showToast('Por favor completa los campos requeridos marcados en rojo', 'error');
      // Reset errors after 3 seconds
      setTimeout(() => setErrors({}), 3000);
      return;
    }

    setLoading(true);

    setTimeout(() => {
      const vehicle = inventory.find(v => v.id === selectedVehicleId);

      // Generar un array de documentos, uno por cada plantilla seleccionada
      const documentsToGenerate = selectedTemplates.map(templateId => {
        const templateObj = templates.find(t => t.id === templateId);
        return {
          id: initialVehicle?.contractId || undefined,
          client: `${clientName} ${clientLastName}`,
          cedula: clientCedula,
          phone: clientPhone || initialVehicle?.phone || '',
          vehicle: `${vehicle.make} ${vehicle.model}`,
          vehicleId: vehicle.id,
          // Additional vehicle fields for template replacement
          // Mapping to Spanish Variables for PlantillaEditor
          nombre: clientName,
          apellido: clientLastName,
          telefono: clientPhone || initialVehicle?.phone || '',
          marca: vehicle.make,
          modelo: vehicle.model,
          año: vehicle.year || '',
          ano: vehicle.year || '',
          color: vehicle.color || '',
          edicion: vehicle.version || vehicle.edition || '',
          version: vehicle.version || vehicle.edition || '',
          millaje: vehicle.mileage || '',
          combustible: vehicle.fuel || vehicle.combustible || '',
          transmision: vehicle.transmission || vehicle.transmision || '',
          traccion: vehicle.drivetrain || vehicle.traccion || '',
          carfax: vehicle.carfax || '',
          condicion: vehicle.condition || vehicle.condicion || '',
          asientos: vehicle.seats || vehicle.asientos || '',
          motor: vehicle.motor || vehicle.engine || '',
          placa: vehicle.plate || vehicle.placa || '',

          precio: finalPrice || (vehicle.price_dop > 0 ? vehicle.price_dop : vehicle.price),
          inicial: downPayment,
          banco: bankName,

          // Legacy English keys (keep for backward compatibility if needed)
          price: finalPrice || (vehicle.price_dop > 0 ? vehicle.price_dop : vehicle.price),
          downPayment: downPayment,
          bank: bankName,
          clientCedula: clientCedula,
          clientPhone: clientPhone || initialVehicle?.phone || '',
          template: templateObj?.name, // Nombre de la plantilla usada
          templateId: templateObj?.id, // ID exacto
          templateContent: templateObj?.content || null, // Capture content (legacy)
          // NUEVO: Clonar estructura completa de páginas para formato Carta
          pages: templateObj?.pages ? templateObj.pages.map(p => ({
            ...p,
            id: crypto.randomUUID(), // Nueva ID para cada página del contrato
            backgroundImage: p.backgroundImage || templateObj?.backgroundImage
          })) : null,
          // NUEVO: Clonar imágenes flotantes (firmas, logos, etc.)
          images: templateObj?.images ? templateObj.images.map(img => ({
            ...img,
            id: crypto.randomUUID() // Nueva ID para cada imagen
          })) : null,
          // NUEVO: Fondo principal de la plantilla
          backgroundImage: templateObj?.backgroundImage || null,
          category: templateObj?.category || 'contract', // Categoría
          templateType: templateObj?.templateType, // CRITICAL: Pass template type (CONTRATO/COTIZACIÓN)
          tipo: 'CARTA_LEGAL', // Formato Carta 8.5x11
          status: 'pending',
          date: new Date().toISOString().split('T')[0],
          ghl_id: `ghl_${Math.floor(Math.random() * 1000)}`,
          vin: vehicle.vin
        };
      });

      // Save for success view FIRST
      setLastGeneratedDoc(documentsToGenerate.length === 1 ? documentsToGenerate[0] : documentsToGenerate);

      // Show success view immediately
      setShowSuccess(true);
      setLoading(false);

      // Save to database in background (async, non-blocking)
      if (documentsToGenerate.length === 1) {
        onGenerate(documentsToGenerate[0]);
      } else {
        onGenerate(documentsToGenerate);
      }

    }, 1500);
  };

  const handlePrintGenerated = () => {
    if (!lastGeneratedDoc) return;

    // Si es un array, imprimimos el primero o avisamos (usualmente es 1 o varios)
    const docToPrint = Array.isArray(lastGeneratedDoc) ? lastGeneratedDoc[0] : lastGeneratedDoc;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Contrato</title>
          <style>@page {size: letter; margin: 0; }</style>
        </head>
        <body style="margin: 0;">${generateContractHtml(docToPrint, userProfile)}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  if (!isOpen) return null;

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/85 backdrop-blur-md transition-all duration-500">
        <div className="w-full max-w-2xl animate-in zoom-in-95 duration-500">
          <Card className="rounded-[30px] sm:rounded-[40px] text-center px-6 py-10 sm:p-16 relative overflow-hidden shadow-2xl border-none ring-0">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-orange-50 pointer-events-none animate-pulse" style={{ animationDuration: '3s' }} />

            {/* Radial glow effect */}
            <div className="absolute inset-0 bg-gradient-radial from-red-100/40 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10">
              {/* Central Logo - Jumping/Bouncing */}
              <div className="relative mx-auto mb-6 sm:mb-10 w-32 h-32 sm:w-48 sm:h-48 flex items-center justify-center animate-in zoom-in-50 duration-700">
                {/* Pulsing rings background */}
                <div className="absolute inset-0 rounded-full bg-red-100/50 animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-4 rounded-full bg-red-50/30 animate-pulse" style={{ animationDuration: '2s' }} />

                {/* Jumping Logo - Responsive size */}
                <div className="relative transform transition-all duration-1000 animate-bounce cursor-default" style={{ animationDuration: '2s' }}>
                  <div className="hidden sm:block"><AppLogo size={140} /></div>
                  <div className="block sm:hidden"><AppLogo size={90} /></div>
                </div>
              </div>

              {/* Title - Responsive size */}
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 leading-tight mb-2 uppercase tracking-tighter whitespace-nowrap overflow-hidden text-ellipsis">
                  Contrato Generado
                </h2>
                <div className="w-16 sm:w-24 h-1 sm:h-1.5 bg-red-600 mx-auto rounded-full" />
              </div>

              {/* Message - Mobile optimized */}
              <div className="max-w-xl mx-auto mb-8 sm:mb-12">
                <p className="text-base sm:text-xl text-slate-600 font-medium leading-relaxed">
                  ¡Felicidades! Se ha generado un nuevo contrato para <span className="font-extrabold text-red-600">
                    {Array.isArray(lastGeneratedDoc) ? lastGeneratedDoc[0]?.vehicle : lastGeneratedDoc?.vehicle}
                  </span> del cliente <span className="font-extrabold text-slate-900 border-b-2 border-red-200">
                    {Array.isArray(lastGeneratedDoc) ? lastGeneratedDoc[0]?.client : lastGeneratedDoc?.client}
                  </span>.
                </p>
              </div>

              {/* Buttons - Larger on mobile for better touch target */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center max-w-lg mx-auto">
                <Button
                  onClick={handlePrintGenerated}
                  className="w-full sm:flex-1 py-4 sm:py-6 text-base sm:text-lg font-black uppercase tracking-widest bg-red-600 hover:bg-slate-900 text-white shadow-2xl shadow-red-600/40 border-0"
                >
                  <span className="flex items-center justify-center gap-3">
                    <Printer size={20} className="sm:size-6" />
                    IMPRIMIR
                  </span>
                </Button>
                <Button
                  onClick={onClose}
                  className="w-full sm:flex-1 py-4 sm:py-6 text-base sm:text-lg font-black uppercase tracking-widest bg-slate-100 hover:bg-slate-200 text-slate-900 shadow-sm hover:shadow-md transition-all duration-300 rounded-[15px] sm:rounded-[20px] border-0"
                >
                  Cerrar
                </Button>
              </div>
            </div>

            {/* Enhanced decorative elements */}
            <div className="absolute -right-24 -bottom-24 w-80 h-80 bg-gradient-to-br from-red-200/60 to-orange-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
            <div className="absolute -left-24 -top-24 w-80 h-80 bg-gradient-to-br from-red-200/40 to-pink-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />

            {/* Sparkle effects */}
            <div className="absolute top-20 right-20 w-2 h-2 bg-red-400 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute bottom-32 left-24 w-2 h-2 bg-orange-400 rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
            <div className="absolute top-40 left-32 w-1.5 h-1.5 bg-red-300 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '1s' }} />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full h-full sm:h-auto sm:max-w-3xl animate-in zoom-in-95 duration-200">
        <Card className="h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-[24px]">
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
              {initialVehicle ? (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-100 rounded-xl flex items-center gap-4 select-none relative overflow-hidden group">
                  {/* Decorative Lock Icon */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-200 group-hover:text-emerald-300 transition-colors">
                    <Lock size={20} />
                  </div>

                  <div className="w-12 h-12 rounded-lg bg-white border border-emerald-100 shadow-sm flex items-center justify-center shrink-0">
                    <AppLogo size={24} />
                  </div>

                  <div className="flex-1 pr-8">
                    <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">
                      {inventory.find(v => v.id === selectedVehicleId)?.make} {inventory.find(v => v.id === selectedVehicleId)?.model}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-slate-500">
                        {inventory.find(v => v.id === selectedVehicleId)?.year}
                      </span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-xs font-black text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {initialVehicle?.price_quoted > 0
                          ? `RD$ ${initialVehicle.price_quoted.toLocaleString()}`
                          : (inventory.find(v => v.id === selectedVehicleId)?.price_dop > 0
                            ? `RD$ ${inventory.find(v => v.id === selectedVehicleId)?.price_dop.toLocaleString()}`
                            : `US$ ${Number(inventory.find(v => v.id === selectedVehicleId)?.price || 0).toLocaleString()}`)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <select className={`w-full px-3 py-3 border rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 transition-all ${errors.vehicle ? 'border-red-500 ring-red-500/20 bg-red-50/50' : 'border-gray-200 focus:ring-red-500/20 focus:border-red-500'}`} value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} required>
                  <option value="">-- Seleccionar vehículo disponible --</option>
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year}) - {v.price_dop > 0 ? `RD$ ${v.price_dop.toLocaleString()}` : `US$ ${Number(v.price || 0).toLocaleString()}`}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Compact Grid Layout */}
            <div className="space-y-4">
              {/* Row 1: Client Data (4 cols) */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><User size={16} /> 2. Datos del Cliente</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input name="clientName" label="Nombre" placeholder="Ej. Juan" value={clientName} onChange={(e) => setClientName(e.target.value)} required error={errors.clientName} />
                  <Input name="clientLastName" label="Apellido" placeholder="Ej. Pérez" value={clientLastName} onChange={(e) => setClientLastName(e.target.value)} required error={errors.clientLastName} />
                  <Input name="clientCedula" label="Cédula / Pasaporte" placeholder="001-0000000-0" value={clientCedula} onChange={(e) => setClientCedula(e.target.value)} required error={errors.clientCedula} />
                  <Input label="Teléfono" placeholder="809-555-5555" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                </div>
              </div>

              {/* Row 2: Financial Terms (3 cols) */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><DollarSign size={16} /> 3. Términos Financieros</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Input label="Banco / Financiera" placeholder="Ej. Banco Popular" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  <Input label="Precio Final de Venta" type="number" placeholder="Ej. 850000" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} />
                  <Input label="Inicial / Avance" type="number" placeholder="Ej. 150000" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-3 transition-colors ${errors.templates ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                {errors.templates ? '4. Elige al menos un documento (REQUERIDO)' : '4. Elige los Documentos a Generar (Selección Múltiple)'}
              </label>

              {/* Group by category if needed, or just list everything */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2">
                {templates.filter(t => t.category !== 'quote').map(template => {
                  const isSelected = selectedTemplates.includes(template.id);
                  return (
                    <div
                      key={template.id}
                      onClick={() => toggleTemplate(template.id)}
                      className={`cursor-pointer p-3 rounded-xl border-2 transition-all duration-200 relative flex items-center gap-3 ${isSelected ? 'border-red-600 bg-red-50 shadow-md' : (errors.templates ? 'border-red-300 bg-red-50/20 hover:border-red-500' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-300')}`}
                    >
                      <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${isSelected ? 'bg-red-600 border-red-600' : 'border-gray-300 bg-white'}`}>
                        {isSelected && <Check size={14} className="text-white" />}
                      </div>

                      <div className="flex-1">
                        <h4 className={`font-bold text-sm leading-tight ${isSelected ? 'text-slate-900' : 'text-gray-600'}`}>{template.name}</h4>
                        <span className="text-[10px] font-black uppercase tracking-wider text-red-500">Contrato</span>
                      </div>
                    </div>
                  );
                })}
                {templates.length === 0 && (
                  <div className="col-span-full p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No hay plantillas disponibles. Crea una primero en la pestaña "Plantilla".
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
              <Button variant="ghost" onClick={onClose} type="button" disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20">
                {loading ? <><Loader2 className="animate-spin mr-2" size={18} /> Procesando...</> : 'COMPLETAR'}
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
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
                      <img src={item.image} alt={item.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
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
const SettingsView = ({ userProfile, onLogout, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    jobTitle: userProfile?.jobTitle || 'Vendedor'
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync formData when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        jobTitle: userProfile.jobTitle || 'Vendedor'
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    setIsLoading(true);
    await onUpdateProfile(formData);
    setIsEditing(false);
    setIsLoading(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 sm:pb-0">

      {/* Premium Header Banner */}
      <div className="relative w-full h-40 sm:h-48 rounded-[32px] overflow-hidden mb-8 shadow-2xl shadow-red-900/20 group">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>

        {/* Decorative Red Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600 rounded-full blur-[80px] opacity-20 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-600 rounded-full blur-[80px] opacity-10 -ml-20 -mb-20"></div>

        <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 z-10">
          <div className="flex items-center gap-3 mb-2 opacity-80">
            <AppLogo size={32} className="text-white drop-shadow-md" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest border-l border-slate-600 pl-3">Sistema de Gestión</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-lg">
            CarBot <span className="text-red-500">x</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">{userProfile?.dealerName || 'DEALER'}</span>
          </h1>
          <p className="text-slate-400 font-medium mt-2 max-w-md">Gestiona tu perfil y configuración de usuario.</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Profile Card */}
        <div className="space-y-6">
          <Card className="p-8 border-none shadow-xl bg-white relative overflow-hidden text-center">
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-50 to-white flex items-center justify-center text-red-600 font-black text-4xl border-4 border-red-50 shadow-md mb-4">
                {userProfile?.name?.charAt(0) || 'U'}
              </div>
              <h2 className="text-2xl font-black text-slate-900">{userProfile?.name || 'Usuario'}</h2>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">{userProfile?.role || 'Administrador'}</p>

              <div className="w-full flex items-center justify-center gap-2 p-3 bg-slate-50 rounded-xl mb-6">
                <Building2 size={16} className="text-slate-400" />
                <span className="text-sm font-bold text-slate-600">{userProfile?.dealerName || 'Dealer'}</span>
              </div>

              <button onClick={onLogout} className="w-full py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2">
                <LogOut size={18} /> Cerrar Sesión
              </button>
            </div>
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-red-600/5 to-transparent"></div>
          </Card>

          <Card className="p-6 border-none shadow-md bg-slate-900 text-white relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/10 rounded-lg"><Headset size={20} className="text-white" /></div>
                <h3 className="font-bold">Soporte Técnico</h3>
              </div>
              <p className="text-slate-400 text-sm mb-4">¿Necesitas ayuda con el sistema? Contacta a nuestro equipo.</p>
              <button className="w-full py-2 bg-white text-slate-900 font-bold rounded-lg text-sm hover:bg-slate-200 transition-colors">
                Contactar Soporte
              </button>
            </div>
          </Card>
        </div>

        {/* Right Column: Edit Form & Stats */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 border-none shadow-xl bg-white relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Settings size={22} className="text-red-600" />
                Configuración de Cuenta
              </h2>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="text-sm font-bold text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1">
                  <Edit size={14} /> Editar
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 rounded-xl font-bold transition-all ${isEditing ? 'bg-white border-2 border-slate-200 focus:border-red-500' : 'bg-slate-50 border-2 border-transparent text-slate-500'} `}
                />
              </div>
              {/* Job Title */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Puesto</label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  disabled={!isEditing}
                  className={`w-full px-4 py-3 rounded-xl font-bold transition-all ${isEditing ? 'bg-white border-2 border-slate-200 focus:border-red-500' : 'bg-slate-50 border-2 border-transparent text-slate-500'} `}
                />
              </div>
              {/* Email (Read only) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                <input type="text" value={userProfile?.email || ''} disabled className="w-full px-4 py-3 bg-slate-100 rounded-xl font-bold text-slate-400 cursor-not-allowed" />
              </div>
              {/* Dealer (Read only) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dealer</label>
                <input type="text" value={userProfile?.dealerName || ''} disabled className="w-full px-4 py-3 bg-slate-100 rounded-xl font-bold text-slate-400 cursor-not-allowed" />
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 mt-8 justify-end">
                <button onClick={() => setIsEditing(false)} className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">Cancelar</button>
                <button onClick={handleSave} disabled={isLoading} className="px-6 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-lg shadow-red-600/20">{isLoading ? 'Guardando...' : 'Guardar Cambios'}</button>
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Card className="p-6 border-none shadow-md bg-blue-50/50 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3"><Fingerprint size={24} /></div>
              <h3 className="font-bold text-slate-700">ID de Usuario</h3>
              <p className="text-xs font-mono text-slate-400 mt-1">{userProfile?.uid || 'Wait...'}</p>
            </Card>
            <Card className="p-6 border-none shadow-md bg-emerald-50/50 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-3"><Sparkles size={24} /></div>
              <h3 className="font-bold text-slate-700">Estado de Cuenta</h3>
              <span className="mt-2 px-3 py-1 bg-emerald-200 text-emerald-800 text-xs font-black rounded-full uppercase">Activo - Premium</span>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ inventory, contracts, quotes = [], onNavigate, userProfile }) => {
  // Stats Calculations
  const availableInventory = inventory.filter(i => i.status === 'available' || i.status === 'quoted');
  const soldInventory = inventory.filter(i => i.status === 'sold');

  const activeInventory = (inventory || []).filter(i => i && i.status !== 'trash');
  // Use availableInventory (which is available + quoted) instead of activeInventory to exclude sold vehicles from global figures
  const totalValueRD = availableInventory.reduce((acc, item) => acc + (item.price_dop || 0), 0);
  const totalValueUSD = availableInventory.reduce((acc, item) => acc + (item.price || 0), 0);

  const recentContracts = contracts.slice(0, 5);

  // Prioritize URL parameters for display to ensure immediate feedback in GHL
  const params = new URLSearchParams(window.location.search);
  const rawDealerName = params.get('location_name') || userProfile?.dealerName || 'Tu Dealer';

  // --- ACTIVITY FEED LOGIC ---
  const activityFeed = useMemo(() => {
    const feed = [];

    // 1. Contracts
    contracts.slice(0, 10).forEach(c => {
      feed.push({
        id: c.id,
        type: 'contract',
        date: new Date(c.createdAt || 0),
        title: 'Contrato Generado',
        subtitle: `${c.client} • ${c.vehicle}`,
        amount: c.price,
        icon: FileText,
        color: 'text-blue-600',
        bg: 'bg-blue-50'
      });
    });

    // 2. Quotes
    if (quotes && quotes.length > 0) {
      quotes.slice(0, 10).forEach(q => {
        feed.push({
          id: q.id,
          type: 'quote',
          date: new Date(q.createdAt || 0),
          title: 'Cotización Enviada',
          subtitle: `${q.name} ${q.lastname} • ${q.vehicle}`,
          amount: q.price,
          icon: Send,
          color: 'text-purple-600',
          bg: 'bg-purple-50'
        });
      });
    }

    // 3. Sold Vehicles (Proxy: status=sold, date=updatedAt)
    inventory.filter(i => i.status === 'sold').forEach(v => {
      if (v.updatedAt) {
        feed.push({
          id: `sold-${v.id}`,
          type: 'sale',
          date: new Date(v.updatedAt),
          title: 'Vehículo Vendido',
          subtitle: `${v.make} ${v.model}`,
          amount: v.price_dop || v.price,
          icon: CheckCircle,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50'
        });
      }
    });

    // 4. New Inventory (Recently added)
    inventory.filter(i => i.status === 'available').forEach(v => {
      feed.push({
        id: `new-${v.id}`,
        type: 'new',
        date: new Date(v.createdAt),
        title: 'Nuevo Ingreso',
        subtitle: `${v.make} ${v.model}`,
        amount: v.price_dop || v.price,
        icon: PlusCircle,
        color: 'text-slate-600',
        bg: 'bg-slate-50'
      });
    });

    return feed.sort((a, b) => b.date - a.date).slice(0, 5);
  }, [inventory, contracts, quotes]);

  // El titular siempre usa el nombre real (con acentos) pero limpio de asteriscos y formateado
  const displayDealerName = rawDealerName.trim().replace(/[*_~\`]/g, '').toUpperCase();
  const displayUserName = params.get('user_name') || userProfile?.name || 'Usuario';

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Welcome Banner (Red) - Mobile Optimized */}
      <Card className="relative overflow-hidden border-none bg-red-600 text-white shadow-xl shadow-red-600/20">
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
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-2 sm:mb-4 group-hover:scale-110 group-hover:rotate-12 transition-transform">
                <DollarSign size={16} className="sm:w-[24px] sm:h-[24px]" />
              </div>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">VENDIDOS</p>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900">{soldInventory.length}</h2>

            </div>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">OK</span>
          </div>
          <DollarSign className="absolute -bottom-6 -right-6 text-emerald-50/50 group-hover:text-emerald-100/50 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-500" size={120} />
        </Card>
      </div>

      {/* Row 2: Global Figures */}
      <Card className="p-8 border-none shadow-sm bg-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
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

          <div className="mt-6 space-y-6">
            {activityFeed.length > 0 ? (
              activityFeed.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-start gap-4 group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.bg} ${item.color} shadow-sm group-hover:scale-110 transition-transform`}>
                    <item.icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">{item.title}</h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 mb-1">{item.subtitle}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider">{item.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {item.amount > 0 && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${item.bg} ${item.color}`}>
                          ${item.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 opacity-50">
                <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                <p className="text-xs font-bold text-slate-300">Sin actividad reciente</p>
              </div>
            )}
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

  // Auto-switch default sorting based on tab
  useEffect(() => {
    if (activeTab === 'available') {
      setSortConfig('brand_asc');
    } else if (activeTab === 'quoted' || activeTab === 'sold') {
      setSortConfig('date_desc');
    }
  }, [activeTab]);

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
      ${item.name || ''}
      ${item.lastname || ''}
      `.toLowerCase();

      const globalMatches = !searchTerm || searchContent.includes(searchTerm.toLowerCase());
      const localMatches = !localSearch || searchContent.includes(localSearch.toLowerCase());

      let matchesTab = true;
      const isQuoteVersion = !!item.parentVehicleId;

      if (activeTab === 'available') {
        // En Disponibles mostramos carros físicos (sin parentVehicleId) que estén disponibles o cotizados
        matchesTab = (item.status === 'available' || item.status === 'quoted') && !isQuoteVersion;
      } else if (activeTab === 'quoted') {
        // En Cotizados mostramos SOLO las fichas de cotización específicas
        // No mostramos el vehículo original (que vive en la pestaña Disponibles)
        matchesTab = item.status === 'quoted' && isQuoteVersion;
      } else if (activeTab === 'sold') {
        // En Vendidos mostramos carros físicos vendidos
        matchesTab = item.status === 'sold' && !isQuoteVersion;
      } else if (activeTab === 'all') {
        matchesTab = true;
      }

      return globalMatches && localMatches && matchesTab;
    });

    // APLICAR ORDEN
    result.sort((a, b) => {
      // Si el usuario no ha seleccionado un orden manual, usamos el predeterminado por pestaña
      if (sortConfig === 'brand_asc' && (activeTab === 'quoted' || activeTab === 'sold')) {
        // Para Cotizados/Vendidos el default es fecha desc si no se cambió
        // Pero sortConfig por defecto es 'brand_asc' en el estado inicial
        // Así que si está en brand_asc pero en estas pestañas, lo ignoramos a menos que sea explícito?
        // Mejor: Si es brand_asc, respetamos. Pero el default inicial debería ser dinámico.
      }

      switch (sortConfig) {
        case 'date_desc':
          const bDate = (activeTab === 'sold' || activeTab === 'quoted') ? (b.updatedAt || b.createdAt || 0) : (b.createdAt || 0);
          const aDate = (activeTab === 'sold' || activeTab === 'quoted') ? (a.updatedAt || a.createdAt || 0) : (a.createdAt || 0);
          return new Date(bDate) - new Date(aDate);
        case 'date_asc':
          const bDateAsc = (activeTab === 'sold' || activeTab === 'quoted') ? (b.updatedAt || b.createdAt || 0) : (b.createdAt || 0);
          const aDateAsc = (activeTab === 'sold' || activeTab === 'quoted') ? (a.updatedAt || a.createdAt || 0) : (a.createdAt || 0);
          return new Date(aDateAsc) - new Date(bDateAsc);
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
    const isDateSort = sortConfig === 'date_desc' || sortConfig === 'date_asc' || sortConfig === 'updated_desc';

    filteredInventory.forEach(item => {
      let groupKey = "RESULTADOS";

      if (activeTab === 'available') {
        groupKey = item.make || "SIN MARCA";
      } else if (activeTab === 'quoted' || activeTab === 'sold') {
        const dateStr = (activeTab === 'sold' || activeTab === 'quoted') ? (item.updatedAt || item.createdAt) : item.createdAt;
        const date = new Date(dateStr || Date.now());
        const month = date.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
        const year = date.getFullYear();
        groupKey = `${month} ${year}`;
      } else if (isBrandSort) {
        groupKey = item.make;
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  }, [filteredInventory, sortConfig, activeTab]);

  const sortedBrands = useMemo(() => {
    const keys = Object.keys(groupedInventory);
    if (activeTab === 'available' || sortConfig === 'brand_asc') {
      return keys.sort();
    }
    // Para fecha, ya están ordenados los items internamente, pero los grupos (meses) 
    // deberían estar en orden cronológico inverso
    if (activeTab === 'quoted' || activeTab === 'sold') {
      return keys.sort((a, b) => {
        // Intentar parsear "MES AÑO"
        const parseDate = (s) => {
          const [m, y] = s.split(' ');
          const months = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
          return new Date(y, months.indexOf(m));
        };
        return parseDate(b) - parseDate(a);
      });
    }
    return keys;
  }, [groupedInventory, activeTab, sortConfig]);

  const handleCreate = () => { setCurrentVehicle(null); setIsModalOpen(true); };

  const handleSaveWrapper = async (data) => {
    await onSave(data);
    setIsModalOpen(false);
    setCurrentVehicle(null);
  };

  const handleDeleteWrapper = (item) => {
    const isQuote = item.status === 'quoted' || (item.parentVehicleId && activeTab === 'quoted');
    requestConfirmation({
      title: isQuote ? '¿Eliminar Cotización?' : '¿Confirmar Eliminación?',
      message: isQuote
        ? '¿Seguro que deseas eliminar esta cotización? El vehículo asociado volverá a estar disponible.'
        : '¿Seguro que deseas mover este vehículo a la papelera?',
      confirmText: isQuote ? 'Eliminar Cotización' : 'Mover a Papelera',
      isDestructive: true,
      onConfirm: () => onDelete(item.id, isQuote ? item.parentVehicleId : null) // Pass parentVehicleId if it's a quote
    });
  };

  const openActionModal = (vehicle) => { setCurrentVehicle(vehicle); setIsActionModalOpen(true); };
  const handleActionSelect = (action) => {
    setIsActionModalOpen(false);
    if (action === 'quote') setIsQuoteModalOpen(true);
    else if (action === 'contract') setIsContractModalOpen(true);
  };

  const handleSellQuoted = (vehicle) => {
    // Si ya es una ficha de cotización (tiene parentVehicleId), la usamos directamente
    // Si no, intentamos buscarla en la colección de quotes (legacy support)
    if (vehicle.parentVehicleId) {
      setCurrentVehicle(vehicle);
    } else {
      const lastQuote = quotes.find(q => q.vehicleId === vehicle.id);
      setCurrentVehicle(lastQuote || vehicle);
    }
    setIsContractModalOpen(true);
  };

  const handleQuoteSent = async (quoteData) => {
    setIsQuoteModalOpen(false);
    showToast("Generando cotización...");
    if (onGenerateQuote) {
      await onGenerateQuote(quoteData);
    }
    setCurrentVehicle(null);
  };

  const handleContractGenerated = (contractData) => {
    onGenerateContract(contractData);
    // Don't close modal here - let the success view handle it
    setCurrentVehicle(null);
  };

  const handleCancelSale = (vehicle) => {
    requestConfirmation({
      title: '¿Confirmar Cancelación de Venta?',
      message: '¿Seguro que deseas cancelar esta venta y devolver el vehículo al inventario disponible?',
      confirmText: 'Confirmar Cancelación',
      isDestructive: true,
      onConfirm: async () => {
        const resetVehicle = {
          ...vehicle,
          status: 'available',
          updatedAt: new Date().toISOString(),
          soldToName: '',
          soldToCedula: '',
          soldToPhone: '',
          soldPrice: 0
        };
        await onSave(resetVehicle);
        showToast("Venta cancelada. El vehículo vuelve a Disponibles.");
      }
    });
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
            className="flex-1 sm:flex-none px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 appearance-none cursor-pointer"
          >
            <option value="date_desc">Más Recientes</option>
            <option value="date_asc">Más Antiguos</option>
            <option value="updated_desc">Última Actualización</option>
            <option value="name_asc">Nombre (A-Z)</option>
            <option value="brand_asc">Marca</option>
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
                      <img src={item.image} alt={item.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" />
                      <div className="absolute top-4 right-4 shadow-xl"><Badge status={item.status} /></div>

                      {/* Premium Overlay on Hover */}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest border border-white/20">
                          Ver Detalles
                        </div>
                      </div>
                    </div>

                    <div className="p-6 flex flex-col flex-1">
                      {activeTab !== 'sold' && (
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-black text-slate-900 text-lg leading-tight">{item.make} {item.model}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.year} • {item.edition || 'EDICIÓN'} • {item.color || 'COLOR'}</p>
                          </div>
                        </div>
                      )}

                      {/* Info Section */}
                      {activeTab === 'sold' ? (
                        <div className="bg-emerald-600 -mx-6 -mb-6 -mt-6 p-5 rounded-b-[2rem] text-white relative overflow-hidden group/sold flex-1 flex flex-col justify-between">
                          <CheckCircle className="absolute -right-4 -bottom-4 text-white/10 w-24 h-24" />
                          <div className="relative z-10">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                                  <Check size={12} className="text-white" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Venta Completada</span>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                              >
                                <MoreVertical size={14} />
                              </button>
                            </div>

                            <div className="mb-3 pb-3 border-b border-white/10">
                              <h3 className="font-black text-white text-base leading-tight">{item.make} {item.model}</h3>
                              <p className="text-[9px] font-black text-emerald-100/60 uppercase tracking-[0.2em] mt-0.5">{item.year} • {item.edition || 'EDICIÓN'} • {item.color || 'COLOR'}</p>
                            </div>

                            <div className="space-y-2">
                              <div>
                                <p className="text-[9px] font-black uppercase text-emerald-100/60 tracking-widest mb-0.5">Nombre del Propietario</p>
                                <p className="text-xs font-bold truncate">{item.soldToName || 'Ver en Documentos'}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[9px] font-black uppercase text-emerald-100/60 tracking-widest mb-0.5">Cédula</p>
                                  <p className="text-[11px] font-bold truncate">{item.soldToCedula || 'N/A'}</p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-black uppercase text-emerald-100/60 tracking-widest mb-0.5">Teléfono</p>
                                  <p className="text-[11px] font-bold truncate">{item.soldToPhone || 'N/A'}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="relative z-10 pt-3 mt-3 border-t border-white/10 flex justify-between items-end">
                            <div>
                              <p className="text-[9px] font-black uppercase text-emerald-100/60 tracking-widest mb-0.5">Precio</p>
                              <p className="text-xl font-black tracking-tighter">
                                RD$ {(item.soldPrice || item.price_dop || item.price || 0).toLocaleString()} <span className="text-[9px] opacity-60 ml-0.5">PESOS</span>
                              </p>
                            </div>
                            <Button
                              variant="secondary"
                              className="h-9 px-4 bg-white/10 border-white/20 text-white hover:bg-white hover:text-emerald-700 text-[10px] font-black rounded-xl flex items-center gap-2 transition-all active:scale-95"
                              onClick={(e) => { e.stopPropagation(); openActionModal(item); }}
                            >
                              <Files size={14} /> DOCS
                            </Button>
                          </div>

                          {openMenuId === item.id && (
                            <div className="absolute top-12 right-6 w-48 bg-white rounded-2xl shadow-2xl py-2 z-[60] border border-slate-100 animate-in slide-in-from-top-2 text-slate-800">
                              <button onClick={(e) => { e.stopPropagation(); handleCancelSale(item); }} className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-2 border-b border-gray-100">
                                <Undo size={12} /> Cancelar Venta
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteWrapper(item); }} className="w-full px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2">
                                <Trash2 size={12} /> Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="mb-6 h-[72px] flex flex-col justify-center">
                            {activeTab === 'quoted' ? (
                              <div className="space-y-0.5">
                                <p className="text-[11px] font-bold text-slate-900 truncate">
                                  <span className="text-slate-400 font-bold mr-1">Nombre:</span> {item.name || item.lastname ? `${item.name || ''} ${item.lastname || ''}`.trim() : 'Ver en Documentos'}
                                </p>
                                <p className="text-[10px] font-bold text-slate-700 truncate">
                                  <span className="text-slate-400 font-bold mr-1">Cedula:</span> {item.cedula || 'Pendiente'}
                                </p>
                                <p className="text-[10px] font-bold text-slate-700 truncate">
                                  <span className="text-slate-400 font-bold mr-1">Telefono:</span> {item.phone || 'N/A'}
                                </p>
                                <p className="text-[10px] font-bold text-red-600 truncate">
                                  <span className="text-slate-400 font-bold mr-1 uppercase">Dirigido a:</span> {item.bank || 'N/A'}
                                </p>
                              </div>
                            ) : (
                              <>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Precio</p>
                                <p className="text-2xl font-black text-red-700 tracking-tighter">
                                  {item.price_dop > 0 ? `RD$ ${item.price_dop.toLocaleString()}` : `US$ ${Number(item.price || 0).toLocaleString()}`}
                                </p>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                  Inicial: <span className="text-slate-900 font-black">{item.initial_payment_dop > 0 ? `RD$ ${item.initial_payment_dop.toLocaleString()}` : `US$ ${Number(item.initial_payment || 0).toLocaleString()}`}</span>
                                </p>
                              </>
                            )}
                          </div>

                          <div className="mt-auto">
                            {activeTab === 'quoted' ? (
                              <div className="flex items-center gap-2 relative">
                                <Button
                                  className="flex-1 bg-slate-900 text-white hover:bg-red-700 py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                  onClick={(e) => { e.stopPropagation(); handleSellQuoted(item); }}
                                >
                                  <FilePlus size={14} /> VENDER
                                </Button>

                                <button
                                  onClick={(e) => { e.stopPropagation(); setCurrentVehicle(item); setIsQuoteModalOpen(true); }}
                                  className="p-3.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-700 rounded-2xl transition-all active:scale-90"
                                  title="Editar Cotización"
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
                                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-[2rem] shadow-2xl border border-slate-100 py-3 z-[60] animate-in slide-in-from-bottom-2 text-slate-800">
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteWrapper(item); }} className="w-full px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3">
                                        <Trash2 size={14} /> ELIMINAR COTIZACIÓN
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 relative">
                                <Button
                                  variant="secondary"
                                  className="flex-1 text-[10px] font-black bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-2xl flex items-center justify-center gap-2 py-3 active:scale-95 transition-all"
                                  onClick={(e) => { e.stopPropagation(); openActionModal(item); }}
                                >
                                  <Files size={14} /> GENERAR DOC
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
                                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-[2rem] shadow-2xl border border-slate-100 py-3 z-[60] animate-in slide-in-from-bottom-2 text-slate-800">
                                      <button onClick={(e) => handleDuplicate(e, item)} className="w-full px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-3">
                                        <Copy size={14} /> Duplicar
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteWrapper(item); }} className="w-full px-6 py-3 text-left text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3">
                                        <Trash2 size={14} /> ELIMINAR
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
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
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [viewingTemplate, setViewingTemplate] = useState(null);
  const [sortConfig, setSortConfig] = useState('date_desc');

  // Define quoteTemplates and quoteInitialVehicle for GenerateQuoteModal
  const quoteTemplates = useMemo(() => templates.filter(t => t.category === 'quote'), [templates]);
  const quoteInitialVehicle = null; // Or set to a specific quote if editing

  const handleGenerateQuote = (quoteData) => {
    onGenerateQuote(quoteData);
    setIsQuoteModalOpen(false);
  };

  const handleDuplicate = (e, temp) => {
    e.stopPropagation();
    requestConfirmation({
      title: 'Duplicar Plantilla',
      message: `¿Deseas crear una copia de "${temp.name}"?`,
      confirmText: 'Duplicar',
      onConfirm: () => {
        const { id, ...rest } = temp;
        const newData = {
          ...rest,
          name: `${rest.name} (Copia)`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        onSaveTemplate(newData);
      }
    });
  };

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
              left: activeView === 'contracts' ? '6px' : activeView === 'quotes' ? 'calc(33.33% + 2px)' : 'calc(66.66% + 2px)',
              width: 'calc(33.33% - 8px)',
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
          <button
            onClick={() => setActiveView('templates')}
            className={`relative z-10 flex-1 text-center text-[10px] font-black uppercase tracking-wider transition-colors duration-300 ${activeView === 'templates' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Plantilla
          </button>
        </div>
      </div>

      {activeView === 'templates' ? (
        editingTemplate ? (
          <ContractTemplateEditor
            userProfile={userProfile}
            initialData={editingTemplate}
            onSave={(data) => { onSaveTemplate(data); setEditingTemplate(null); }}
            onDelete={(id) => { handleDeleteTemplate(id); setEditingTemplate(null); }}
            onCancel={() => setEditingTemplate(null)}
            showToast={showToast}
          />
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Galería de Plantillas</h2>
              <Button icon={FilePlus} onClick={() => setEditingTemplate({ name: '', content: '' })} variant="primary">
                Nueva Plantilla
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.length > 0 ? (
                templates.map(temp => (
                  <Card key={temp.id} noPadding className="group hover:-translate-y-1 transition-all">
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-3">
                          <FileCode size={24} />
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setViewingTemplate(temp)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Ver"><Eye size={18} /></button>
                          <button onClick={(e) => handleDuplicate(e, temp)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Duplicar"><Copy size={18} /></button>
                          <button onClick={() => setEditingTemplate(temp)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="Editar"><Edit size={18} /></button>
                          <button onClick={() => onDeleteTemplate(temp.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Eliminar"><Trash2 size={18} /></button>
                        </div>
                      </div>
                      <h3 className="text-lg font-black text-slate-900 mb-1">{temp.name || 'Sin Nombre'}</h3>
                      <div className="flex gap-2 mb-2">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${temp.category === 'quote' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-red-600 text-white shadow-lg shadow-red-500/20'}`}>
                          {temp.category === 'quote' ? 'Cotización' : 'Contrato'}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Actualizada: {temp.updatedAt ? new Date(temp.updatedAt).toLocaleDateString() : 'N/A'}
                      </p>
                      <div className="w-full h-64 bg-gray-100 rounded-xl overflow-hidden border border-slate-200 relative mt-4">
                        {(() => {
                          // Parsear datos de forma segura
                          let firstPage = null;
                          let images = [];
                          try {
                            const rawPages = temp.paginas;
                            const pages = Array.isArray(rawPages) ? rawPages : JSON.parse(rawPages || '[]');
                            if (Array.isArray(pages) && pages.length > 0) firstPage = pages[0];

                            const rawImages = temp.imagenes;
                            images = Array.isArray(rawImages) ? rawImages : JSON.parse(rawImages || '[]');
                          } catch (e) { console.error("Error parsing template data", e); }

                          if (firstPage) {
                            return (
                              <>
                                <div
                                  style={{
                                    width: '210mm', height: '297mm',
                                    position: 'absolute',
                                    top: '0',
                                    left: '50%',
                                    transform: 'translateX(-50%) scale(0.35)', // Zoom para ver bien la cabecera
                                    transformOrigin: 'top center',
                                    backgroundImage: firstPage.backgroundImage ? `url(${firstPage.backgroundImage})` : 'none',
                                    backgroundSize: '100% 100%',
                                    backgroundColor: 'white'
                                  }}
                                >
                                  {/* Capa de Texto Absoluta */}
                                  <div
                                    className="absolute inset-0 p-[25mm] text-left"
                                    style={{
                                      fontSize: '11pt',
                                      lineHeight: '1.15',
                                      fontFamily: 'Calibri, sans-serif',
                                      pointerEvents: 'none',
                                      color: '#000'
                                    }}
                                    dangerouslySetInnerHTML={{ __html: firstPage.content }}
                                  />

                                  {/* Mantener imágenes flotantes para fidelidad completa */}
                                  {Array.isArray(images) && images.filter(img => img.pageId === firstPage.id).map(img => (
                                    <img key={img.id} src={img.src} style={{ position: 'absolute', left: img.x, top: img.y, width: img.width, height: img.height, zIndex: img.zIndex === 'back' ? 0 : 20 }} />
                                  ))}
                                </div>
                                {/* Sombra suave interna para dar profundidad */}
                                <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.05)] pointer-events-none" />
                              </>
                            );
                          } else {
                            return <div className="flex items-center justify-center h-full text-[11px] text-slate-400 p-3 italic">Sin vista previa disponible</div>;
                          }
                        })()}
                      </div>
                    </div>
                  </Card>
                ))
              ) : (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 bg-white rounded-[2rem] border border-dashed border-slate-200">
                  <FileCode size={64} className="mb-4 opacity-20" />
                  <p className="text-lg font-medium">No hay plantillas creadas todavía</p>
                  <Button variant="ghost" className="mt-4" onClick={() => setEditingTemplate({ name: '', content: '' })}>Crear mi primera plantilla</Button>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        <>

          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-400 uppercase">Ordenar:</span>
              <select
                value={sortConfig}
                onChange={(e) => setSortConfig(e.target.value)}
                className="px-3 py-2 bg-slate-50 border-none rounded-lg text-sm font-bold focus:ring-2 focus:ring-red-500/20 cursor-pointer"
              >
                <option value="date_desc">Recientes</option>
                <option value="date_asc">Antiguos</option>
                <option value="client_asc">Nombre</option>
                <option value="vehicle_asc">Vehiculo</option>
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
                    <Card key={item.id} noPadding className="group hover:-translate-y-1 transition-all">
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
                    </Card>
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
              onSave={handleGenerateQuote}
              templates={quoteTemplates}
              initialVehicle={quoteInitialVehicle}
              showToast={showToast}
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
      )}

      {viewingTemplate && (() => {
        const dummyReplacements = {
          '{{CLIENTE_NOMBRE}}': 'JUAN',
          '{{CLIENTE_APELLIDO}}': 'PÉREZ',
          '{{CLIENTE_DOC}}': '001-0000000-1',
          '{{CLIENTE_TEL}}': '809-555-5555',
          '{{CLIENTE_CEDULA}}': '001-0000000-1',
          '{{VEHICULO_MARCA}}': 'TOYOTA',
          '{{VEHICULO_MODELO}}': 'HILUX REVO',
          '{{VEHICULO_COMPLETO}}': '2024 TOYOTA HILUX REVO',
          '{{VEHICULO_ANO}}': '2024',
          '{{VEHICULO_ANIO}}': '2024',
          '{{VEHICULO_COLOR}}': 'BLANCO',
          '{{VEHICULO_VIN}}': 'ABC123456789DEF0',
          '{{VEHICULO_VERSION}}': '4X4 DIESEL',
          '{{VEHICULO_MILLAJE}}': '1,200',
          '{{VEHICULO_COMBUSTIBLE}}': 'DIESEL',
          '{{VEHICULO_TRANSMISION}}': 'AUTOMÁTICA',
          '{{VEHICULO_TRACCION}}': '4WD',
          '{{VEHICULO_PASAJEROS}}': '5',
          '{{PRECIO_VENTA}}': 'RD$ 3,500,000',
          '{{MONTO_INICIAL}}': 'RD$ 700,000',
          '{{BANCO}}': 'BANRESERVAS',
          '{{FECHA_VENTA}}': new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }),
          '{{DEALER_NOMBRE}}': userProfile.dealerName || 'CARBOT RD',
          '{{FOLIO}}': 'Q-DUMMY',
          '{{client}}': 'JUAN PÉREZ',
          '{{ vehicle }}': 'TOYOTA HILUX',
          '{{ price }}': 'RD$ 3,500,000',
        };

        let previewContent = viewingTemplate.content || '';
        Object.keys(dummyReplacements).forEach(key => {
          const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          previewContent = previewContent.replace(new RegExp(escapedKey, 'g'), `<span style="color: #2563eb; font-weight: bold;">${dummyReplacements[key]}</span>`);
        });

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl h-[100dvh] sm:h-[90vh] rounded-none sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              <div className="px-4 py-3 sm:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0 safe-top">
                <div>
                  <h2 className="text-sm sm:text-xl font-black text-slate-900 uppercase">Vista Previa: {viewingTemplate.name}</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5 sm:mt-1">Modo lectura • Formato Carta</p>
                </div>
                <button onClick={() => setViewingTemplate(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <div className="flex-1 bg-gray-500/50 overflow-y-auto p-4 flex flex-col items-center">
                {(() => {
                  let pages = [];
                  let images = [];
                  try {
                    const rawPages = viewingTemplate.paginas;
                    pages = Array.isArray(rawPages) ? rawPages : JSON.parse(rawPages || '[]');

                    // Fallback si no hay array de páginas: creamos una con el contenido legacy
                    if (!Array.isArray(pages) || pages.length === 0) {
                      pages = [{ id: 'legacy', content: viewingTemplate.content || '' }];
                    }

                    const rawImages = viewingTemplate.imagenes;
                    images = Array.isArray(rawImages) ? rawImages : JSON.parse(rawImages || '[]');
                  } catch (e) {
                    console.error("Error parsing view template", e);
                    pages = [{ id: 'error', content: viewingTemplate.content || '' }];
                  }

                  return pages.map((page, index) => (
                    <div
                      key={page.id}
                      className="bg-white shadow-2xl relative overflow-hidden shrink-0"
                      style={{
                        width: '210mm',
                        height: '297mm',
                        backgroundImage: page.backgroundImage ? `url(${page.backgroundImage})` : 'none',
                        backgroundSize: '100% 100%',
                        backgroundRepeat: 'no-repeat',
                        // Esto centra la hoja si el zoom es pequeño
                        transform: 'scale(0.75)',
                        transformOrigin: 'top center',
                        // Compensar el espacio vacío que deja el scale (297mm * 0.25 ≈ 74mm)
                        marginBottom: index === pages.length - 1 ? '0' : '-70mm'
                      }}
                    >
                      {/* CAPA DE TEXTO: Posicionada exactamente igual que en el editor */}
                      <div
                        className="absolute inset-0 p-[25mm] text-left pointer-events-none"
                        style={{
                          lineHeight: '1.15',
                          fontSize: '11pt',
                          fontFamily: 'Calibri, sans-serif',
                          color: '#000',
                          zIndex: 10
                        }}
                        dangerouslySetInnerHTML={{ __html: page.content }}
                      />

                      {/* Renderizar imágenes flotantes guardadas */}
                      {Array.isArray(images) && images.filter(img => img.pageId === page.id).map(img => (
                        <img key={img.id} src={img.src} style={{ position: 'absolute', left: img.x, top: img.y, width: img.width, height: img.height, zIndex: img.zIndex === 'back' ? 0 : 20 }} />
                      ))}
                    </div>
                  ));
                })()}
              </div>

              <div className="p-3 sm:p-6 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0 safe-bottom">
                <Button variant="ghost" onClick={() => setViewingTemplate(null)}>Cerrar</Button>
                <Button icon={Edit} onClick={() => { setEditingTemplate(viewingTemplate); setViewingTemplate(null); }} className="bg-amber-600 text-white hover:bg-amber-700">Editar Plantilla</Button>
              </div>
            </div>
          </div>
        );
      })()}
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
                <span className="text-sm font-bold text-slate-500 tracking-[0.05em] mb-[-3px]">CarBot</span>
                <span className="text-lg font-black text-red-600 tracking-tighter mt-[-2px]">System</span>
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
                  {new URLSearchParams(window.location.search).get('user_name') || userProfile?.name || 'Usuario'}
                </p>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-tighter">
                  {(new URLSearchParams(window.location.search).get('location_name') || userProfile?.dealerName || 'Mi Dealer').trim().replace(/[*_~\`]/g, '')}
                </p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center text-red-600 text-xs sm:text-base font-black border-2 border-white shadow-sm ring-1 ring-red-100">
                {(new URLSearchParams(window.location.search).get('user_name') || userProfile?.name || 'U').charAt(0)}
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
  // Si es ruta de tienda, intentamos inferir el nombre del dealer del slug (reemplazando guiones por espacios)
  const urlLocationName = params.get('location_name') || (isStoreRoute && storeDealerSlug ? storeDealerSlug.replace(/-/g, ' ').toUpperCase() : null);
  const urlUserName = params.get('user_name');
  const urlUserEmail = (params.get('user_email') || '').toLowerCase(); // Emails siempre en minúsculas

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
  const isAutoLogin = !!(urlLocationId && (urlUserEmail || localStorage.getItem('lastUserEmail'))) || isStoreRoute;
  const [isLoggedIn, setIsLoggedIn] = useState(isAutoLogin || !!localStorage.getItem('lastUserEmail'));
  const [activeTab, setActiveTab] = useState(() => {
    if (isStoreRoute) return 'inventory'; // Force inventory tab in store mode
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsLoggedIn(true);
        setCurrentUserEmail(user.email);
        localStorage.setItem('lastUserEmail', user.email);
      } else if (isAutoLogin) {
        const emailToUse = (urlUserEmail || localStorage.getItem('lastUserEmail') || '').toLowerCase();
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
    return () => unsubscribe();
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
      ghlLocationId: urlLocationId || ''
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
              name: urlName || emailLower.split('@')[0],
              email: emailLower,
              dealerId: stableDealerId,
              dealerName: cleanDisplayDealerName,
              jobTitle: 'Admin',
              role: 'Admin',
              uid: auth.currentUser?.uid || null,
              createdAt: new Date().toISOString(),
              ghlLocationId: urlLocationId || ''
            };
          }

          if (profileData && profileData.dealerId) {
            const userId = emailLower.replace(/\./g, '_');
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

            setUserProfile(profileData);
          } else {
            // No se pudo determinar el dealer
            if (!isAutoLogin) {
              showToast("No se encontró cuenta asociada. Contacta soporte.", "error");
              await signOut(auth);
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
      const userId = currentUserEmail.replace(/\./g, '_');
      const userRef = doc(db, "users", userId);
      const allowedUpdates = {
        name: updatedData.name,
        jobTitle: updatedData.jobTitle,
        updatedAt: new Date().toISOString()
      };

      // Update Dealer Scoped Folder-Robust Update with setDoc merge
      const dealerUserRef = doc(db, "Dealers", effectiveDealerId, "usuarios", userId);
      await setDoc(dealerUserRef, allowedUpdates, { merge: true });

      if (updatedData.newPassword && updatedData.newPassword.length >= 6) {
        await updatePassword(auth.currentUser, updatedData.newPassword);
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

  const handleLogin = async ({ email, password }) => {
    try {
      if (!email || !password) {
        showToast("Email y contraseña requeridos", "error");
        return;
      }
      const normalizedEmail = email.toLowerCase().trim();

      // FIREBASE AUTH REAL
      await signInWithEmailAndPassword(auth, normalizedEmail, password);
      showToast("Sesión iniciada correctamente");
    } catch (error) {
      console.error("Error en login:", error);
      let msg = "Error al iniciar sesión";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        msg = "Credenciales incorrectas";
      }
      showToast(msg, "error");
    }
  };

  const handleLogout = () => {
    requestConfirmation({
      message: '¿Estás seguro de que deseas salir del sistema?',
      confirmText: 'Salir',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await signOut(auth);
        } catch (error) {
          console.error("Error signing out", error);
        }
        localStorage.removeItem('lastUserEmail');
        setIsLoggedIn(false);
        setUserProfile(null);
        setCurrentUserEmail('');
      }
    });
  };

  // 2. DATA LISTENERS (REACTIVE TO CONTEXT)
  useEffect(() => {
    if (!effectiveDealerId) {
      console.log("⏳ Esperando context/dealerId para iniciar listeners...");
      return;
    }

    console.log("📡 [LISTENERS] Iniciando para Dealer:", effectiveDealerId, "(GHL Mode:", !!urlLocationId, ")");

    // 1. Listen to Vehicles
    const vehRef = collection(db, "Dealers", effectiveDealerId, "vehiculos");

    const unsubscribeVehicles = onSnapshot(vehRef, (snapshot) => {
      let vehiclesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // FILTRADO ESTRICTO EN MEMORIA: Permite la transición de datos antiguos
      if (urlLocationId) {
        // Mostramos si coincide el ID OR si no tiene tag (pendiente de reparación)
        vehiclesData = vehiclesData.filter(v =>
          v.ghlLocationId === urlLocationId || !v.ghlLocationId
        );
      }

      setInventory(vehiclesData);

      // Auto-limpieza de basura (>15 días)
      const now = new Date();
      vehiclesData.forEach(async (v) => {
        if (v.status === 'trash' && v.deletedAt) {
          const deleteDate = new Date(v.deletedAt);
          if ((now - deleteDate) / (1000 * 60 * 60 * 24) > 15) {
            await deleteDoc(doc(db, "Dealers", effectiveDealerId, "vehiculos", v.id));
          }
        }
      });
    });

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
      unsubscribeVehicles();
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


  // 3. GUARDAR (Crear o Editar en Firebase)
  const handleSaveVehicle = async (vehicleData) => {
    if (!effectiveDealerId) {
      console.error("No effectiveDealerId available");
      showToast("Error: No se encontró el ID del Dealer. Reintenta loguear.", "error");
      return;
    }
    const existingId = vehicleData.id;
    try {
      if (existingId) {
        const vehicleRef = doc(db, "Dealers", effectiveDealerId, "vehiculos", existingId);
        const { id: _removedId, ...dataToUpdate } = vehicleData;

        // Usamos setDoc con merge: true para que funcione tanto para actualizar como para crear si el ID es manual (ej: cotizaciones)
        await setDoc(vehicleRef, {
          ...dataToUpdate,
          ghlLocationId: urlLocationId || dataToUpdate.ghlLocationId || shadowProfile?.ghlLocationId || '',
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // CASCADED DELETION: Si el vehículo vuelve a Disponible o se Vende, borrar cotizaciones
        if (!vehicleData.parentVehicleId && (vehicleData.status === 'available' || vehicleData.status === 'sold')) {
          try {
            const vehRef = collection(db, "Dealers", effectiveDealerId, "vehiculos");
            const q = query(vehRef, where("parentVehicleId", "==", existingId));
            const quoteSnapshot = await getDocs(q);
            const deletePromises = quoteSnapshot.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);
            if (deletePromises.length > 0) {
              console.log(`🗑️ Eliminadas ${deletePromises.length} cotizaciones asociadas a ${existingId}`);
            }
          } catch (e) {
            console.error("Error deleting linked quotes:", e);
          }
        }

        showToast("Vehículo actualizado con éxito");
      } else {
        // Generate Custom ID: YEAR-MAKE-MODEL-COLOR-LAST4VIN
        const year = (vehicleData.year || '0000').toString();
        const make = (vehicleData.make || 'UNKNOWN').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const model = (vehicleData.model || 'UNKNOWN').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const color = (vehicleData.color || 'UNKNOWN').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const vin = (vehicleData.vin || '0000').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const last4Vin = vin.slice(-4);

        // Fallback for empty strings after cleanup
        const cleanMake = make || 'UNKNOWN';
        const cleanModel = model || 'UNKNOWN';
        const cleanColor = color || 'UNKNOWN';

        const customId = `${year}-${cleanMake}-${cleanModel}-${cleanColor}-${last4Vin}`;

        const newVehicle = {
          ...vehicleData,
          id: customId,
          createdAt: new Date().toISOString(),
          status: vehicleData.status || 'available',
          ghlLocationId: urlLocationId || shadowProfile?.ghlLocationId || ''
        };

        // Use setDoc with the custom ID
        await setDoc(doc(db, "Dealers", effectiveDealerId, "vehiculos", customId), newVehicle);
        showToast("Vehículo guardado con éxito");
      }
    } catch (error) {
      console.error("Error al guardar:", error);
      showToast("Error al guardar en el Dealer", "error");
    }
  };

  const handleDeleteVehicle = async (id) => {
    if (!userProfile?.dealerId) return;
    try {
      const vehicleRef = doc(db, "Dealers", effectiveDealerId, "vehiculos", id);

      // Check if this is a quote entry (child vehicle)
      const currentItem = activeInventory.find(v => v.id === id);
      const isQuote = currentItem?.status === 'quoted' && currentItem?.parentVehicleId;

      if (isQuote) {
        const parentId = currentItem.parentVehicleId;

        // 1. Permanently DELETE the specific quote entry (child vehicle)
        await deleteDoc(vehicleRef);

        // 2. Check if there are any REMAINING quotes for this parent
        const remainingQuotes = activeInventory.filter(v => v.parentVehicleId === parentId && v.id !== id);

        if (remainingQuotes.length === 0) {
          // No more quotes? Restore Parent Vehicle to 'available'
          const parentRef = doc(db, "Dealers", effectiveDealerId, "vehiculos", parentId);
          await updateDoc(parentRef, { status: 'available', updatedAt: new Date().toISOString() });
          showToast("Cotización eliminada y vehículo restaurado a disponible");
        } else {
          showToast("Cotización eliminada (otras cotizaciones activas)");
        }
      } else {
        // Standard behavior for Main Vehicles: move to trash
        await updateDoc(vehicleRef, {
          status: 'trash',
          deletedAt: new Date().toISOString()
        });

        // Cascaded deletion of all associated quotes
        const vehRef = collection(db, "Dealers", effectiveDealerId, "vehiculos");
        const q = query(vehRef, where("parentVehicleId", "==", id));
        const quoteSnapshot = await getDocs(q);
        const deletePromises = quoteSnapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);

        showToast("Vehículo movido a la papelera");
      }
    } catch (error) {
      console.error(error);
      showToast("Error en la operación de eliminación", "error");
    }
  };

  const handleRestoreVehicle = async (id) => {
    if (!userProfile?.dealerId) return;
    try {
      const vehicleRef = doc(db, "Dealers", effectiveDealerId, "vehiculos", id);
      await updateDoc(vehicleRef, {
        status: 'available',
        deletedAt: null
      });
      showToast("Vehículo restaurado");
    } catch (e) {
      showToast("Error al restaurar", "error");
    }
  };

  const handlePermanentDelete = (id, force = false) => {
    if (!userProfile?.dealerId) return;

    const doDelete = async () => {
      try {
        await deleteDoc(doc(db, "Dealers", effectiveDealerId, "vehiculos", id));
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
          for (const item of trashItems) {
            await deleteDoc(doc(db, "Dealers", effectiveDealerId, "vehiculos", item.id));
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
    if (!userProfile?.dealerId || !effectiveDealerId) return;
    try {
      // 1. Clean data
      const cleanQuoteData = Object.fromEntries(
        Object.entries(quoteData).filter(([_, v]) => v !== undefined)
      );

      const vId = cleanQuoteData.vehicleId || (selectedVehicle?.id);
      if (!vId) throw new Error("No vehicle ID provided for quote");

      const vehicleObj = inventory.find(v => v.id === vId);
      const vName = cleanQuoteData.vehicle || (vehicleObj ? `${vehicleObj.make} ${vehicleObj.model}` : 'Vehículo');

      // 2. Generate Custom ID for the Document
      const clientClean = `${quoteData.name || ''} ${quoteData.lastname || ''}`.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_');
      const make = (vehicleObj?.make || 'MARCA').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const model = (vehicleObj?.model || 'MODELO').toUpperCase().replace(/[^A-Z0-9]/g, '');
      const last4Vin = (vehicleObj?.vin || '0000').slice(-4);
      const customDocId = `Cotizacion_${clientClean}_${make}_${model}_${last4Vin}`;

      const newQuoteDoc = {
        ...cleanQuoteData,
        id: customDocId,
        vehicleId: vId,
        vehicle: vName,
        type: 'quote',
        createdAt: new Date().toISOString()
      };

      // 3. Save to 'documentos/cotizaciones'
      await setDoc(doc(db, "Dealers", effectiveDealerId, "documentos", "cotizaciones", "items", customDocId), newQuoteDoc);

      // 4. Update Original Vehicle and Create/Update Linked Quote Entry in inventory
      const originalId = vehicleObj?.parentVehicleId || vId;
      const originalVehicle = inventory.find(v => v.id === originalId);

      if (originalVehicle) {
        // Update original to 'quoted'
        await updateDoc(doc(db, "Dealers", effectiveDealerId, "vehiculos", originalId), {
          status: 'quoted',
          updatedAt: new Date().toISOString()
        });

        // If we were editing an existing quote entry, use its ID. Otherwise, create a new one.
        const quoteInventoryId = vehicleObj?.parentVehicleId ? vehicleObj.id : `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const quoteInventoryEntry = {
          ...originalVehicle,
          id: quoteInventoryId,
          parentVehicleId: originalId,
          status: 'quoted',
          name: quoteData.name || '',
          lastname: quoteData.lastname || '',
          phone: quoteData.phone || '',
          cedula: quoteData.cedula || '',
          bank: quoteData.bank || quoteData.bankName || '',
          price_quoted: Number(quoteData.price) || originalVehicle.price_dop || originalVehicle.price || 0,
          initial_quoted: Number(quoteData.initial || quoteData.downPayment) || 0,
          createdAt: vehicleObj?.parentVehicleId ? (vehicleObj.createdAt || new Date().toISOString()) : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Clean and save to 'vehiculos'
        const cleanInvEntry = Object.fromEntries(
          Object.entries(quoteInventoryEntry).filter(([_, v]) => v !== undefined)
        );
        await setDoc(doc(db, "Dealers", effectiveDealerId, "vehiculos", quoteInventoryId), cleanInvEntry);
      }

      showToast("¡Cotización procesada con éxito!");

      requestConfirmation({
        title: 'Cotización Completada',
        message: `La cotización para ${quoteData.name} ha sido guardada en documentos y vinculada al inventario.`,
        onConfirm: () => { },
        confirmText: 'Entendido',
        cancelText: null
      });

    } catch (err) {
      console.error("Error processing quote:", err);
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
          const vehicleInInv = activeInventory.find(v => v.id === contractData.vehicleId);
          const targetId = (vehicleInInv && vehicleInInv.parentVehicleId) ? vehicleInInv.parentVehicleId : contractData.vehicleId;
          firstVehicleId = targetId;

          const vehicleObj = vehicleInInv;
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
      const hasContract = contractsArray.some(c => (c.category === 'contract' || !c.category) && c.templateType !== 'COTIZACIÓN');
      if (firstVehicleId) {
        const vehicleRef = doc(db, "Dealers", effectiveDealerId, "vehiculos", firstVehicleId);
        const newStatus = hasContract ? 'sold' : 'quoted';

        const updateData = {
          status: newStatus,
          updatedAt: new Date().toISOString()
        };

        if (hasContract) {
          // Si hay contrato, guardamos los datos del primero que sea contrato
          const firstContract = contractsArray.find(c => (c.category === 'contract' || !c.category) && c.templateType !== 'COTIZACIÓN');
          if (firstContract) {
            updateData.soldToName = firstContract.client || '';
            updateData.soldToCedula = firstContract.cedula || firstContract.clientCedula || '';
            updateData.soldToPhone = firstContract.phone || firstContract.clientPhone || '';
            updateData.soldPrice = firstContract.price || firstContract.precio || 0;
          }
        }

        await updateDoc(vehicleRef, updateData);
      }

      showToast(`${generatedCount} documentos generados con éxito`);

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
          // Si estamos vendiendo desde una cotización, el vehicleId podría ser el ID de la cotización
          // Intentamos encontrar el vehículo en el inventario para ver si tiene un parentVehicleId
          // Buscamos en todo el inventario (incluyendo filtrados)
          const vehicleInInv = (inventory || []).find(v => v.id === contractData.vehicleId);
          const targetId = (vehicleInInv && vehicleInInv.parentVehicleId) ? vehicleInInv.parentVehicleId : contractData.vehicleId;

          const vehicleRef = doc(db, "Dealers", effectiveDealerId, "vehiculos", targetId);
          await updateDoc(vehicleRef, {
            status: 'sold',
            updatedAt: new Date().toISOString(),
            soldToName: data.client || '',
            soldToCedula: data.cedula || data.clientCedula || '',
            soldToPhone: data.phone || data.clientPhone || '',
            soldPrice: data.price || data.precio || 0
          });

          // CASCADED DELETION: Borrar todas las cotizaciones del vehículo vendido
          try {
            const vehRef = collection(db, "Dealers", effectiveDealerId, "vehiculos");
            const q = query(vehRef, where("parentVehicleId", "==", targetId));
            const quoteSnapshot = await getDocs(q);
            // Permanently delete ALL child quotes
            const deletePromises = quoteSnapshot.docs.map(d => deleteDoc(d.ref));
            await Promise.all(deletePromises);
            console.log(`✅ ${deletePromises.length} cotizaciones asociadas eliminadas tras venta.`);
          } catch (e) {
            console.error("Error cleaning quotes after sale:", e);
          }
        }
        showToast("Contrato generado");
      }
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
        category: data.category || 'contract',
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
            // DO NOT NULLIFY selectedVehicle here to stay on the view
          }}
        />
      );
    }
    switch (activeTab) {
      case 'settings': return <SettingsViewFixed userProfile={shadowProfile} onLogout={handleLogout} onUpdateProfile={handleUpdateProfile} showToast={showToast} />;
      case 'dashboard': return <DashboardView inventory={activeInventory} contracts={contracts || []} quotes={quotes || []} onNavigate={handleNavigate} userProfile={shadowProfile} />;
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

  // Si no hay login NI contexto de URL, pedimos login
  if (!isLoggedIn && !shadowProfile) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} />
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

const SettingsViewFixed = ({ userProfile, onLogout, onUpdateProfile, showToast }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    jobTitle: userProfile?.jobTitle || 'Vendedor'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setFormData(prev => ({
        ...prev,
        name: userProfile.name || '',
        jobTitle: userProfile.jobTitle || 'Vendedor'
      }));
    }
  }, [userProfile]);

  const handleSave = async () => {
    setIsLoading(true);
    await onUpdateProfile(formData);
    setIsEditing(false);
    setIsLoading(false);
  };

  const handleCopyLink = () => {
    if (!userProfile?.dealerId) return;
    const link = `https://inventarioia-gzhz2ynksa-uc.a.run.app/?dealer=${encodeURIComponent(userProfile.dealerId)}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 sm:pb-0 pt-6">
      <div className="max-w-5xl mx-auto">
        <div className="rounded-[32px] shadow-2xl bg-white overflow-hidden flex flex-col md:flex-row min-h-[500px]">

          {/* LEFT: Profile Sidebar (Neutral/Dark) */}
          <div className="w-full md:w-80 bg-neutral-900 relative p-8 flex flex-col items-center text-center text-white shrink-0">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-red-600 rounded-full blur-[80px] opacity-20 -mr-10 -mt-10"></div>

            <div className="relative z-10 w-full flex flex-col items-center h-full">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-black text-6xl border-[6px] border-neutral-800 shadow-2xl mb-4 group hover:scale-105 transition-transform duration-300">
                {userProfile?.name?.charAt(0) || 'U'}
              </div>

              <h2 className="text-2xl font-black tracking-tight mb-1">{userProfile?.name || 'Usuario'}</h2>
              <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-8 bg-neutral-800/50 px-3 py-1 rounded-full">{userProfile?.jobTitle || 'Vendedor'}</p>

              <div className="w-full bg-neutral-800/30 rounded-2xl p-5 mb-auto border border-neutral-700/30 backdrop-blur-sm">
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-neutral-700/50">
                  <div className="p-2 bg-neutral-700/50 rounded-lg"><Building2 size={18} className="text-red-500" /></div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">Dealer</p>
                    <p className="text-sm font-bold text-neutral-100">{userProfile?.dealerName || 'Dealer'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-neutral-700/50 rounded-lg"><User size={18} className="text-red-500" /></div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-neutral-500 uppercase tracking-wider">Nombre de Usuario</p>
                    <p className="text-xs font-bold text-neutral-400 break-all">{userProfile?.name || '...'}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 border-t border-neutral-700/50 mt-4 pt-4">
                  <button
                    onClick={handleCopyLink}
                    className={`w-full py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 ${copied ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-red-600/10 border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-600 group/link'}`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} className="group-hover/link:animate-pulse" />}
                    {copied ? '¡Copiado!' : 'Link Bot GHL'}
                  </button>
                  <button
                    onClick={() => {
                      if (!userProfile?.dealerId) return;
                      const link = `https://inventarioia-gzhz2ynksa-uc.a.run.app/catalogo?dealerID=${encodeURIComponent(userProfile.dealerId)}`;
                      navigator.clipboard.writeText(link);
                      showToast("Link del Catálogo copiado!");
                    }}
                    className="w-full py-2.5 rounded-2xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 bg-white/5 border-white/10 text-white hover:bg-white hover:text-neutral-900 hover:border-white group/catalog"
                  >
                    <Share2 size={14} className="group-hover/catalog:rotate-12 transition-transform" />
                    Catálogo Público
                  </button>
                </div>
              </div>

              <div className="w-full mt-6 space-y-3">
                <button onClick={onLogout} className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-red-900/20 flex items-center justify-center gap-2 group active:scale-95">
                  <LogOut size={18} /> <span className="text-xs uppercase tracking-widest">Cerrar Sesión</span>
                </button>
                <p className="text-[10px] text-neutral-600 font-medium">CarBot System v3.0</p>
              </div>
            </div>
          </div>

          {/* RIGHT: Settings Form (White) */}
          <div className="flex-1 p-8 md:p-12 bg-white flex flex-col">
            <div className="flex justify-between items-center mb-10 border-b border-gray-100 pb-6">
              <div>
                <h2 className="text-2xl font-black text-neutral-900 flex items-center gap-2">
                  <Settings size={24} className="text-red-600" /> Configuración
                </h2>
                <p className="text-neutral-400 text-sm mt-1 font-medium">Gestiona tu información personal</p>
              </div>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 text-xs font-black text-neutral-500 hover:text-red-600 transition-colors uppercase tracking-wider bg-neutral-50 hover:bg-red-50 px-4 py-2 rounded-2xl active:scale-95">
                  <Edit size={14} /> Editar
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                    className={`w-full pl-4 pr-4 py-3.5 rounded-xl text-sm font-bold transition-all ${isEditing ? 'bg-white border-2 border-neutral-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' : 'bg-neutral-50 border-2 border-transparent text-neutral-500'}`}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Select
                  label="Puesto / Cargo"
                  value={formData.jobTitle}
                  options={['CEO', 'Vendedor']}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div className="space-y-2 opacity-60">
                <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest ml-1">Email (Solo Lectura) <Lock size={10} className="inline ml-1 mb-0.5" /></label>
                <input type="text" value={userProfile?.email || ''} disabled className="w-full px-4 py-3.5 rounded-xl text-sm font-bold bg-neutral-100 border-2 border-transparent text-neutral-400 cursor-not-allowed" />
              </div>
              <div className="space-y-2 opacity-60">
                <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest ml-1">Dealer Asociado <Lock size={10} className="inline ml-1 mb-0.5" /></label>
                <input type="text" value={userProfile?.dealerName || ''} disabled className="w-full px-4 py-3.5 rounded-xl text-sm font-bold bg-neutral-100 border-2 border-transparent text-neutral-400 cursor-not-allowed" />
              </div>

            </div>

            {isEditing && (
              <div className="flex gap-4 mt-auto pt-8 border-t border-gray-100 justify-end animate-in fade-in slide-in-from-bottom-2">
                <button onClick={() => { setIsEditing(false); }} className="px-6 py-3 bg-white border-2 border-neutral-100 text-neutral-500 font-black rounded-2xl hover:bg-neutral-50 text-xs uppercase tracking-wide active:scale-95 transition-all">Cancelar</button>
                <button onClick={handleSave} disabled={isLoading} className="px-8 py-3 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-xl shadow-red-600/30 text-xs uppercase tracking-wide flex items-center gap-2 active:scale-95 transition-all">
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Guardar Cambios
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

