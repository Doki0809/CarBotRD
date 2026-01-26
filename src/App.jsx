import React, { useState, useEffect, useMemo, useRef } from 'react';
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

import {
  LayoutDashboard, Car, FileText, LogOut, Plus, Search, Edit, Trash2,
  DollarSign, CheckCircle, X, Menu, User, Send, Loader2, FilePlus,
  CreditCard, FileSignature, Files, Fuel, Settings, IdCard, Trash, Undo, Printer, Eye, Download,
  PlusCircle, Box, ArrowUpRight, Building2, Fingerprint, Lock, EyeOff, Share2, Check, ArrowRight, Key, Copy,
  AlertTriangle, TrendingUp, History, Bell, Calendar, Briefcase, Inbox, Headset, Sparkles, Camera,
  ChevronLeft, ChevronRight, Save, ChevronDown, MoreVertical
} from 'lucide-react';
import VehicleEditView from './VehicleEditView';

// Importar html2pdf.js de forma dinámica para evitar problemas de SSR si fuera necesario, 
// o directamente ya que es una SPA de Vite.
// import html2pdf from 'html2pdf.js';

/**
 * CARBOT - B2B SaaS para Dealers
 * VERSIÓN: ONLINE (FIREBASE)
 */

// MOCK_USER ELIMINADO
// INITIAL_CONTRACTS ELIMINADO

const CONTRACT_TEMPLATES = [
  { id: 't1', name: 'Venta al Contado', icon: DollarSign, desc: 'Contrato estándar de compraventa.' },
  { id: 't2', name: 'Financiamiento', icon: CreditCard, desc: 'Acuerdo con plan de pagos y garantías.' },
  { id: 't3', name: 'Carta de Ruta', icon: FileSignature, desc: 'Permiso provisional de circulación.' },
];

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
    <div className={`${hasBg ? '' : 'bg-white'} rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden transition-all duration-300 ${className}`}>
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
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.sold}`}>
      {labels[status] || status}
    </span>
  );
};

const Input = ({ label, className = "", type = "text", ...props }) => (
  <div className="mb-4 group">
    {label && (
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-600">
        {label}
      </label>
    )}
    <input
      type={type}
      className={`w-full px-4 py-3 bg-slate-50 border-2 border-slate-50 rounded-2xl text-slate-900 font-bold text-sm focus:outline-none focus:bg-white focus:border-red-500/20 focus:ring-4 focus:ring-red-500/5 transition-all outline-none ${className}`}
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
    <div className="mb-4 group relative" ref={dropdownRef}>
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 ml-1 transition-colors group-focus-within:text-red-600">
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
                    }`}
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
    <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-xl shadow-2xl transform transition-all duration-500 animate-in slide-in-from-top-5 fade-in ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>
      <CheckCircle size={20} className="mr-3" />
      <span className="font-medium tracking-wide">{message}</span>
    </div>
  );
};

const AppLogo = ({ className, size = 32, invert = false }) => {
  const [hasError, setHasError] = useState(false);
  if (hasError) return <div className={`flex items-center justify-center ${invert ? 'text-white' : 'text-red-600'} ${className}`}><Car size={size} /></div>;
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
      alert(`Límite excedido. Máximo 10 fotos.`);
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

        const folderName = `${year} ${make} ${model} ${color} ${last4Vin}`.trim();
        const baseStoragePath = `dealer-${cleanDealerName}/Marcas/${folderName}`;

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
                <Input name="make" label="Marca" defaultValue={initialData?.make} placeholder="Ej. Toyota" required disabled={isLocked} />
                <Input name="model" label="Modelo" defaultValue={initialData?.model} placeholder="Ej. Camry" required disabled={isLocked} />
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
      </div >
    </div >
  );
};

const QuoteModal = ({ isOpen, onClose, vehicle, onConfirm, userProfile }) => {
  const [loading, setLoading] = useState(false);
  const [bankName, setBankName] = useState('');
  const [cedula, setCedula] = useState('');
  const [price, setPrice] = useState(vehicle?.price || '');

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
      vehicle: `${vehicle.make} ${vehicle.model} ${vehicle.year}`
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

const GenerateQuoteModal = ({ isOpen, onClose, inventory, onSave }) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [phone, setPhone] = useState('');
  const [cedula, setCedula] = useState('');
  const [bank, setBank] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);

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

  if (!isOpen) return null;

  const availableVehicles = inventory.filter(v => v.status !== 'sold');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedVehicleId) return;
    setLoading(true);
    const vehicle = inventory.find(v => v.id === selectedVehicleId);

    setTimeout(() => {
      onSave({
        name,
        lastname,
        phone,
        cedula,
        bank,
        price, // Enviar precio
        vehicle: `${vehicle.make} ${vehicle.model}`,
        vehicleId: vehicle.id
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

const GenerateContractModal = ({ isOpen, onClose, inventory, onGenerate, initialVehicle }) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState(initialVehicle ? initialVehicle.vehicleId || initialVehicle.id : '');
  const [clientName, setClientName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientCedula, setClientCedula] = useState('');
  const [finalPrice, setFinalPrice] = useState(''); // Estado para precio final
  const [downPayment, setDownPayment] = useState(''); // Estado para el inicial
  const [loading, setLoading] = useState(false);

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

      const template = CONTRACT_TEMPLATES.find(t => t.name === initialVehicle.template);
      if (template) setSelectedTemplate(template.id);
    } else {
      setSelectedTemplate('');
      setSelectedVehicleId('');
      setClientName('');
      setClientLastName('');
      setClientCedula('');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTemplate || !selectedVehicleId) return;
    setLoading(true);
    const vehicle = inventory.find(v => v.id === selectedVehicleId); // Firebase IDs son strings, quitamos parseInt
    const template = CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate);
    setTimeout(() => {
      onGenerate({
        id: initialVehicle?.contractId || undefined, // Pass ID if editing
        client: `${clientName} ${clientLastName}`,
        cedula: clientCedula,
        vehicle: `${vehicle.make} ${vehicle.model}`,
        vehicleId: vehicle.id,
        price: finalPrice || (vehicle.price_dop > 0 ? vehicle.price_dop : vehicle.price), // Use manual final price or vehicle default
        downPayment: downPayment, // Pass down payment
        template: template.name,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        ghl_id: `ghl_${Math.floor(Math.random() * 1000)}`,
        vin: vehicle.vin
      });
      setLoading(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full h-full sm:h-auto sm:max-w-2xl animate-in zoom-in-95 duration-200">
        <Card className="h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto rounded-none sm:rounded-[24px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800 flex items-center">
              <div className="p-2 bg-red-50 rounded-lg mr-3"><FilePlus size={20} className="text-red-600" /></div>
              Generar Nuevo Contrato
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">1. Selecciona el Vehículo</label>
              <select className="w-full px-3 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} required>
                <option value="">-- Seleccionar vehículo disponible --</option>
                {availableVehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year}) - {v.price_dop > 0 ? `RD$ ${v.price_dop.toLocaleString()}` : `US$ ${v.price.toLocaleString()}`}</option>
                ))}
              </select>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><User size={16} /> 2. Datos del Cliente</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nombre" placeholder="Ej. Juan" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
                <Input label="Apellido" placeholder="Ej. Pérez" value={clientLastName} onChange={(e) => setClientLastName(e.target.value)} required />
              </div>
              <Input label="Cédula / Pasaporte" placeholder="001-0000000-0" value={clientCedula} onChange={(e) => setClientCedula(e.target.value)} required />
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><DollarSign size={16} /> 3. Términos Financieros</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Precio Final de Venta" type="number" placeholder="Ej. 850000" value={finalPrice} onChange={(e) => setFinalPrice(e.target.value)} required />
                <Input label="Inicial / Avance" type="number" placeholder="Ej. 150000" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">4. Elige una Plantilla</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CONTRACT_TEMPLATES.map(template => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate === template.id;
                  return (
                    <div key={template.id} onClick={() => setSelectedTemplate(template.id)} className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 relative overflow-hidden ${isSelected ? 'border-red-600 bg-red-50 shadow-md' : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-300'}`}>
                      {isSelected && <div className="absolute top-2 right-2 text-red-600"><CheckCircle size={16} fill="currentColor" className="text-white" /></div>}
                      <Icon className={`mb-3 ${isSelected ? 'text-red-600' : 'text-gray-400'}`} size={24} />
                      <h4 className={`font-bold text-sm ${isSelected ? 'text-red-700' : 'text-gray-700'}`}>{template.name}</h4>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="ghost" onClick={onClose} type="button" disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading || !selectedTemplate || !selectedVehicleId} className="bg-red-600 text-white hover:bg-red-700">
                {loading ? <><Loader2 className="animate-spin mr-2" size={18} /> Generando...</> : 'Generar y Guardar'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

const ContractPreviewModal = ({ isOpen, onClose, contract, userProfile }) => {
  if (!isOpen || !contract) return null;

  const getContractHtml = (isPreview = false) => `
    <div id="contract-content" style="
      font-family: 'Times New Roman', serif; 
      padding: 0; 
      line-height: 1.6; 
      color: #000; 
      background: white;
      ${isPreview ? 'width: 100%; max-width: 210mm;' : 'width: 210mm; min-height: 297mm;'}
      margin: 0 auto;
      box-sizing: border-box;
      position: relative;
      box-shadow: ${isPreview ? '0 0 20px rgba(0,0,0,0.1)' : 'none'};
    ">
      <div id="contract-body" style="padding: 15mm 20mm;">
        <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px;">
          <h1 style="margin: 0; color: #1a202c; font-size: 28px;">${userProfile.dealerName}</h1>
          <p style="margin: 5px 0; color: #4a5568; font-size: 14px;">RNC: 1-0000000-1 | Tel: 809-555-5555</p>
          <p style="margin: 0; color: #718096; font-size: 12px; font-style: italic;">Calidad y Confianza sobre Ruedas</p>
        </div>
        
        <h1 style="text-align: center; font-size: 20px; margin-bottom: 30px; text-transform: uppercase; text-decoration: underline;">${(contract.template || 'Documento').toUpperCase()}</h1>
        
        <p style="margin-bottom: 20px; text-align: justify;">En la ciudad de Punta Cana, Provincia La Altagracia, República Dominicana, a los <strong>${contract.date ? new Date(contract.date).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }) : new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>
        
        <p style="margin-bottom: 25px; text-align: justify;">
          <strong>DE UNA PARTE:</strong> El señor(a) <strong>${userProfile.name}</strong>, de nacionalidad Dominicana, mayor de edad, actuando en nombre y representación legal de la empresa <strong>${userProfile.dealerName}</strong> (en lo adelante denominado como <strong>EL VENDEDOR</strong>).
          <br/><br/>
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
        
        <div style="margin-top: 40px; text-align: center; color: #cbd5e0; font-size: 10px; font-family: sans-serif;">
            Documento generado digitalmente por CarBot RD - ID: ${contract.id.slice(0, 8)}
        </div>
      </div>
    </div>
  `;

  const handleDownloadPDF = async () => {
    const element = document.createElement('div');
    element.innerHTML = getContractHtml(false);
    document.body.appendChild(element);

    const opt = {
      margin: 0,
      // Use contract ID if it adheres to the new format, or fallback to generated name
      filename: contract.id && contract.id.startsWith('Contrato_') ? `${contract.id}.pdf` : `Contrato_${contract.client.replace(/\s+/g, '_')}_${contract.id.slice(0, 5)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf().set(opt).from(element).save().then(() => {
      document.body.removeChild(element);
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Contrato</title>
          <style>@page { size: A4; margin: 0; }</style>
        </head>
        <body style="margin: 0;">${getContractHtml()}</body>
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
              <FileText size={18} className="text-red-600 sm:w-5 sm:h-5" /> <span className="truncate max-w-[200px]">Contrato: {contract.client}</span>
            </h3>
            <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>

          <div className="flex-1 bg-slate-200/50 p-2 sm:p-6 overflow-hidden border-b border-slate-200 sm:border sm:rounded-2xl sm:mx-4 sm:mb-4 shadow-inner relative">
            <iframe
              srcDoc={`
                <!DOCTYPE html>
                <html>
                  <head>
                    <style>
                      html { min-height: 100%; }
                      body { 
                        margin: 0; 
                        padding: 40px; 
                        background: #cbd5e1; 
                        font-family: sans-serif;
                      }
                      * { box-sizing: border-box; }
                      ::-webkit-scrollbar { width: 8px; }
                      ::-webkit-scrollbar-track { background: #f1f1f1; }
                      ::-webkit-scrollbar-thumb { background: #888; border-radius: 10px; }
                      ::-webkit-scrollbar-thumb:hover { background: #555; }
                      
                      /* MOBILE OPTIMIZATION */
                      @media (max-width: 640px) {
                        html, body { height: 100%; margin: 0; padding: 0; }
                        body { padding: 0 !important; background: #fff; display: block; overflow-y: auto; } 
                        #contract-content { box-shadow: none !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; }
                        #contract-body { padding: 20px !important; }
                        h1 { font-size: 20px !important; } 
                        p, td, li { font-size: 14px !important; }
                      }
                    </style>
                  </head>
                  <body>
                    ${getContractHtml(true)}
                  </body>
                </html>
              `}
              className="w-full h-full border-none rounded-none sm:rounded-sm min-h-0 block"
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

  const getQuoteHtml = (isPreview = false) => `
    <div id="quote-content" style="
      font-family: 'Helvetica', 'Arial', sans-serif; 
      padding: 0; 
      line-height: 1.6; 
      color: #334155; 
      background: white;
      ${isPreview ? 'width: 100%; max-width: 210mm;' : 'width: 210mm; min-height: 297mm;'}
      margin: 0 auto;
      box-sizing: border-box;
      position: relative;
      box-shadow: ${isPreview ? '0 0 20px rgba(0,0,0,0.1)' : 'none'};
    ">
      <div id="contract-body" style="padding: 15mm 20mm;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 4px solid #b91c1c; padding-bottom: 20px;">
              <div>
                <h1 style="font-size: 28px; margin: 0; color: #0f172a; font-weight: 800;">${userProfile.dealerName}</h1>
                <p style="margin: 5px 0; color: #64748b; font-size: 14px;">Ficha de Cotización de Vehículo</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-weight: bold; color: #b91c1c;">FOLIO: Q-${quote.id?.slice(-6).toUpperCase() || 'TEMP'}</p>
                <p style="margin: 5px 0 0; font-size: 12px;">${new Date(quote.createdAt).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
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
                ` : ''}
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
            <p>Esta es una ficha de cotización informativa generada por Carbot para ${userProfile.dealerName}.<br/>
            Los precios y la disponibilidad están sujetos a cambios sin previo aviso.</p>
          </div>
      </div>
    </div>
  `;

  const handleDownloadPDF = async () => {
    const element = document.createElement('div');
    element.innerHTML = getQuoteHtml(false);
    document.body.appendChild(element);

    const opt = {
      margin: 0,
      // Use quote ID if it adheres to the new format, or fallback to generated name
      filename: quote.id && quote.id.startsWith('Cotizacion_') ? `${quote.id}.pdf` : `Cotizacion_${quote.name}_${quote.lastname}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf().set(opt).from(element).save().then(() => {
      document.body.removeChild(element);
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir Cotización</title>
          <style>@page { size: A4; margin: 0; }</style>
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
      <div className="w-full max-w-4xl h-[90vh] animate-in zoom-in-95 duration-200 flex flex-col">
        <Card className="flex flex-col h-full bg-slate-50">
          <div className="flex justify-between items-center mb-4 p-4 border-b bg-white rounded-t-xl shrink-0">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Send size={20} className="text-red-600" /> Cotización: ${quote.name} ${quote.lastname}
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>

          <div className="flex-1 bg-slate-200/50 p-6 overflow-y-auto border border-slate-200 rounded-2xl mx-4 mb-4 shadow-inner">
            <iframe
              srcDoc={`
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body {margin: 0; padding: 20px; background: #cbd5e1; display: flex; justify-content: center; }
                * {box - sizing: border-box; }
                ::-webkit-scrollbar {width: 8px; }
                ::-webkit-scrollbar-track {background: #f1f1f1; }
                ::-webkit-scrollbar-thumb {background: #888; border-radius: 10px; }
                ::-webkit-scrollbar-thumb:hover {background: #555; }
              </style>
            </head>
            <body>
              ${getQuoteHtml(true)}
            </body>
          </html>
              `}
              className="w-full h-full border-none rounded-sm min-h-[800px]"
              title="Vista Previa de la Cotización"
            />
          </div>

          <div className="flex justify-end gap-3 p-4 bg-white border-t rounded-b-xl shrink-0">
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
            <Button variant="secondary" onClick={handleDownloadPDF} icon={Download} className="border-slate-300">Descargar (PDF)</Button>
            <Button onClick={handlePrint} icon={Printer}>Imprimir</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};


// --- VISTAS PRINCIPALES ---

const TrashView = ({ trash, onRestore, onPermanentDelete, onEmptyTrash }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div><h1 className="text-3xl font-bold text-slate-900">Papelera de Reciclaje</h1><p className="text-slate-500 text-sm mt-1">Los ítems se eliminan permanentemente después de 15 días.</p></div>
        {trash.length > 0 && (
          <Button variant="danger" icon={Trash2} onClick={onEmptyTrash} className="bg-red-100 text-red-700 hover:bg-red-200 hover:text-red-800 border-transparent shadow-none">Vaciar Papelera</Button>
        )}
      </div>

      {trash.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-gray-200">
          <Trash2 size={48} className="mb-4 text-slate-300" /><p className="text-lg font-medium">La papelera está vacía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {trash.map(item => (
            <div key={item.id} className="relative group opacity-80 hover:opacity-100 transition-opacity">
              <Card noPadding className="flex flex-col h-full border-red-100 bg-red-50/30 hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                <div className="relative aspect-[16/10] bg-gray-200 overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                  <img src={item.image} alt={item.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-red-900/10 mix-blend-multiply"></div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-slate-800 text-lg line-through decoration-red-500/50">{item.make} {item.model}</h3>
                  <p className="text-xs font-semibold text-red-400 mb-4">Eliminado: {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'Hoy'}</p>
                  <div className="mt-auto grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={() => onRestore(item.id)} className="w-full text-xs font-bold border-green-200 text-green-700 hover:bg-green-50 flex items-center justify-center gap-1 active:scale-95 hover:scale-[1.02] transition-all"><Undo size={14} /> RESTAURAR</Button>
                    <Button variant="secondary" onClick={() => onPermanentDelete(item.id)} className="w-full text-xs font-bold border-red-200 text-red-700 hover:bg-red-50 flex items-center justify-center gap-1 active:scale-95 hover:scale-[1.02] transition-all"><X size={14} /> BORRAR</Button>
                  </div>
                </div>
              </Card>
            </div>
          ))}
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
                  className={`w-full px-4 py-3 rounded-xl font-bold transition-all ${isEditing ? 'bg-white border-2 border-slate-200 focus:border-red-500' : 'bg-slate-50 border-2 border-transparent text-slate-500'}`}
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
                  className={`w-full px-4 py-3 rounded-xl font-bold transition-all ${isEditing ? 'bg-white border-2 border-slate-200 focus:border-red-500' : 'bg-slate-50 border-2 border-transparent text-slate-500'}`}
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

const DashboardView = ({ inventory, contracts, onNavigate, userProfile }) => {
  // Stats Calculations
  const availableInventory = inventory.filter(i => i.status === 'available' || i.status === 'quoted');
  const soldInventory = inventory.filter(i => i.status === 'sold');

  const activeInventory = (inventory || []).filter(i => i && i.status !== 'trash');
  const totalValueRD = activeInventory.reduce((acc, item) => acc + (item.price_dop || 0), 0);
  const totalValueUSD = activeInventory.reduce((acc, item) => acc + (item.price || 0), 0);

  const recentContracts = contracts.slice(0, 5);

  // Prioritize URL parameters for display to ensure immediate feedback in GHL
  const params = new URLSearchParams(window.location.search);
  const rawDealerName = params.get('location_name') || userProfile?.dealerName || 'Tu Dealer';
  // El titular siempre usa el nombre real (con acentos) pero limpio de asteriscos y formateado
  const displayDealerName = rawDealerName.trim().replace(/[*_~`]/g, '').toUpperCase();
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

      {/* Row 1: Key Stats - Side by Side on Mobile */}
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
const InventoryView = ({ inventory, quotes = [], showToast, onGenerateContract, onGenerateQuote, onVehicleSelect, onSave, onDelete, activeTab, setActiveTab, userProfile, searchTerm, requestConfirmation }) => {
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
        <div><h1 className="text-xl sm:text-2xl font-bold text-slate-900">Inventario: <span className="text-red-700">{(new URLSearchParams(window.location.search).get('location_name') || userProfile?.dealerName || 'Mi Dealer').trim().replace(/[*_~`]/g, '')}</span></h1><p className="text-slate-500 text-[10px] sm:text-sm mt-0.5 sm:mt-1 font-medium tracking-tight">Organizado por marcas • {filteredInventory.length} vehículos</p></div>
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
                  <Card noPadding className="group flex flex-col h-full hover:-translate-y-1 hover:shadow-xl transition-all duration-500 border-none bg-white rounded-[2rem] overflow-hidden">
                    <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
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
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-black text-slate-900 text-lg leading-tight">{item.make} {item.model}</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.year} • {item.color || 'COLOR'}</p>
                        </div>
                      </div>

                      {/* Specs Row */}
                      <div className="flex gap-4 mb-4 py-3 border-y border-slate-50">
                        <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase">
                          <Settings size={12} className="text-slate-300" />
                          {item.transmision?.split(' ')[0] || '-'}
                        </div>
                        <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase">
                          <Zap size={12} className="text-slate-300" />
                          {item.traccion || 'FWD'}
                        </div>
                      </div>

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
                          <div className="flex items-center gap-2">
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

                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === item.id ? null : item.id); }}
                              className="p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-2xl transition-all active:scale-90"
                            >
                              <MoreVertical size={16} />
                            </button>
                          </div>
                        )}

                        {openMenuId === item.id && (
                          <div className="absolute bottom-full right-6 mb-4 w-48 bg-white rounded-[2rem] shadow-2xl border border-slate-100 py-3 z-[60] animate-in slide-in-from-bottom-2">
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
      <QuoteModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} vehicle={currentVehicle} onConfirm={handleQuoteSent} userProfile={userProfile} />
      <GenerateContractModal isOpen={isContractModalOpen} onClose={() => { setIsContractModalOpen(false); setCurrentVehicle(null); }} inventory={inventory} onGenerate={handleContractGenerated} initialVehicle={currentVehicle} />
    </div>
  );
};

const ContractsView = ({ contracts, quotes, inventory, onGenerateContract, onDeleteContract, onGenerateQuote, onDeleteQuote, userProfile, searchTerm, requestConfirmation }) => {
  const [activeView, setActiveView] = useState('contracts'); // 'contracts' or 'quotes'
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [selectedContractPreview, setSelectedContractPreview] = useState(null);
  const [selectedQuotePreview, setSelectedQuotePreview] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [sortConfig, setSortConfig] = useState('date_desc');

  const filteredData = useMemo(() => {
    const dataToFilter = activeView === 'contracts' ? contracts : quotes;

    // 1. Filtrar por búsqueda
    const filtered = dataToFilter.filter(item => {
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
        const d = new Date(item.createdAt);
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

  const downloadPDF = async (contract) => {
    const tempEl = document.createElement('div');
    tempEl.innerHTML = `
      <div style="font-family: 'Times New Roman', serif; padding: 20mm; width: 210mm; min-height: 297mm; background: white; color: #000;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 15px;">
              <h1>${userProfile.dealerName}</h1>
          </div>
          <h2 style="text-align: center; text-transform: uppercase;">${contract.template}</h2>
          <p>Fecha: ${new Date(contract.date || contract.createdAt).toLocaleDateString()}</p>
          <p>Cliente: <strong>${contract.client}</strong></p>
          <p>Vehículo: <strong>${contract.vehicle}</strong></p>
          <div style="margin-top: 50px; text-align: justify; line-height: 1.6;">
              Certificamos la transacción del vehículo descrito arriba.
          </div>
      </div>
    `;
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf().set({ filename: contract.id && contract.id.startsWith('Contrato_') ? `${contract.id}.pdf` : `Contrato_${contract.client}.pdf` }).from(tempEl).save();
  };

  const downloadQuotePDF = async (quote) => {
    const tempEl = document.createElement('div');
    tempEl.innerHTML = `
      <div style="font-family: 'Helvetica', 'Arial', sans-serif; padding: 20mm; width: 210mm; background: white; color: #334155;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 4px solid #b91c1c; padding-bottom: 20px;">
              <div>
                <h1 style="font-size: 28px; margin: 0; color: #0f172a; font-weight: 800;">${userProfile.dealerName}</h1>
                <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Ficha de Cotización de Vehículo</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-weight: bold; color: #b91c1c;">FOLIO: Q-${quote.id?.slice(-6).toUpperCase()}</p>
                <p style="margin: 5px 0 0; font-size: 12px;">${new Date(quote.createdAt).toLocaleDateString('es-DO', { long: true })}</p>
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
              </table>
          </div>

          <div style="margin-bottom: 30px; background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
              <h2 style="font-size: 14px; text-transform: uppercase; color: #b91c1c; margin-top: 0; margin-bottom: 15px; letter-spacing: 1px; font-weight: 800;">Vehículo de Interés</h2>
              <p style="font-size: 24px; font-weight: 900; margin: 0; color: #0f172a;">${quote.vehicle}</p>
              <div style="margin-top: 15px; display: grid; grid-template-cols: 1fr 1fr; gap: 20px;">
                  <div style="padding: 10px; background: #fff1f2; border-radius: 8px; text-align: center;">
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
                  <td style="padding: 5px 0; color: #60a5fa; font-size: 12px; font-weight: bold;">INSTITUCIÓN:</td>
                  <td style="padding: 5px 0; color: #1e3a8a; font-weight: 800;">${quote.bank}</td>
                </tr>
              </table>
          </div>
          ` : ''}

          <div style="margin-top: 60px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.6;">
            <p>Esta es una ficha de cotización informativa generada por Carbot para ${userProfile.dealerName}.<br/>
            Los precios y la disponibilidad están sujetos a cambios sin previo aviso.</p>
          </div>
      </div>
    `;
    const opt = {
      margin: 10,
      filename: quote.id && quote.id.startsWith('Cotizacion_') ? `${quote.id}.pdf` : `Cotizacion_${quote.name}_${quote.lastname}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    const html2pdf = (await import('html2pdf.js')).default;
    html2pdf().set(opt).from(tempEl).save();
  };

  const printContract = (contract) => {
    const content = `
      <div style="font-family: 'Times New Roman', serif; padding: 20mm; width: 210mm; min-height: 297mm; background: white; color: #000;">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 15px;">
              <h1>${userProfile.dealerName}</h1>
          </div>
          <h2 style="text-align: center; text-transform: uppercase;">${contract.template}</h2>
          <p>Fecha: ${new Date(contract.date || contract.createdAt).toLocaleDateString()}</p>
          <p>Cliente: <strong>${contract.client}</strong></p>
          <p>Vehículo: <strong>${contract.vehicle}</strong></p>
          <div style="margin-top: 50px; text-align: justify; line-height: 1.6;">
              Certificamos la transacción del vehículo descrito arriba.
          </div>
      </div>
  `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><head><title>Imprimir Contrato</title></head><body onload="window.print()">${content}</body></html>`);
    printWindow.document.close();
  };

  const printQuote = (quote) => {
    const content = `
      <div style="font-family: 'Helvetica', 'Arial', sans-serif; padding: 20mm; width: 210mm; background: white; color: #334155;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; border-bottom: 4px solid #b91c1c; padding-bottom: 20px;">
              <div>
                <h1 style="font-size: 28px; margin: 0; color: #0f172a; font-weight: 800;">${userProfile.dealerName}</h1>
                <p style="margin: 5px 0 0; color: #64748b; font-size: 14px;">Ficha de Cotización de Vehículo</p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 0; font-weight: bold; color: #b91c1c;">FOLIO: Q-${quote.id?.slice(-6).toUpperCase()}</p>
                <p style="margin: 5px 0 0; font-size: 12px;">${new Date(quote.createdAt).toLocaleDateString('es-DO', { long: true })}</p>
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
              </table>
          </div>
          <div style="margin-bottom: 30px; background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
              <h2 style="font-size: 14px; text-transform: uppercase; color: #b91c1c; margin-top: 0; margin-bottom: 15px; letter-spacing: 1px; font-weight: 800;">Vehículo de Interés</h2>
               <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 5px 0; color: #64748b; font-size: 12px; font-weight: bold;">VEHÍCULO:</td>
                  <td style="padding: 5px 0; color: #0f172a; font-weight: bold;">${quote.vehicle}</td>
                </tr>
                <tr>
                  <td style="padding: 5px 0; color: #64748b; font-size: 12px; font-weight: bold;">PRECIO:</td>
                  <td style="padding: 5px 0; color: #0f172a; font-weight: bold;">$${Number(quote.price).toLocaleString()} USD</td>
                </tr>
              </table>
          </div>
      </div >
  `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`< html ><head><title>Imprimir Cotización</title></head><body onload="window.print()">${content}</body></html > `);
    printWindow.document.close();
  };

  const totalItems = Object.values(filteredData).flat().length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Documentos del Negocio</h1>
          <p className="text-slate-500 text-sm mt-1">Historial organizado • {totalItems} registros</p>
        </div>

        <div className="bg-slate-200 p-1.5 rounded-xl w-full md:w-auto inline-flex relative shadow-inner">
          {/* VISUAL TOGGLE BACKGROUND RED */}
          <div
            className={`absolute top-1.5 bottom-1.5 rounded-lg bg-red-600 shadow-lg shadow-red-600/20 transition-all duration-300 ease-in-out z-0`}
            style={{
              left: activeView === 'contracts' ? '6px' : '50%',
              width: 'calc(50% - 6px)',
              transform: activeView === 'contracts' ? 'translateX(0)' : 'translateX(0)'
            }}
          />

          <button
            onClick={() => setActiveView('contracts')}
            className={`relative z-10 flex-1 px-4 py-2 text-center text-xs font-black uppercase tracking-wider transition-colors duration-300 ${activeView === 'contracts' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Contratos
          </button>
          <button
            onClick={() => setActiveView('quotes')}
            className={`relative z-10 flex-1 px-4 py-2 text-center text-xs font-black uppercase tracking-wider transition-colors duration-300 ${activeView === 'quotes' ? 'text-white' : 'text-slate-500 hover:text-slate-800'}`}
          >
            Cotizaciones
          </button>
        </div>
      </div>

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
                      <div className={`p - 3 rounded - 2xl shadow - sm transition - all duration - 300 group - hover: scale - 110 group - hover: rotate - 3 ${activeView === 'contracts' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} `}>
                        {activeView === 'contracts' ? <FileText size={24} /> : <Send size={24} />}
                      </div>
                      <div className="flex gap-1">
                        {activeView === 'contracts' ? (
                          <>
                            <button onClick={() => setSelectedContractPreview(item)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transform hover:scale-110 active:scale-95 transition-all" title="Ver Contrato"><Eye size={18} /></button>
                            <button onClick={() => { setEditingContract(item); setIsGenerateModalOpen(true); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transform hover:scale-110 active:scale-95 transition-all" title="Editar"><Edit size={18} /></button>
                            <button onClick={() => printContract(item)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transform hover:scale-110 active:scale-95 transition-all" title="Imprimir"><Printer size={18} /></button>
                            <button onClick={() => downloadPDF(item)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transform hover:scale-110 active:scale-95 transition-all" title="Descargar PDF"><Download size={18} /></button>
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
                      {activeView === 'contracts' ? item.client : `${item.name} ${item.lastname} `}
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
                      <div className="flex items-center gap-1"><Calendar size={12} /> {new Date(item.createdAt).toLocaleDateString()}</div>
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
          onGenerate={onGenerateContract}
          initialVehicle={editingContract}
        />
      )}

      {isQuoteModalOpen && (
        <GenerateQuoteModal
          isOpen={isQuoteModalOpen}
          onClose={() => setIsQuoteModalOpen(false)}
          inventory={inventory}
          onSave={onGenerateQuote}
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
    </div>
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
              className={`p - 2 rounded - xl transition - all ${activeTab === 'trash' ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'} `}
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
                  {(new URLSearchParams(window.location.search).get('location_name') || userProfile?.dealerName || 'Mi Dealer').trim().replace(/[*_~`]/g, '')}
                </p >
              </div >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center text-red-600 text-xs sm:text-base font-black border-2 border-white shadow-sm ring-1 ring-red-100">
                {(new URLSearchParams(window.location.search).get('user_name') || userProfile?.name || 'U').charAt(0)}
              </div>
              <button onClick={onLogout} className="p-1 sm:p-2 text-slate-300 hover:text-red-600 transition-colors">
                <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div >
          </div >
        </div >
      </header >

      {/* Main Content Area */}
      < main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500" >
        {children}
      </main >

      {/* Bottom Navigation (Mobile Only) */}
      < div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 px-4 py-3 flex items-center justify-around shadow-[0_-4px_10px_rgba(0,0,0,0.03)] backdrop-blur-lg bg-white/90" >
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
      </div >
    </div >
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
          const cleanDisplayName = (urlLocationName || '').trim().replace(/[*_~`]/g, '');
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
            const cleanDisplayDealerName = urlDealerName ? urlDealerName.trim().replace(/[*_~`]/g, '') : (urlLocationName || 'Mi Dealer');
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

      // Update Dealer Scoped Folder - Robust Update with setDoc merge
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

    return () => {
      unsubscribeVehicles();
      unsubscribeNewContracts();
      unsubscribeNewQuotes();
      unsubscribeLegacyContracts();
      unsubscribeLegacyQuotes();
      unsubscribeLegacyDocs();
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
        await updateDoc(vehicleRef, {
          ...dataToUpdate,
          ghlLocationId: urlLocationId || dataToUpdate.ghlLocationId || shadowProfile?.ghlLocationId || '',
          updatedAt: new Date().toISOString()
        });
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
      await updateDoc(vehicleRef, {
        status: 'trash',
        deletedAt: new Date().toISOString()
      });
      showToast("Vehículo movido a la papelera");
    } catch (error) {
      console.error(error);
      showToast("Error al mover a papelera", "error");
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

  const handlePermanentDelete = (id) => {
    if (!userProfile?.dealerId) return;
    requestConfirmation({
      title: 'Eliminar Permanentemente',
      message: '¿ESTÁS SEGURO? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar para Siempre',
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "Dealers", effectiveDealerId, "vehiculos", id));
          showToast("Eliminado permanentemente");
        } catch (error) {
          showToast("Error al eliminar", "error");
        }
      }
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
        const vehicleRef = doc(db, "Dealers", effectiveDealerId, "vehiculos", vId);
        await updateDoc(vehicleRef, { status: 'quoted', updatedAt: new Date().toISOString() });
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

  const handleGenerateContract = async (contractData) => {
    if (!userProfile?.dealerId) return;
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
          const vehicleRef = doc(db, "Dealers", effectiveDealerId, "vehiculos", contractData.vehicleId);
          await updateDoc(vehicleRef, { status: 'sold', updatedAt: new Date().toISOString() });
        }
        showToast("Contrato generado");
      }
    } catch (error) {
      console.error(error);
      showToast("Error: " + error.message, "error");
    }
  };

  const handleDeleteContract = (id) => {
    if (!userProfile?.dealerId) return;
    requestConfirmation({
      title: '¿Eliminar Contrato?',
      message: '¿Estás seguro?',
      confirmText: 'Eliminar',
      isDestructive: true,
      onConfirm: async () => {
        try {
          // Intentar borrar de todas las posibles ubicaciones para seguridad o usar el ID para inferir
          if (id.startsWith('Contrato')) {
            await deleteDoc(doc(db, "Dealers", effectiveDealerId, "documentos", "contratos", "items", id));
          } else {
            // Fallback legacy
            await deleteDoc(doc(db, "Dealers", effectiveDealerId, "contracts", id));
            await deleteDoc(doc(db, "Dealers", effectiveDealerId, "documentos", id));
          }
          showToast("Contrato eliminado");
        } catch (error) {
          showToast("Error al eliminar: " + error.message, "error");
        }
      }
    });
  };

  const handleDeleteQuote = async (id) => {
    if (!userProfile?.dealerId) return;
    try {
      if (id.startsWith('Cotizacion')) {
        await deleteDoc(doc(db, "Dealers", effectiveDealerId, "documentos", "cotizaciones", "items", id));
      } else {
        await deleteDoc(doc(db, "Dealers", effectiveDealerId, "quotes", id));
        await deleteDoc(doc(db, "Dealers", effectiveDealerId, "documentos", id));
      }
      showToast("Cotización eliminada");
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
      case 'dashboard': return <DashboardView inventory={activeInventory} contracts={contracts || []} onNavigate={handleNavigate} userProfile={shadowProfile} />;
      case 'inventory': return <InventoryView inventory={activeInventory} quotes={quotes || []} activeTab={inventoryTab} setActiveTab={setInventoryTab} showToast={showToast} onGenerateContract={handleGenerateContract} onGenerateQuote={handleQuoteSent} onVehicleSelect={handleVehicleSelect} onSave={handleSaveVehicle} onDelete={handleDeleteVehicle} userProfile={shadowProfile} searchTerm={globalSearch} requestConfirmation={requestConfirmation} />;
      case 'contracts': return <ContractsView contracts={contracts || []} quotes={quotes || []} inventory={activeInventory} onGenerateContract={handleGenerateContract} onDeleteContract={handleDeleteContract} onGenerateQuote={handleQuoteSent} onDeleteQuote={handleDeleteQuote} setActiveTab={setActiveTab} userProfile={shadowProfile} searchTerm={globalSearch} requestConfirmation={requestConfirmation} />;
      case 'trash': return <TrashView trash={trashInventory} onRestore={handleRestoreVehicle} onPermanentDelete={handlePermanentDelete} onEmptyTrash={handleEmptyTrash} showToast={showToast} />;
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

