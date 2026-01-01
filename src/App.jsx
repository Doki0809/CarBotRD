import VehicleEditView from './VehicleEditView.jsx';
import React, { useState, useEffect, useMemo } from 'react';
import { db, auth, storage } from './firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  signOut,
  onAuthStateChanged,
  getAuth,
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
  deleteField,
  doc,
  query,
  where,
  writeBatch,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';

import {
  LayoutDashboard, Car, FileText, LogOut, Plus, Search, Edit, Trash2,
  DollarSign, CheckCircle, X, Menu, User, Send, Loader2, FilePlus,
  CreditCard, FileSignature, Files, Fuel, IdCard, Trash, Undo, Printer, Eye, Download,
  Package as PackageNew, TriangleAlert as TriangleAlertNew, TrendingUp, History, Bell, Calendar, Settings, Shield,
  Box, AlertTriangle, MoreVertical, Copy, Info
} from 'lucide-react';

// Capa de compatibilidad para iconos (Evita crashes por versión)
const TriangleAlert = TriangleAlertNew || AlertTriangle;
const Package = PackageNew || Box;

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-red-50 text-red-900 font-mono text-sm whitespace-pre-wrap flex-col">
          <h1 className="text-3xl font-black mb-4">¡Algo salió mal! 😵</h1>
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-red-200 max-w-4xl overflow-auto w-full">
            <h2 className="text-xl font-bold mb-2 text-red-600">{this.state.error?.toString()}</h2>
            <p className="opacity-70">{this.state.errorInfo?.componentStack}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 px-8 py-3 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-red-700 shadow-lg"
          >
            Recargar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Importar html2pdf.js de forma dinámica para evitar problemas de SSR si fuera necesario, 
// o directamente ya que es una SPA de Vite.
import html2pdf from 'html2pdf.js';

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
    primary: 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
  };

  // Basic check for manual color overrides
  const hasManualBg = className.includes('bg-');
  const hasManualText = className.includes('text-');

  const baseClasses = `px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 active:scale-95`;
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

const Input = ({ label, type = "text", className = "", ...props }) => (
  <div className="mb-4 group">
    <label className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-red-700 transition-colors">{label}</label>
    <input type={type} className={`w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 ${className}`} {...props} />
  </div>
);

const Select = ({ label, options = [], ...props }) => (
  <div className="mb-4 group">
    <label className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-red-700 transition-colors">{label}</label>
    <select className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer" {...props}>
      {options && options.map(opt => {
        const isObj = typeof opt === 'object' && opt !== null;
        const value = isObj ? opt.value : opt;
        const labelText = isObj ? opt.label : opt;
        return <option key={value} value={value}>{labelText}</option>;
      })}
    </select>
  </div>
);

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

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, isDestructive = false, showCancel = true, confirmText = null }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md transition-all duration-300">
      <div className="w-full max-w-sm animate-in zoom-in-95 duration-200">
        <Card className="rounded-[45px] p-10 border-none shadow-2xl overflow-hidden relative bg-white">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-8 hover:scale-105 transition-transform">
              <AppLogo size={100} />
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-3 uppercase tracking-tight leading-tight px-2">{title}</h3>
            <p className="text-base font-bold text-slate-500 mb-10 leading-relaxed px-4">{message}</p>

            <div className="flex flex-col w-full gap-4">
              <button
                onClick={onConfirm}
                className="w-full py-5 rounded-[24px] text-sm font-black uppercase tracking-widest transition-all shadow-xl bg-red-600 text-white shadow-red-600/30 hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98]"
              >
                {confirmText || (isDestructive ? 'Confirmar Eliminación' : 'Confirmar Acción')}
              </button>
              {showCancel && (
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-[24px] text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        </Card>
      </div>
    </div>
  );
};

const PromptModal = ({ isOpen, onClose, onConfirm, title, message, defaultValue = '', placeholder = '' }) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) setValue(defaultValue);
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md transition-all duration-300">
      <div className="w-full max-w-sm animate-in zoom-in-95 duration-200">
        <Card className="rounded-[45px] p-10 border-none shadow-2xl overflow-hidden relative bg-white">
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-6">
              <AppLogo size={80} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight text-center px-4 leading-tight">{title}</h3>
            <p className="text-sm font-bold text-slate-500 mb-8 leading-relaxed px-4 text-center">{message}</p>

            <div className="w-full space-y-4">
              <div className="space-y-2">
                <input
                  type="text"
                  autoFocus
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-[20px] focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 transition-all font-bold text-slate-900 placeholder:text-slate-300"
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && value.trim()) onConfirm(value);
                  }}
                />
              </div>

              <div className="flex flex-col w-full gap-3">
                <button
                  onClick={() => value.trim() && onConfirm(value)}
                  disabled={!value.trim()}
                  className="w-full py-5 rounded-[24px] text-xs font-black bg-red-600 text-white uppercase tracking-widest shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-4 rounded-[24px] text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Omitir / Cancelar
                </button>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        </Card>
      </div>
    </div>
  );
};

const WelcomeModal = ({ isOpen, onConfirm, dealerName }) => {
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md transition-all duration-500">
      <div className="w-full max-w-md animate-in zoom-in-95 duration-500">
        <Card className="rounded-[40px] p-10 border-none shadow-2xl overflow-hidden relative bg-white">
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-8 hover:scale-105 transition-transform">
              <AppLogo size={90} />
            </div>

            <div className="text-center mb-10">
              <h2 className="text-sm font-black text-red-600 uppercase tracking-[0.2em] mb-3">Primer Acceso</h2>
              <h1 className="text-3xl font-black text-slate-900 leading-tight uppercase tracking-tighter">
                ¡Hola, Bienvenido al <br /> CarBot System para <span className="text-red-600">{dealerName || 'tu Dealer'}</span>!
              </h1>
              <p className="text-sm font-bold text-slate-400 mt-4 leading-relaxed">
                Completa tu perfil profesional para empezar a gestionar tu inventario y contratos.
              </p>
            </div>

            <div className="w-full space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Nombre Completo</label>
                <input
                  type="text"
                  autoFocus
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 transition-all font-bold text-slate-900 placeholder:text-slate-300"
                  placeholder="Ej. Juan Pérez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Puesto de Trabajo</label>
                <input
                  type="text"
                  className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 transition-all font-bold text-slate-900 placeholder:text-slate-300"
                  placeholder="Ej. Gerente de Ventas"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                />
              </div>

              <button
                onClick={() => name.trim() && position.trim() && onConfirm(name, position)}
                disabled={!name.trim() || !position.trim()}
                className="w-full mt-4 py-5 rounded-[24px] text-xs font-black bg-red-600 text-white uppercase tracking-[0.2em] shadow-xl shadow-red-600/20 hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Comenzar Ahora
              </button>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        </Card>
      </div>
    </div>
  );
};

const ActionSelectionModal = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full h-full sm:h-auto sm:max-w-sm animate-in zoom-in-95 duration-200">
        <Card className="h-full sm:h-auto rounded-none sm:rounded-[24px] pb-32 sm:pb-0">
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

const VehicleFormModal = ({ isOpen, onClose, onSave, initialData, userProfile }) => { // Recibe userProfile
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [photos, setPhotos] = useState([]); // { url, file, isExisting }
  const [currency, setCurrency] = useState(initialData?.price_dop ? 'DOP' : 'USD');

  useEffect(() => {
    if (initialData && isOpen) {
      const existing = (initialData.images || (initialData.image ? [initialData.image] : [])).map(url => ({
        url,
        file: null,
        isExisting: true
      }));
      setPhotos(existing);
    } else if (!initialData && isOpen) {
      setPhotos([]);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const totalCurrent = photos.length;

    if (totalCurrent + files.length > 10) {
      showConfirm({
        title: 'Límite de Fotos',
        message: `Límite excedido. El inventario permite un máximo de 10 fotos. Actualmente tienes ${totalCurrent} y estás intentando agregar ${files.length}.`,
        showCancel: false,
        confirmText: 'Entendido'
      });
      return;
    }

    if (files.length > 0) {
      const newItems = files.map(file => ({
        url: URL.createObjectURL(file), // Preview local
        file: file,
        isExisting: false
      }));
      setPhotos(prev => [...prev, ...newItems]);
    }
  };

  const removeImage = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const dealerName = userProfile?.dealerName;
    if (!dealerName) {
      alert("Error: No se pudo identificar el Dealer para subir las fotos.");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Convertir números y precios
    const priceValue = Number(data.price_unified);
    if (currency === 'USD') {
      data.price = priceValue;
      data.price_dop = 0;
    } else {
      data.price_dop = priceValue;
      data.price = 0;
    }
    delete data.price_unified;

    data.year = Number(data.year);
    data.mileage = Number(data.mileage);

    try {
      let uploadedUrls = [];
      const filesToUpload = photos.filter(p => !p.isExisting && p.file);
      const existingUrls = photos.filter(p => p.isExisting).map(p => p.url);

      // Conservar las existentes
      uploadedUrls = [...existingUrls];

      // SUBIR ARCHIVOS NUEVOS A FIRBASE STORAGE
      if (filesToUpload.length > 0) {
        setUploadProgress(`Preparando ${filesToUpload.length} imágenes...`);

        for (let i = 0; i < filesToUpload.length; i++) {
          const item = filesToUpload[i];
          setUploadProgress(`Subiendo foto ${i + 1} de ${filesToUpload.length}...`);

          try {
            // 1. LIMPIAR LOS DATOS (Quitar espacios y poner mayúsculas)
            const marca = (data.make || "Marca").toUpperCase().trim();
            const modelo = (data.model || "Modelo").toUpperCase().trim();
            const anio = (data.year || "0000").toString();
            const edicion = (data.edition || "Base").toUpperCase().trim(); // Ej: PLUS
            const color = (data.color || "Color").toUpperCase().trim();

            // Sacar los últimos 4 del chasis
            const vin = data.vin || "0000";
            const ultimos4 = vin.slice(-4);

            // 2. CREAR EL NOMBRE DE LA CARPETA EXACTO
            // Formato: 2019_SOUL_PLUS_ROJO_1301
            // Usamos replace para cambiar espacios por guiones bajos (_)
            const nombreCarpeta = `${anio}_${modelo}_${edicion}_${color}_${ultimos4}`.replace(/\s+/g, '_');

            // 3. CONSTRUIR LA RUTA COMPLETA 📍
            // Dealers / Duran... / Vehiculos / KIA / 2019_SOUL... / foto.jpg
            const storagePath = `Dealers/${dealerName}/Vehiculos/${marca}/${nombreCarpeta}/${item.file.name}`;

            console.log("📂 Guardando en:", storagePath);

            const storageRef = ref(storage, storagePath);

            // Subir
            const uploadTask = uploadBytes(storageRef, item.file);

            // Timeout safety
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('TIMEOUT')), 45000) // 45s timeout
            );

            const snapshot = await Promise.race([uploadTask, timeoutPromise]);
            const downloadUrl = await getDownloadURL(snapshot.ref);

            if (downloadUrl) {
              uploadedUrls.push(downloadUrl);
            }
          } catch (err) {
            console.error(`Error al subir la imagen ${i + 1}:`, err);
            const errorMsg = err.message === 'TIMEOUT' ? 'Tiempo de espera excedido' : 'Error de conexión';
            setUploadProgress(`⚠️ Error en foto ${i + 1}: ${errorMsg}.`);
            await new Promise(r => setTimeout(r, 1500));
          }
        }
        setUploadProgress('¡Carga finalizada!');
        await new Promise(r => setTimeout(r, 500));
      }

      // Asignar URLs al objeto data
      data.images = uploadedUrls;
      // La primera imagen es la portada
      data.image = uploadedUrls[0] || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800';
      delete data.image_url_hidden;

      if (initialData?.id) {
        data.id = initialData.id;
      }

      // Guardar en Firestore (usa la funcion handleSaveVehicle que ya tiene la logica del ID)
      await onSave(data);

      setLoading(false);
      setUploadProgress('');
      onClose();
    } catch (error) {
      console.error("Error crítico al guardar:", error);
      showConfirm({
        title: 'Error de Guardado',
        message: 'Error al procesar. Intenta nuevamente.',
        showCancel: false,
        confirmText: 'Cerrar'
      });
      setLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-4xl animate-in zoom-in-95 duration-200">
        <Card className="w-full max-h-[90vh] overflow-y-auto pb-32 sm:pb-0">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 sticky top-0 bg-white z-10">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <AppLogo size={32} />
              {initialData ? 'Editar Vehículo' : 'Nuevo Vehículo'}
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-1">Datos Principales</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input name="make" label="Marca" defaultValue={initialData?.make} required />
                <Input name="model" label="Modelo" defaultValue={initialData?.model} required />
                <Input name="year" label="Año" type="number" defaultValue={initialData?.year} required />
                <Input name="color" label="Color" defaultValue={initialData?.color} required />
                <Input name="edition" label="Edición" defaultValue={initialData?.edition} />
                <Input name="mileage" label="Millaje" type="number" defaultValue={initialData?.mileage} required />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-1">Especificaciones e Imagen</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select name="transmission" label="Transmisión" defaultValue={initialData?.transmission || 'Automática'} options={['Automática', 'Manual', 'CVT']} />
                <Select name="traction" label="Tracción" defaultValue={initialData?.traction || 'FWD'} options={['FWD', 'RWD', 'AWD', '4x4']} />
                <Select name="fuel" label="Combustible" defaultValue={initialData?.fuel || 'Gasolina'} options={['Gasolina', 'Diesel', 'Híbrido']} />
                <Input name="vin" label="VIN / Chasis" defaultValue={initialData?.vin} className="md:col-span-3 font-mono" required />

                {/* SECCIÓN DE IMAGEN */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-bold">Galería de Fotos (Opcional, Máximo 10)</label>
                  <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col items-center justify-center mb-6">
                      <input
                        type="file"
                        id="multi-upload"
                        multiple
                        accept=".png, .jpg, .jpeg, image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="multi-upload" className="cursor-pointer bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-600/20 hover:bg-red-700 transition-all flex items-center gap-2">
                        <Plus size={20} /> Seleccionar Fotos (Máx. 10)
                      </label>
                      <p className="mt-3 text-xs text-slate-500 text-center">Puedes seleccionar varias fotos pulsando CTRL o CMD.<br />Límite de 10 fotos por unidad.</p>
                      {uploadProgress && <p className="mt-4 text-sm font-bold text-red-600 animate-pulse bg-red-50 px-4 py-2 rounded-full border border-red-100">{uploadProgress}</p>}
                    </div>

                    {photos.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {photos.map((item, idx) => (
                          <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border-2 border-white shadow-md group">
                            <img src={item.url} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <X size={14} />
                            </button>
                            {idx === 0 && <div className="absolute bottom-0 inset-x-0 bg-red-600 text-[10px] text-white py-0.5 text-center font-bold">PORTADA</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-1">Precio y Estado</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta</label>
                  <div className="flex shadow-sm rounded-lg overflow-hidden border border-gray-200 focus-within:ring-2 focus-within:ring-red-500/20 focus-within:border-red-500 transition-all">
                    <input
                      name="price_unified"
                      type="number"
                      defaultValue={currency === 'USD' ? initialData?.price : initialData?.price_dop}
                      className="flex-1 px-3 py-2 bg-white focus:outline-none"
                      placeholder="0.00"
                      required
                    />
                    <div className="flex bg-gray-100 border-l border-gray-200 p-1 gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrency('USD')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${currency === 'USD' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-slate-700'}`}
                      >US$</button>
                      <button
                        type="button"
                        onClick={() => setCurrency('DOP')}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${currency === 'DOP' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-slate-700'}`}
                      >RD$</button>
                    </div>
                  </div>
                </div>
                <Select
                  name="status"
                  label="Estado"
                  defaultValue={initialData?.status || 'available'}
                  options={[
                    { value: 'available', label: 'Disponible' },
                    { value: 'quoted', label: 'Cotizado' },
                    { value: 'sold', label: 'Vendido' }
                  ]}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin mr-2" /> {uploadProgress || 'Guardando...'}</> : 'Guardar Vehículo'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

const QuoteModal = ({ isOpen, onClose, vehicle, onConfirm, userProfile }) => {
  const [loading, setLoading] = useState(false);
  const [bankName, setBankName] = useState('');
  const [cedula, setCedula] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. URL DE GHL (Tu webhook ...673)
    const baseUrl = "https://services.leadconnectorhq.com/hooks/5YBWavjywU0Ay0Y85R9p/webhook-trigger/e5c205a4-ec9f-4183-9cc5-673";

    const form = e.target;
    const name = form.elements['name'].value;
    const lastname = form.elements['lastname'].value;
    const phone = form.elements['phone'].value;

    // 2. EMPAQUETAR TODOS LOS DATOS SOLICITADOS
    const params = new URLSearchParams();

    // Datos del Cliente
    params.append("firstName", name);
    params.append("lastName", lastname);
    params.append("phone", phone);
    params.append("cedula", cedula);
    params.append("addressedTo", bankName); // "A quien va dirigida"

    // Datos del Vehículo (Detallados)
    params.append("make", vehicle.make);           // Marca
    params.append("model", vehicle.model);         // Modelo
    params.append("year", vehicle.year);           // Año
    params.append("color", vehicle.color);         // Color
    params.append("vin", vehicle.vin);             // Chasis
    params.append("edition", vehicle.edition || ""); // Edición
    params.append("traction", vehicle.traction);   // Tracción
    params.append("fuel", vehicle.fuel);           // Combustible
    params.append("transmission", vehicle.transmission); // Transmisión
    params.append("mileage", vehicle.mileage);     // Millaje
    params.append("price", customPrice || vehicle.price);         // Precio
    params.append("availability", vehicle.status); // Disponibilidad

    // Metadatos extra
    params.append("vehicleSummary", `${vehicle.make} ${vehicle.model} ${vehicle.year}`);
    params.append("source", "CarBot Inventario");
    params.append("type", "Cotizacion");

    // 3. ENVIAR (Truco del Pixel)
    new Image().src = `${baseUrl}?${params.toString()}`;

    setTimeout(() => {
      onConfirm({
        name,
        lastname,
        phone,
        cedula,
        bank: bankName,
        vehicleId: vehicle.id,
        vehicle: `${vehicle.make} ${vehicle.model}`
      });
      showConfirm({
        title: '¡Cotización Enviada!',
        message: '¡Cotización completa enviada a GHL!',
        showCancel: false,
        confirmText: 'Genial'
      });
      setLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
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
              <Input name="name" label="Nombre" placeholder="Ej. Juan" required />
              <Input name="lastname" label="Apellido" placeholder="Ej. Pérez" required />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input name="phone" label="Teléfono" placeholder="+1..." required />
              <Input name="cedula" label="Cédula" value={cedula} onChange={(e) => setCedula(e.target.value)} required />
            </div>
            <Input label="A quien va dirigida (Banco/Persona)" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ej. Banco Popular" className="mb-4" />
            <Input label="Precio a Cotizar/Financiar (Opcional)" type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder={`Precio lista: ${vehicle.price_dop > 0 ? vehicle.price_dop : vehicle.price}`} className="mb-4" />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? "Enviando..." : "Enviar Cotización"}</Button>
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
  const [customPrice, setCustomPrice] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;
  const availableVehicles = inventory.filter(v => v.status !== 'sold');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedVehicleId) return;
    setLoading(true);

    const vehicle = inventory.find(v => v.id === selectedVehicleId);
    const baseUrl = "https://services.leadconnectorhq.com/hooks/5YBWavjywU0Ay0Y85R9p/webhook-trigger/e5c205a4-ec9f-4183-9cc5-673";

    // EMPAQUETAR DATOS COMPLETOS
    const params = new URLSearchParams();
    params.append("firstName", name);
    params.append("lastName", lastname);
    params.append("phone", phone);
    params.append("cedula", cedula);
    params.append("addressedTo", bank); // "A quien va dirigida"

    // Especificaciones del Auto
    params.append("make", vehicle.make);
    params.append("model", vehicle.model);
    params.append("year", vehicle.year);
    params.append("color", vehicle.color);
    params.append("vin", vehicle.vin);
    params.append("edition", vehicle.edition || "");
    params.append("traction", vehicle.traction);
    params.append("fuel", vehicle.fuel);
    params.append("transmission", vehicle.transmission);
    params.append("mileage", vehicle.mileage);
    params.append("price", customPrice || vehicle.price);
    params.append("availability", vehicle.status);

    params.append("source", "CarBot Manual");
    params.append("type", "Cotizacion");

    new Image().src = `${baseUrl}?${params.toString()}`;

    setTimeout(() => {
      onSave({ name, lastname, phone, cedula, bank, vehicle: `${vehicle.make} ${vehicle.model}`, vehicleId: vehicle.id });
      showConfirm({
        title: '¡Envío Exitoso!',
        message: '¡Cotización manual enviada a GHL!',
        showCancel: false,
        confirmText: 'Entendido'
      });
      setLoading(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
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
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">1. Vehículo</label>
              <select className="w-full px-3 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold" value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} required>
                <option value="">-- Seleccionar --</option>
                {availableVehicles.map(v => (<option key={v.id} value={v.id}>{v.make} {v.model} ({v.year})</option>))}
              </select>
            </div>
            <div className="space-y-4">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wide">2. Datos</label>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
                <Input label="Apellido" value={lastname} onChange={(e) => setLastname(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                <Input label="Cédula" value={cedula} onChange={(e) => setCedula(e.target.value)} />
              </div>
              <Input label="A quien va dirigida" value={bank} onChange={(e) => setBank(e.target.value)} placeholder="Ej. Banco Popular" />
              <Input label="Precio a Cotizar/Financiar" type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} placeholder="Dejar vacio para usar precio de lista" />
            </div>
            <div className="pt-4 flex justify-end gap-3"><Button variant="ghost" onClick={onClose} type="button">Cancelar</Button><Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">Guardar</Button></div>
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
  const [salePrice, setSalePrice] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialVehicle) {
      setSelectedVehicleId(initialVehicle.vehicleId || initialVehicle.id);
      if (initialVehicle.client) {
        const parts = initialVehicle.client.split(' ');
        setClientName(parts[0] || '');
        setClientLastName(parts.slice(1).join(' ') || '');
      }
      setClientCedula(initialVehicle.cedula || '');
      const template = CONTRACT_TEMPLATES.find(t => t.name === initialVehicle.template);
      if (template) setSelectedTemplate(template.id);
      // Pre-llenar precio si existe
      setSalePrice(initialVehicle.price_dop > 0 ? initialVehicle.price_dop : initialVehicle.price);
    } else {
      setSelectedTemplate(''); setSelectedVehicleId(''); setClientName(''); setClientLastName(''); setClientCedula(''); setSalePrice('');
    }
  }, [initialVehicle, isOpen]);

  if (!isOpen) return null;
  const availableVehicles = inventory.filter(v => v.status !== 'sold' || (initialVehicle && v.id === initialVehicle.id));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTemplate || !selectedVehicleId) return;
    setLoading(true);

    const vehicle = inventory.find(v => v.id === selectedVehicleId);
    const template = CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate);
    const baseUrl = "https://services.leadconnectorhq.com/hooks/5YBWavjywU0Ay0Y85R9p/webhook-trigger/e5c205a4-ec9f-4183-9cc5-673";

    // EMPAQUETAR DATOS PARA CONTRATO
    const params = new URLSearchParams();
    params.append("firstName", clientName);
    params.append("lastName", clientLastName);
    params.append("cedula", clientCedula);
    // Nota: El formulario de contrato básico a veces no pide teléfono, 
    // pero si lo tienes en el futuro, agrégalo aquí.

    // Datos Vehículo
    params.append("make", vehicle.make);
    params.append("model", vehicle.model);
    params.append("year", vehicle.year);
    params.append("color", vehicle.color);
    params.append("vin", vehicle.vin);
    params.append("edition", vehicle.edition || "");
    params.append("traction", vehicle.traction);
    params.append("fuel", vehicle.fuel);
    params.append("transmission", vehicle.transmission);
    params.append("mileage", vehicle.mileage);
    params.append("price", salePrice || vehicle.price);
    params.append("availability", "Vendido"); // Al hacer contrato, se vende

    params.append("source", "CarBot Contratos");
    params.append("type", "Contrato");
    params.append("contractType", template.name);

    new Image().src = `${baseUrl}?${params.toString()}`;

    setTimeout(() => {
      onGenerate({
        id: initialVehicle?.contractId || undefined,
        client: `${clientName} ${clientLastName}`,
        cedula: clientCedula,
        vehicle: `${vehicle.make} ${vehicle.model}`,
        vehicleId: vehicle.id,
        price: salePrice ? Number(salePrice) : (vehicle.price_dop > 0 ? vehicle.price_dop : vehicle.price),
        template: template.name,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        ghl_id: `ghl_${Date.now()}`,
        vin: vehicle.vin
      });
      showConfirm({
        title: 'Contrato Generado',
        message: '¡Contrato generado y datos enviados a GHL!',
        showCancel: false,
        confirmText: 'Aceptar'
      });
      setLoading(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">1. Vehículo</label>
              <select className="w-full px-3 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500" value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)} required>
                <option value="">-- Seleccionar --</option>
                {availableVehicles.map(v => (<option key={v.id} value={v.id}>{v.make} {v.model} ({v.year}) - {v.price_dop > 0 ? `RD$ ${v.price_dop.toLocaleString()}` : `US$ ${v.price.toLocaleString()}`}</option>))}
              </select>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2"><User size={16} /> 2. Datos del Cliente</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Nombre" placeholder="Ej. Juan" value={clientName} onChange={(e) => setClientName(e.target.value)} required />
                <Input label="Apellido" placeholder="Ej. Pérez" value={clientLastName} onChange={(e) => setClientLastName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input label="Cédula / Pasaporte" placeholder="001-0000000-0" value={clientCedula} onChange={(e) => setClientCedula(e.target.value)} required />
                <Input label="Precio Venta / Financiamiento" type="number" placeholder="Monto acordado" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">3. Elige una Plantilla</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CONTRACT_TEMPLATES.map(template => {
                  const Icon = template.icon; const isSelected = selectedTemplate === template.id;
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
              <Button type="submit" disabled={loading || !selectedTemplate || !selectedVehicleId}>{loading ? <><Loader2 className="animate-spin mr-2" size={18} /> Generando...</> : 'Generar y Guardar'}</Button>
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
      <div style="padding: 15mm 20mm;">
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
        <p style="margin-bottom: 15px; text-align: justify;">El precio total convenido para la presente venta es de <strong>[PRECIO_AQUI]</strong>, el cual el VENDEDOR declara haber recibido a su entera satisfacción de manos del COMPRADOR, sirviendo el presente documento como carta de pago y descargo legal.</p>
        
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

  const handleDownloadPDF = () => {
    const element = document.createElement('div');
    element.innerHTML = getContractHtml(false);
    document.body.appendChild(element);

    const opt = {
      margin: 0,
      filename: `Contrato_${contract.client.replace(/\s+/g, '_')}_${contract.id.slice(0, 5)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-4xl h-[90vh] animate-in zoom-in-95 duration-200 flex flex-col">
        <Card className="flex flex-col h-full bg-slate-50 pb-32 sm:pb-0">
          <div className="flex justify-between items-center mb-4 p-4 border-b bg-white rounded-t-xl shrink-0">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText size={20} className="text-red-600" /> Contrato: {contract.client}
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
                      body { margin: 0; padding: 20px; background: #cbd5e1; display: flex; justify-content: center; }
                      * { box-sizing: border-box; }
                      ::-webkit-scrollbar { width: 8px; }
                      ::-webkit-scrollbar-track { background: #f1f1f1; }
                      ::-webkit-scrollbar-thumb { background: #888; border-radius: 10px; }
                      ::-webkit-scrollbar-thumb:hover { background: #555; }
                    </style>
                  </head>
                  <body>
                    ${getContractHtml(true)}
                  </body>
                </html>
              `}
              className="w-full h-full border-none rounded-sm min-h-[800px]"
              title="Vista Previa del Contrato"
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
      <div style="padding: 15mm 20mm;">
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

  const handleDownloadPDF = () => {
    const element = document.createElement('div');
    element.innerHTML = getQuoteHtml(false);
    document.body.appendChild(element);

    const opt = {
      margin: 0,
      filename: `Cotizacion_${quote.name}_${quote.lastname}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

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
        <Card className="flex flex-col h-full bg-slate-50 pb-32 sm:pb-0">
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



const TrashView = ({ trashInventory, trashDocuments, onRestore, onPermanentDelete, onEmptyTrash }) => {
  const [currentTab, setCurrentTab] = useState('vehicles'); // 'vehicles' | 'documents'
  const [showExpiring, setShowExpiring] = useState(false);

  const filterByExpiration = (items) => {
    if (!showExpiring) return items;
    return items.filter(item => {
      const deleteDate = new Date(item.deletedAt);
      const diffDays = (new Date().getTime() - deleteDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > 12; // Proximos a eliminar (>12 dias)
    });
  };

  const activeItems = currentTab === 'vehicles' ? filterByExpiration(trashInventory) : filterByExpiration(trashDocuments);

  const getDaysRemaining = (deletedAt) => {
    if (!deletedAt) return 15;
    const diff = new Date().getTime() - new Date(deletedAt).getTime();
    const remaining = Math.max(0, 15 - Math.floor(diff / (1000 * 60 * 60 * 24)));
    return remaining;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="rotate-3 transition-transform hover:rotate-0">
            <AppLogo size={60} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">PAPELERA SEGURA</h1>
            <p className="text-slate-500 text-sm font-bold mt-1">Gestión de ítems eliminados temporalmente (15 días de gracia).</p>
          </div>
        </div>
        {(trashInventory.length > 0 || trashDocuments.length > 0) && (
          <Button variant="danger" icon={Trash2} onClick={onEmptyTrash} className="bg-red-50 text-red-600 hover:bg-red-100 border-none shadow-none text-xs font-black uppercase tracking-widest px-6">
            Vaciar Todo
          </Button>
        )}
      </div>

      {/* Tabs and Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex w-full sm:w-auto p-1 bg-slate-50 rounded-xl">
          <button
            onClick={() => setCurrentTab('vehicles')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${currentTab === 'vehicles' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Vehículos ({trashInventory.length})
          </button>
          <button
            onClick={() => setCurrentTab('documents')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${currentTab === 'documents' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Documentos ({trashDocuments.length})
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>

        <button
          onClick={() => setShowExpiring(!showExpiring)}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${showExpiring ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        >
          {showExpiring ? 'Viendo: Próximos a eliminar' : 'Ver Próximos a eliminar'}
        </button>
      </div>

      {activeItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-300 bg-white rounded-[32px] border-2 border-dashed border-slate-100 grayscale opacity-60">
          <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
            <Trash2 size={40} />
          </div>
          <p className="text-xl font-black uppercase tracking-widest">Sección Vacía</p>
          <p className="text-sm font-bold mt-2">No hay elementos {showExpiring ? 'próximos a caducar' : ''} en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeItems.map(item => {
            const daysLeft = getDaysRemaining(item.deletedAt);
            const isExpiring = daysLeft <= 3;

            return (
              <div key={item.id} className="relative group animate-in zoom-in-95 duration-300">
                <Card noPadding className={`flex flex-col h-full overflow-hidden border-none shadow-xl transition-all hover:scale-[1.02] ${isExpiring ? 'ring-2 ring-amber-400/50' : ''}`}>
                  {/* Visual Header */}
                  <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
                    {currentTab === 'vehicles' ? (
                      <img src={item.image} alt={item.model} className="w-full h-full object-cover grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200/50">
                        <FileText size={48} className="text-slate-300" />
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border backdrop-blur-md ${isExpiring ? 'bg-amber-500 text-white border-amber-400' : 'bg-white/80 text-slate-600 border-white'}`}>
                        {daysLeft} días restantes
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 flex flex-col flex-1 bg-white">
                    <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight mb-1 truncate">
                      {currentTab === 'vehicles'
                        ? `${item.make} ${item.model}`
                        : (item.client || (item.name ? `${item.name} ${item.lastname}` : 'Cliente Desconocido'))}
                    </h3>

                    {currentTab === 'documents' && item.vehicle && (
                      <p className="text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1">
                        <Car size={12} className="text-slate-400" /> {item.vehicle}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-6">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Eliminado: {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'Desconocido'}
                      </p>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-3">
                      <button
                        onClick={() => onRestore(item.id, currentTab === 'vehicles' ? 'vehicle' : (item.vehicleId ? 'contract' : 'quote'))}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-green-50 text-green-600 hover:bg-green-100 transition-all flex items-center justify-center gap-2"
                      >
                        <Undo size={14} /> Restaurar
                      </button>
                      <button
                        onClick={() => onPermanentDelete(item.id, currentTab === 'vehicles' ? 'vehicle' : (item.vehicleId ? 'contract' : 'quote'))}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 hover:bg-red-100 transition-all flex items-center justify-center gap-2"
                      >
                        <X size={14} /> Borrar
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const DashboardView = ({ inventory, contracts, quotes, onNavigate, userProfile }) => {
  const recentContracts = contracts.slice(0, 3);
  const [activityFeed, setActivityFeed] = useState([]);

  // FETCH ACTIVITY DATA
  useEffect(() => {
    const fetchExtraActivity = async () => {
      if (!userProfile?.dealerName) return;
      const dealerName = userProfile.dealerName;

      try {
        // 1. Fetch Sold Vehicles
        const qSold = query(collection(db, "Dealers", dealerName, "VehiculosVendidos"), orderBy("fechaVenta", "desc"), limit(5));
        const soldSnaps = await getDocs(qSold);
        const soldItems = soldSnaps.docs.map(d => ({
          type: 'sold',
          date: d.data().fechaVenta || d.data().createdAt,
          ...d.data()
        }));

        // 2. Fetch Trash (Deleted)
        const qTrash = query(collection(db, "Dealers", dealerName, "Papelera"), orderBy("deletedAt", "desc"), limit(5));
        const trashSnaps = await getDocs(qTrash);
        const trashItems = trashSnaps.docs.map(d => ({
          type: 'deleted',
          date: d.data().deletedAt,
          ...d.data()
        }));

        // 3. Process Live Data (Inventory, Contracts, Quotes)
        // Inventory (New vehicles)
        const newVehicles = inventory.slice(0, 5).map(v => ({
          type: 'new_vehicle',
          date: v.createdAt,
          ...v
        }));

        // Contracts
        const newContracts = contracts.slice(0, 5).map(c => ({
          type: 'contract',
          date: c.createdAt,
          ...c
        }));

        // Quotes
        const newQuotes = (quotes || []).slice(0, 5).map(q => ({
          type: 'quote',
          date: q.createdAt,
          ...q
        }));

        // 4. Merge & Sort
        const allActivity = [...soldItems, ...trashItems, ...newVehicles, ...newContracts, ...newQuotes];
        allActivity.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

        setActivityFeed(allActivity.slice(0, 10)); // Keep top 10

      } catch (e) {
        console.error("Error fetching activity:", e);
      }
    };

    fetchExtraActivity();
  }, [userProfile, inventory, contracts, quotes]);

  const getActivityIcon = (type) => {
    switch (type) {
      case 'sold': return DollarSign;
      case 'deleted': return Trash2;
      case 'contract': return FileSignature;
      case 'quote': return FileText;
      case 'new_vehicle': return Car;
      default: return Info;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'sold': return 'text-emerald-600 bg-emerald-50 ring-emerald-100';
      case 'deleted': return 'text-red-600 bg-red-50 ring-red-100';
      case 'contract': return 'text-blue-600 bg-blue-50 ring-blue-100';
      case 'quote': return 'text-amber-600 bg-amber-50 ring-amber-100';
      case 'new_vehicle': return 'text-slate-600 bg-slate-100 ring-slate-200';
      default: return 'text-slate-400 bg-slate-50 ring-slate-100';
    }
  };
  // --- CALCULOS REALES PARA WIDGETS ---
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Nuevos este mes (Creados en los últimos 30 días o este mes calendario)
  const newThisMonth = inventory.filter(v => {
    if (!v.createdAt) return false;
    return new Date(v.createdAt) >= firstDayOfMonth;
  }).length;

  // 2. Vendidos este mes
  const soldThisMonth = contracts.filter(c => {
    if (!c.createdAt) return false;
    return new Date(c.createdAt) >= firstDayOfMonth;
  }).length;

  // 3. Valor Total / Ganancias (Separado por moneda)
  const profitDOP = inventory
    .filter(v => v.status === 'available')
    .reduce((acc, v) => acc + (Number(v.price_dop) || 0), 0);

  const profitUSD = inventory
    .filter(v => v.status === 'available')
    .reduce((acc, v) => acc + (Number(v.price) || 0), 0);

  // Formateadores
  const fmt = (val) => new Intl.NumberFormat('es-DO').format(val);
  const fmtM = (val) => (val / 1000000).toFixed(1) + 'M';

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-full px-1">

      {/* Hero Banner Section */}
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-red-600 to-red-700 p-8 sm:p-12 shadow-2xl shadow-red-600/20 mb-8 border border-red-500/50">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[10px] font-black text-red-100 uppercase tracking-widest">
                sistema de inventario de carbot
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white mb-4 sm:mb-6 tracking-tight leading-tight sm:leading-[1.1]">
              Bienvenido al sistema para <br className="hidden md:block" />
              <span className="text-red-100">{userProfile?.dealerName || 'tu Dealer'}</span>
            </h1>
            <div className="flex items-center gap-3 pl-1 border-l-2 border-red-400/30">
              <p className="text-red-50 text-sm sm:text-lg font-medium">
                Hola, <span className="text-white font-black">{userProfile?.name?.split(' ')[0] || 'Dealer'}</span>. Es un placer verte hoy.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('contracts')}
              className="px-6 py-3 bg-red-800/40 hover:bg-red-800/60 backdrop-blur-md rounded-2xl text-white text-xs font-black uppercase tracking-widest transition-all border border-white/10 hover:scale-105 active:scale-95 shadow-lg"
            >
              Ver Reporte
            </button>
            <button
              onClick={() => onNavigate('inventory')}
              className="px-6 py-3 bg-white hover:bg-red-50 rounded-2xl text-red-600 text-xs font-black uppercase tracking-widest transition-all shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} strokeWidth={3} /> Agregar Vehículo
            </button>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-400/10 rounded-full -ml-24 -mb-24 blur-2xl"></div>
      </div>

      {/* Stats Widgets Section */}
      <div className="flex flex-col gap-6 w-full max-w-full">
        {/* Row 1: Small Widgets (Mobile: Side by Side) */}
        <div className="grid grid-cols-2 gap-4 w-full">
          <Card className="p-4 sm:p-8 border-none shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group bg-white relative">
            <div className="flex flex-col h-full relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-[22px] bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm transition-colors duration-500 group-hover:bg-blue-100">
                  <Package size={20} className="sm:hidden transition-all duration-500 group-hover:scale-110 group-hover:rotate-12" />
                  <Package size={26} className="hidden sm:block transition-all duration-500 group-hover:scale-110 group-hover:rotate-12" />
                </div>
                {newThisMonth > 0 && (
                  <span className="text-[9px] sm:text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg uppercase tracking-widest shadow-sm">
                    +{newThisMonth}
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Inventario</p>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-900 leading-none">
                {inventory.filter(v => v.status === 'available').length}
              </h3>
            </div>
            <Package className="absolute -right-6 -bottom-6 text-blue-600 opacity-[0.03] w-28 h-28 group-hover:rotate-90 transition-all duration-1000 ease-out pointer-events-none" />
          </Card>

          <Card className="p-4 sm:p-8 border-none shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group bg-white relative">
            <div className="flex flex-col h-full relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-[22px] bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm transition-colors duration-500 group-hover:bg-emerald-100">
                  <DollarSign size={20} className="sm:hidden transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-12deg]" />
                  <DollarSign size={26} className="hidden sm:block transition-all duration-500 group-hover:scale-110 group-hover:rotate-[-12deg]" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg uppercase tracking-widest shadow-sm">
                  {soldThisMonth > 0 ? 'SUBIENDO' : 'OK'}
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Vendidos</p>
              <h3 className="text-2xl sm:text-4xl font-black text-slate-900 leading-none">
                {inventory.filter(v => v.status === 'sold').length}
              </h3>
            </div>
            <DollarSign className="absolute -right-6 -bottom-6 text-emerald-600 opacity-[0.03] w-28 h-28 group-hover:rotate-90 transition-all duration-1000 ease-out pointer-events-none" />
          </Card>
        </div>

        {/* Row 2: Large Widget (Full Width) */}
        <Card className="p-5 sm:p-10 border-none shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden group relative bg-white">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4 sm:mb-8">
              <div className="flex items-center gap-3 sm:gap-5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-xl shadow-emerald-500/30 group-hover:scale-110 transition-transform duration-500 rotate-3 group-hover:rotate-0">
                  <DollarSign size={36} strokeWidth={3} />
                </div>
                <div>
                  <p className="text-[9px] sm:text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">Valor Total</p>
                  <h3 className="text-xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">Cifras Globales</h3>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                <TrendingUp size={14} /> +5.4% ESTE MES
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10 pt-5 sm:pt-8 border-t border-slate-50">
              <div className="space-y-1 sm:space-y-2">
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">En Pesos Dominicanos</p>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xl sm:text-3xl font-black text-slate-900">
                    RD$ {profitDOP >= 1000000 ? fmtM(profitDOP) : fmt(profitDOP)}
                  </span>
                  {profitDOP >= 1000000 && (
                    <span className="text-[10px] font-bold text-slate-400">({fmt(profitDOP)})</span>
                  )}
                </div>
              </div>
              <div className="space-y-1 sm:space-y-2">
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">En Dólares USD</p>
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
                  <span className="text-xl sm:text-3xl font-black text-red-600">
                    US$ {profitUSD >= 1000000 ? fmtM(profitUSD) : fmt(profitUSD)}
                  </span>
                  {profitUSD >= 1000000 && (
                    <span className="text-[10px] font-bold text-slate-400">(${fmt(profitUSD)})</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <TrendingUp className="absolute -right-8 -bottom-8 text-slate-500 opacity-[0.03] w-40 h-40 group-hover:rotate-90 transition-all duration-1000 ease-out pointer-events-none" />
        </Card>
      </div>

      {/* Bottom Section: Recent Contracts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        <Card className="lg:col-span-2 overflow-hidden shadow-sm border-none bg-white p-8">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black text-slate-900">Contratos Recientes</h3>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-black">Últimas transacciones generadas en el sistema</p>
            </div>
            <button onClick={() => onNavigate('contracts')} className="text-red-600 hover:text-red-700 text-xs font-black uppercase tracking-widest flex items-center gap-1 group">
              Ver todos <TrendingUp size={14} className="group-hover:translate-x-1 transition-transform border-b-2 border-transparent hover:border-red-600" />
            </button>
          </div>

          <div className="overflow-x-auto overflow-y-hidden">
            <div className="hidden sm:block">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-50">
                    <th className="pb-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Producto / Vehículo</th>
                    <th className="pb-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Cliente</th>
                    <th className="pb-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fecha</th>
                    <th className="pb-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentContracts.length > 0 ? recentContracts.map(contract => (
                    <tr key={contract.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-6">
                        <div className="flex items-center gap-4">
                          <AppLogo size={44} />
                          <div>
                            <p className="text-sm font-black text-slate-900 group-hover:text-red-700 transition-colors">{contract.vehicle}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{contract.template}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-6">
                        <p className="text-sm font-bold text-slate-700">{contract.client}</p>
                      </td>
                      <td className="py-6">
                        <p className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-lg inline-block uppercase">
                          {(() => { const d = new Date(contract.createdAt); return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A'; })()}
                        </p>
                      </td>
                      <td className="py-6 text-right">
                        <span className="text-sm font-black text-slate-900 group-hover:text-red-600 transition-colors">
                          {contract.price > 0 ? `RD$ ${contract.price.toLocaleString()}` : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-50">
                          <Package className="text-slate-200" size={48} />
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No hay contratos recientes</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="sm:hidden space-y-4">
              {recentContracts.length > 0 ? recentContracts.map(contract => (
                <div key={contract.id} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <AppLogo size={40} />
                    <div>
                      <p className="font-black text-slate-900 text-sm leading-tight">{contract.vehicle}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{contract.template}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-end border-t border-slate-100 pt-4">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
                      <p className="text-sm font-bold text-slate-800">{contract.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-red-700">
                        {contract.price > 0 ? `RD$ ${contract.price.toLocaleString()}` : 'N/A'}
                      </p>
                      <p className="text-[9px] font-bold text-slate-400">
                        {(() => { const d = new Date(contract.createdAt); return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'N/A'; })()}
                      </p>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="py-10 text-center text-slate-300 font-bold uppercase tracking-widest text-[10px]">No hay contratos recientes</div>
              )}
            </div>
          </div>
        </Card>

        {/* Activity Feed Card */}
        <Card className="shadow-sm border-none bg-white p-8">
          <div className="mb-10">
            <h3 className="text-xl font-black text-slate-900 border-b-4 border-red-600 inline-block pb-1">Actividad Reciente</h3>
          </div>
          <div className="space-y-8 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-50">
            {/* SAFEGUARD: Activity Feed temporarily simplified for debugging */}
            {activityFeed && activityFeed.length > 0 ? activityFeed.map((item, idx) => {
              // Ensure item exists
              if (!item) return null;

              const Icon = getActivityIcon(item.type) || Info; // Fallback to Info
              const colorClass = getActivityColor(item.type);
              let title = '';
              let subtitle = '';

              if (item.type === 'sold') {
                title = 'Vehículo Vendido';
                subtitle = `${item.make || ''} ${item.model || ''} • Cliente: ${item.comprador || '?'}`;
              } else if (item.type === 'deleted') {
                title = 'Registro Eliminado';
                subtitle = `${item.make ? (item.make + ' ' + item.model) : (item.client || item.name || 'Documento')}`;
              } else if (item.type === 'contract') {
                title = 'Nuevo Contrato';
                subtitle = `${item.vehicle || ''} • ${item.client || ''}`;
              } else if (item.type === 'quote') {
                title = 'Nueva Cotización';
                subtitle = `${item.vehicle || ''} • ${item.name || ''} ${item.lastname || ''}`;
              } else if (item.type === 'new_vehicle') {
                title = 'Nuevo Ingreso';
                subtitle = `${item.make || ''} ${item.model || ''} ${item.year || ''}`;
              }

              return (
                <div key={idx} className="flex gap-4 relative z-10 group">
                  <div className="relative">
                    <div className={`w-4 h-4 rounded-full ring-4 shadow-lg transition-all group-hover:scale-110 ${colorClass}`}>
                      <Icon size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{title}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">{subtitle}</p>
                    <p className="text-[9px] text-slate-300 font-bold mt-1">
                      {(() => {
                        const d = new Date(item.date);
                        return !isNaN(d.getTime())
                          ? `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Fecha N/A';
                      })()}
                    </p>
                  </div>
                </div>
              );
            }) : (
              <div className="flex gap-4 relative z-10 grayscale opacity-50">
                <div className="w-4 h-4 bg-slate-100 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200"></div>
                <div>
                  <p className="text-sm font-bold text-slate-400">Sin actividad reciente</p>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const InventoryView = ({ inventory, quotes, showToast, onGenerateContract, onGenerateQuote, onVehicleSelect, onSave, onDelete, activeTab, setActiveTab, userProfile, searchTerm, showConfirm, onDuplicate }) => {
  const [localSearch, setLocalSearch] = useState(''); // Search inside the view
  const [sortConfig, setSortConfig] = useState('date_desc'); // New sorting state
  // const [activeTab, setActiveTab] = useState('available'); // Levantado al padre
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null); // Nuevo estado para controlar qué menú está abierto

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // CAMBIO AUTOMÁTICO DE ORDEN AL CAMBIAR DE TAB
  useEffect(() => {
    if (activeTab === 'available') setSortConfig('brand_asc');
    else if (activeTab === 'sold') setSortConfig('date_desc');
    else setSortConfig('date_desc'); // Quoted default
  }, [activeTab]);

  const filteredInventory = useMemo(() => {
    let result = inventory.filter(item => {
      const globalMatches = `${item.make} ${item.model} ${item.vin || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
      const localMatches = `${item.make} ${item.model} ${item.vin || ''}`.toLowerCase().includes(localSearch.toLowerCase());

      let matchesTab = true;
      if (activeTab === 'available') matchesTab = item.status === 'available' || item.status === 'quoted';
      if (activeTab === 'sold') matchesTab = item.status === 'sold';

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

  // FILTRO COTIZACIONES (Nuevo Tab)
  const filteredQuotes = useMemo(() => {
    if (activeTab !== 'quoted') return [];
    const search = localSearch.toLowerCase();
    return (quotes || []).filter(q => {
      const matchName = (q.name + ' ' + q.lastname).toLowerCase().includes(search);
      const matchVehicle = (q.vehicle || '').toLowerCase().includes(search);
      return matchName || matchVehicle;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [quotes, activeTab, localSearch]);

  const groupedInventory = useMemo(() => {
    const groups = {};
    const isBrandSort = sortConfig === 'brand_asc';
    const isSoldTab = activeTab === 'sold';

    filteredInventory.forEach(item => {
      let groupKey = "RESULTADOS";

      if (isSoldTab) {
        // Agrupar por Mes de Venta (o Creación si no tiene venta)
        const dateVal = item.fechaVenta || item.createdAt;
        if (dateVal) {
          const d = new Date(dateVal);
          // Validar que la fecha sea válida antes de formatear
          if (!isNaN(d.getTime())) {
            groupKey = d.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' }).toUpperCase();
          } else {
            groupKey = "FECHA DESCONOCIDA";
          }
          // pero usaremos sortedBrands logic.
        }
      } else if (isBrandSort) {
        groupKey = item.make || "OTRAS";
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(item);
    });
    return groups;
  }, [filteredInventory, sortConfig, activeTab]);

  const sortedBrands = useMemo(() => {
    const keys = Object.keys(groupedInventory);
    if (activeTab === 'sold') {
      // Ordenar Meses Cronológicamente (Descendiente)
      return keys.sort((a, b) => {
        // Hack para extraer fecha de un item del grupo
        const itemA = groupedInventory[a][0];
        const itemB = groupedInventory[b][0];
        const dateA = new Date(itemA.fechaVenta || itemA.createdAt || 0);
        const dateB = new Date(itemB.fechaVenta || itemB.createdAt || 0);
        return dateB - dateA;
      });
    }
    // Brand Sort o Default
    return keys.sort();
  }, [groupedInventory, activeTab]);

  const handleCreate = () => { setCurrentVehicle(null); setIsModalOpen(true); };

  const handleSaveWrapper = (data) => {
    onSave(data);
    setIsModalOpen(false);
    setCurrentVehicle(null);
  };

  const handleDeleteWrapper = (id) => {
    showConfirm({
      title: 'Eliminar Vehículo',
      message: '¿Seguro que deseas mover este vehículo a la papelera?',
      isDestructive: true,
      onConfirm: () => onDelete(id)
    });
  };

  const handleDuplicate = (vehicle) => {
    // Preparamos la copia
    const copy = { ...vehicle };
    delete copy.id; // Nuevo ID será generado
    delete copy.createdAt; // Nueva fecha
    delete copy.updatedAt;
    delete copy.idPersonalizado; // Se regenerará

    // Abrimos el modal con los datos pre-cargados
    setCurrentVehicle(copy);
    setIsModalOpen(true);
    showToast("Modo Duplicación: Edita los datos y guarda.");
  };

  const openActionModal = (vehicle) => { setCurrentVehicle(vehicle); setIsActionModalOpen(true); };
  const handleActionSelect = (action) => {
    setIsActionModalOpen(false);
    if (action === 'quote') setIsQuoteModalOpen(true);
    else if (action === 'contract') setIsContractModalOpen(true);
  };

  const handleQuoteSent = (quoteData) => {
    setIsQuoteModalOpen(false);
    if (onGenerateQuote) {
      onGenerateQuote(quoteData);
    } else {
      // Fallback si no se pasa la función (aunque la pasaremos ahora)
      showToast("Cotización enviada");
      if (currentVehicle) onSave({ ...currentVehicle, status: 'quoted' });
    }
    setCurrentVehicle(null);
  };

  const handleContractGenerated = (contractData) => {
    onGenerateContract(contractData);
    setIsContractModalOpen(false);
    setCurrentVehicle(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-full px-1">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black text-slate-900">Inventario:</h1>
            <span className="text-2xl font-black text-red-600">{userProfile?.dealerName || 'General'}</span>
          </div>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Organizado por marcas • {filteredInventory.length} vehículos en total</p>
        </div>
        <Button
          onClick={handleCreate}
          icon={Plus}
          className="w-full md:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/20 active:scale-95 transition-all text-xs font-black uppercase tracking-widest rounded-2xl"
        >
          Agregar Vehículo
        </Button>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-6">
          {/* Status Filter Pills */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-50 w-full sm:w-auto shadow-inner">
            {[
              { id: 'available', label: 'Disponibles' },
              { id: 'quoted', label: 'Cotizados' },
              { id: 'sold', label: 'Vendidos' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-md scale-105'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md group w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Filtrar en esta vista..."
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 focus:bg-white transition-all font-bold text-sm"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ordenar por:</span>
            <select
              value={sortConfig}
              onChange={(e) => setSortConfig(e.target.value)}
              className="flex-1 sm:flex-none pl-4 pr-10 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/50 appearance-none cursor-pointer shadow-sm relative"
              style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            >
              <option value="date_desc">MÁS RECIENTES</option>
              <option value="date_asc">MÁS ANTIGUOS</option>
              <option value="updated_desc">ÚLTIMA ACTUALIZACIÓN</option>
              <option value="name_asc">Nombre (A-Z)</option>
              <option value="brand_asc">Marca</option>
            </select>
          </div>
        </div>

        <div className="space-y-6 sm:space-y-10 mt-4">
          {activeTab === 'quoted' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQuotes.length > 0 ? filteredQuotes.map(quote => (
                <Card key={quote.id} noPadding className="flex flex-col group hover:-translate-y-1 transition-all border-l-4 border-l-amber-400">
                  <div className="p-6 flex flex-col h-full relative">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Cotización Activa</p>
                        <h3 className="text-lg font-black text-slate-900 uppercase">{quote.vehicle}</h3>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                        <FileText size={20} />
                      </div>
                    </div>

                    <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-xl">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cliente</p>
                        <p className="text-sm font-bold text-slate-800">{quote.name} {quote.lastname}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Banco / Financiera</p>
                        <p className="text-sm font-bold text-blue-700 flex items-center gap-1">
                          {quote.bank || 'No especificado'}
                          {quote.bank && <CheckCircle size={12} />}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Financiamiento</p>
                        <p className="text-base font-black text-slate-900">
                          {quote.financedAmount ? `$${Number(quote.financedAmount).toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                      <p className="text-[10px] font-bold text-slate-400">
                        {/* SAFEGUARD DATE */}
                        {(() => { const d = new Date(quote.createdAt); return !isNaN(d.getTime()) ? d.toLocaleDateString() : 'Fecha N/A'; })()}
                      </p>
                      <button
                        onClick={() => {
                          // En un futuro: Abrir detalle de cotizacion
                          showToast("Detalle de cotización en desarrollo");
                        }}
                        className="text-xs font-black text-red-600 uppercase tracking-widest hover:underline"
                      >
                        Ver Ficha
                      </button>
                    </div>
                  </div>
                </Card>
              )) : (
                <div className="col-span-full py-20 text-center text-slate-400 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                  <p className="font-black uppercase tracking-widest">No hay cotizaciones activas</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {sortedBrands.map(brand => (
                <div key={brand}>
                  <div className="flex items-center mb-3 sm:mb-4">
                    <h2 className="text-lg sm:text-xl font-black text-slate-800 mr-2 sm:mr-3">{brand}</h2>
                    <div className="h-px flex-1 bg-slate-100"></div>
                    <span className="text-[10px] font-black text-slate-400 ml-2 sm:ml-3 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">{groupedInventory[brand]?.length || 0}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {groupedInventory[brand] && groupedInventory[brand].map(item => (
                      <div key={item.id} onClick={() => onVehicleSelect(item)} className="cursor-pointer">
                        <Card noPadding className="group flex flex-col h-full hover:-translate-y-1">
                          <div className="relative aspect-[16/10] bg-slate-50 overflow-hidden">
                            <img src={item.image} alt={item.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                            <div className="absolute top-3 right-3 shadow-sm"><Badge status={item.status} /></div>
                          </div>
                          <div className="p-5 flex flex-col flex-1">
                            <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">{item.make} {item.model}</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.year} • {item.vin ? item.vin.slice(-6) : 'N/A'}</p>
                            <div className="mt-3 mb-5">
                              <p className="text-xl font-black text-red-600">
                                {item.status === 'sold' && <span className="text-[10px] block text-slate-400 uppercase tracking-widest font-black">Precio de Venta</span>}
                                {/* SAFEGUARD PRICES */}
                                {item.price_dop > 0 ? `RD$ ${(item.price_dop || 0).toLocaleString()}` : `US$ ${(item.price || 0).toLocaleString()}`}
                              </p>
                            </div>
                            <div className="mt-auto flex items-center gap-2">
                              <Button
                                variant="secondary"
                                disabled={item.status === 'sold'}
                                className={`flex-1 text-[10px] font-black transition-all py-3 rounded-xl uppercase tracking-widest border-none ${item.status === 'sold'
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-70'
                                  : 'bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600'
                                  }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.status !== 'sold') openActionModal(item);
                                }}
                              >
                                {item.status === 'sold' ? 'VENDIDO' : 'GENERAR'}
                              </Button>
                              <div className="flex gap-1.5 sm:gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setCurrentVehicle(item); setIsModalOpen(true); }} className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-red-50 rounded-xl text-slate-400 hover:text-red-600 transition-all" title="Editar"><Edit size={14} /></button>
                                <div className="relative">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuId(openMenuId === item.id ? null : item.id);
                                    }}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${openMenuId === item.id ? 'bg-red-50 text-red-600' : 'bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-600'}`}
                                  >
                                    <MoreVertical size={14} />
                                  </button>

                                  {openMenuId === item.id && (
                                    <div className="absolute bottom-full right-0 mb-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 p-1 z-30 animate-in fade-in zoom-in-95 duration-200">
                                      <button onClick={(e) => { e.stopPropagation(); handleDuplicate(item); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 hover:text-red-600 rounded-lg flex items-center gap-2">
                                        <Copy size={12} /> Duplicar
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteWrapper(item.id); setOpenMenuId(null); }} className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2">
                                        <Trash2 size={12} /> Eliminar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {sortedBrands.length === 0 && <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-[32px] border border-dashed border-slate-200"><Package size={48} className="mb-4 opacity-20" /><p className="text-sm font-black uppercase tracking-widest">No hay vehículos. ¡Agrega uno!</p></div>}
            </>
          )}
        </div>
      </div>

      <VehicleFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveWrapper} initialData={currentVehicle} userProfile={userProfile} />
      <ActionSelectionModal isOpen={isActionModalOpen} onClose={() => setIsActionModalOpen(false)} onSelect={handleActionSelect} />
      <QuoteModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} vehicle={currentVehicle} onConfirm={handleQuoteSent} userProfile={userProfile} />
      <GenerateContractModal isOpen={isContractModalOpen} onClose={() => { setIsContractModalOpen(false); setCurrentVehicle(null); }} inventory={inventory} onGenerate={handleContractGenerated} initialVehicle={currentVehicle} />
    </div>
  );
};

const ContractsView = ({ contracts, quotes, inventory, onGenerateContract, onDeleteContract, onGenerateQuote, onDeleteQuote, userProfile, searchTerm, showConfirm }) => {
  const [activeView, setActiveView] = useState('contracts'); // 'contracts' or 'quotes'
  const [localSearch, setLocalSearch] = useState('');
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
      const search = (localSearch || "").toLowerCase();
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
  }, [contracts, quotes, activeView, localSearch, sortConfig]);

  const handleDeleteItem = (item) => {
    const isQuote = activeView === 'quotes';
    const clientName = isQuote ? `${item.name} ${item.lastname}` : item.client;
    const confirmMsg = `¿Eliminar permanentemente ${isQuote ? 'la cotización' : 'el contrato'} de ${clientName}?`;
    showConfirm({
      title: isQuote ? 'Eliminar Cotización' : 'Eliminar Contrato',
      message: confirmMsg,
      isDestructive: true,
      onConfirm: () => {
        if (isQuote) onDeleteQuote(item.id);
        else onDeleteContract(item.id);
      }
    });
  };

  const downloadPDF = (contract, isPrint = false) => {
    let printWindow = null;
    if (isPrint) {
      printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write('<p style="font-family:sans-serif; text-align:center; margin-top:50px;">Generando documento para imprimir...</p>');
      }
    }

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

    const worker = html2pdf().set({
      margin: 10,
      filename: `Contrato_${contract.client}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(tempEl);

    if (isPrint && printWindow) {
      worker.toPdf().get('pdf').then(pdf => {
        pdf.autoPrint();
      }).output('bloburl').then(blobUrl => {
        printWindow.location.href = blobUrl;
      });
    } else {
      worker.save();
    }
  };

  const downloadQuotePDF = (quote, isPrint = false) => {
    let printWindow = null;
    if (isPrint) {
      printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write('<p style="font-family:sans-serif; text-align:center; margin-top:50px;">Generando cotización...</p>');
      }
    }

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
          <p>Esta es una ficha de cotización informativa generada por Carbot para ${userProfile.dealerName}.<br />
            Los precios y la disponibilidad están sujetos a cambios sin previo aviso.</p>
        </div>
      </div>
      `;
    const opt = {
      margin: 10,
      filename: `Cotizacion_${quote.name}_${quote.lastname}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    const worker = html2pdf().set(opt).from(tempEl);
    if (isPrint && printWindow) {
      worker.toPdf().get('pdf').then(pdf => {
        pdf.autoPrint();
      }).output('bloburl').then(blobUrl => {
        printWindow.location.href = blobUrl;
      });
    } else {
      worker.save();
    }
  };


  const totalItems = Object.values(filteredData).flat().length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-full px-1">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-100 pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-1">Documentos del Negocio</h1>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Historial organizado • {totalItems} registros</p>
          </div>
          <Button
            onClick={() => activeView === 'contracts' ? setIsGenerateModalOpen(true) : setIsQuoteModalOpen(true)}
            icon={Plus}
            className="w-full md:w-auto px-8 py-4 bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-600/20 active:scale-95 transition-all text-xs font-black uppercase tracking-widest rounded-2xl"
          >
            Crear {activeView === 'contracts' ? 'Contrato' : 'Cotización'}
          </Button>
        </div>

        <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-2xl border border-slate-50 w-full md:w-auto md:flex shadow-inner mb-2">
          <button
            onClick={() => setActiveView('contracts')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 text-center ${activeView === 'contracts'
              ? 'bg-red-600 text-white shadow-md scale-105'
              : 'bg-white text-slate-500 hover:text-red-700'
              }`}
          >
            Contratos
          </button>
          <button
            onClick={() => setActiveView('quotes')}
            className={`flex-1 px-4 py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-widest transition-all duration-300 text-center ${activeView === 'quotes'
              ? 'bg-red-600 text-white shadow-md scale-105'
              : 'bg-white text-slate-500 hover:text-red-700'
              }`}
          >
            Cotizaciones
          </button>
        </div>
      </div>

      {/* Filter & Sort Controls */}
      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative flex-1 max-w-md group w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={16} />
          <input
            type="text"
            placeholder={`Filtrar ${activeView === 'contracts' ? 'contratos' : 'cotizaciones'}...`}
            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-500/30 focus:bg-white transition-all font-bold text-sm"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ordenar por:</span>
          <select
            value={sortConfig}
            onChange={(e) => setSortConfig(e.target.value)}
            className="flex-1 md:flex-none pl-4 pr-10 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/50 appearance-none cursor-pointer shadow-sm relative"
            style={{ backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>')`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
          >
            <option value="date_desc">MÁS RECIENTES</option>
            <option value="date_asc">MÁS ANTIGUOS</option>
            <option value="client_asc">CLIENTE (A-Z)</option>
            <option value="vehicle_asc">VEHÍCULO (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Data List Grouped by Month */}
      <div className="space-y-10">
        {Object.keys(filteredData).length > 0 ? Object.keys(filteredData).map(month => (
          <div key={month}>
            <div className="flex items-center mb-6">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{month}</h2>
              <div className="h-px flex-1 bg-slate-100 ml-4"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredData[month].map(item => (
                <Card key={item.id} className="group hover:-translate-y-1 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">
                        {activeView === 'contracts' ? (item.template || 'Contrato Ventas') : 'Cotización'}
                      </p>
                      <h3 className="text-base font-black text-slate-900 truncate uppercase">
                        {activeView === 'contracts' ? item.client : `${item.name} ${item.lastname}`}
                      </h3>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-red-600 transition-colors">
                        <FileText size={20} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <AppLogo size={14} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 uppercase truncate">{item.vehicle}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500">
                        <Calendar size={14} />
                      </div>
                      <span className="text-xs font-bold text-slate-700">
                        {new Date(activeView === 'contracts' ? (item.date || item.createdAt) : item.createdAt).toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      onClick={() => activeView === 'contracts' ? setSelectedContractPreview(item) : setSelectedQuotePreview(item)}
                      className="flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-100"
                    >
                      <Eye size={14} /> VER
                    </button>
                    <button
                      onClick={() => activeView === 'contracts' ? downloadPDF(item) : downloadQuotePDF(item)}
                      className="flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
                    >
                      <Download size={14} /> PDF
                    </button>
                    <button
                      onClick={() => activeView === 'contracts' ? downloadPDF(item, true) : downloadQuotePDF(item, true)}
                      className="flex items-center justify-center gap-2 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200"
                    >
                      <Printer size={14} /> IMPRIMIR
                    </button>
                    <button
                      onClick={() => {
                        if (activeView === 'contracts') {
                          setEditingContract(item);
                          setIsGenerateModalOpen(true);
                        }
                      }}
                      className="flex items-center justify-center gap-2 py-3 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-blue-100"
                    >
                      <Edit size={14} /> EDITAR
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="col-span-2 flex items-center justify-center gap-2 py-2 bg-white hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all mt-1"
                    >
                      <Trash2 size={12} /> Eliminar Registro
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-[32px] border border-dashed border-slate-200">
            <FileText size={48} className="mb-4 opacity-20" />
            <p className="text-sm font-black uppercase tracking-widest">No se encontraron registros</p>
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

// --- AJUSTES ---
const SettingsView = ({ userProfile, onUpdateProfile, onLogout }) => {
  const [name, setName] = useState(userProfile?.name || '');
  const [role, setRole] = useState(userProfile?.role || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onUpdateProfile({ name, role });
    setLoading(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 max-w-full px-1 pb-10">
      <div className="border-b border-slate-100 pb-8">
        <h1 className="text-2xl font-black text-slate-900 mb-1">Configuración de Perfil</h1>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Administra tu información personal y cuenta</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-8 border-none shadow-sm bg-white">
            <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
              <User size={20} className="text-red-600" /> Información Personal
            </h3>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 transition-all font-bold text-slate-900"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Puesto o Cargo</label>
                <input
                  type="text"
                  placeholder="Ej: Gerente de Ventas"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 transition-all font-bold text-slate-900"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-10 py-4"
                icon={loading ? Loader2 : CheckCircle}
              >
                {loading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
            </form>
          </Card>

          <Card className="p-8 border-none shadow-sm bg-white">
            <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-orange-500" /> Seguridad y Cuenta
            </h3>
            <p className="text-sm text-slate-500 mb-6 font-medium">Gestiona el acceso a tu cuenta de CarBot.</p>

            <div className="pt-6 border-t border-slate-50">
              <button
                onClick={onLogout}
                className="flex items-center gap-3 px-6 py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all w-full sm:w-auto justify-center"
              >
                <LogOut size={18} /> Cerrar Sesión Segura
              </button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-8 border-none shadow-sm bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.name)}&background=ef4444&color=fff&size=200`}
                alt="Profile"
                className="w-20 h-20 rounded-3xl border-4 border-white/10 mb-6 shadow-2xl"
              />
              <h4 className="text-xl font-black mb-1">{userProfile?.name}</h4>
              <p className="text-red-400 text-[10px] font-black uppercase tracking-widest mb-6">{userProfile?.role || 'Vendedor'}</p>

              <div className="space-y-4 pt-6 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                    <History size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Dealer</span>
                    <span className="text-xs font-bold text-slate-200">{userProfile?.dealerName || 'General'}</span>
                  </div>
                </div>
              </div>
            </div>
            <Settings className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 group-hover:rotate-90 transition-transform duration-1000" />
          </Card>
        </div>
      </div>
    </div>
  );
};

// --- LAYOUT ---
const AppLayout = ({ children, activeTab, setActiveTab, onLogout, userProfile, searchTerm, onSearchChange }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'contracts', label: 'Contratos', icon: FileText },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#f8fafc] flex flex-col font-sans selection:bg-red-200 selection:text-red-900 pb-24 sm:pb-0 transition-colors duration-300 max-w-full">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm px-4 sm:px-6 py-2 sm:py-3 mx-auto w-full">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          {/* Left: Logo & Brand */}
          <div className="flex-1 flex items-center">
            <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <AppLogo size={45} />
              <div className="flex flex-col">
                <span className="text-sm font-black text-red-600 tracking-tight leading-none uppercase">Inventario</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">CarBot</span>
              </div>
            </div>
          </div>

          {/* Center: Main Nav Items (Hidden on Mobile) */}
          <nav className="hidden sm:flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 ${activeTab === item.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 scale-105'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
              >
                <item.icon size={16} strokeWidth={2.5} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Side: Search, Trash, User */}
          <div className="flex-1 flex items-center gap-3 sm:gap-4 justify-end">
            {/* Search Bar (Hidden on Mobile) */}
            <div className="relative max-w-[180px] w-full hidden xl:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/50 transition-all font-bold"
              />
            </div>

            {/* Trash Icon */}
            <button
              onClick={() => setActiveTab('trash')}
              className={`p-2 rounded-xl transition-all ${activeTab === 'trash' ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
              title="Ir a Basurero"
            >
              <Trash2 size={18} />
            </button>

            {/* User Profile Info */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <div className="text-right hidden md:block">
                <p className="text-xs font-black text-slate-900 leading-tight uppercase tracking-tighter">{userProfile?.name?.split(' ')[0] || 'Jean'}</p>
                <p className="text-[9px] font-black text-red-600 uppercase tracking-[0.1em]">{userProfile?.dealerName || 'ALMACÉN'}</p>
              </div>
              <div
                className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center text-red-600 text-sm font-black border-2 border-white shadow-sm ring-1 ring-red-100/50"
              >
                {userProfile?.name?.charAt(0) || 'J'}
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-300 hover:text-red-600 transition-colors"
                title="Cerrar Sesión"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
        {children}
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 px-4 py-3 pb-safe flex items-center justify-around shadow-[0_-4px_10px_rgba(0,0,0,0.03)] backdrop-blur-lg bg-white/90 transition-colors">
        {menuItems.map(item => {
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
        })}
      </div>
    </div>
  );
};

// --- Reemplaza tu LoginScreen actual con este ---
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true); // Default highly permissive for dealers
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const auth = getAuth();

    try {
      await signInWithEmailAndPassword(auth, email, password);
      const emailId = email.replace(/\./g, '_').toLowerCase();
      await onLogin(emailId, rememberMe);
    } catch (err) {
      console.error("Error de login:", err);
      if (err.code === 'auth/wrong-password') setError("Contraseña incorrecta.");
      else if (err.code === 'auth/user-not-found') setError("Este correo no está registrado.");
      else setError("Error al iniciar sesión.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 transition-colors duration-300">
      <Card className="max-w-md w-full p-8 sm:p-10 border-none shadow-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6 group transition-transform hover:scale-105 duration-500">
            <AppLogo size={120} />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">CarBot <span className="text-red-600">System</span></h1>
          <p className="text-slate-500 mt-2 font-medium">Gestión inteligente de inventario</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Correo Electrónico</label>
            <div className="relative group">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 transition-all font-bold text-slate-900"
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Contraseña</label>
            <div className="relative group">
              <LogOut className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors rotate-90" size={18} />
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500/50 transition-all font-bold text-slate-900"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-slate-200 transition-all checked:bg-red-600 checked:border-red-600 hover:border-red-300"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <CheckCircle className="absolute w-5 h-5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity p-0.5" />
              </div>
              <span className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Mantener sesión abierta</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-xs font-bold flex items-center gap-2 animate-shake">
              <TriangleAlert size={16} /> {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full py-5 rounded-2xl shadow-xl shadow-red-600/30 text-sm font-black bg-red-600 text-white hover:bg-red-700"
            icon={loading ? Loader2 : LogOut}
          >
            {loading ? 'Iniciando Sesión...' : 'Entrar al Sistema'}
          </Button>
        </form>

        <p className="text-center mt-10 text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
          RESERVADO PARA <span className="text-red-600 opacity-80">CARBOT RD</span><br />
          V2.5.0 • © 2025
        </p>
      </Card>
    </div>
  );
};


// --- LOGICA PRINCIPAL (CEREBRO) ---
export default function CarbotApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');

  const [userProfile, setUserProfile] = useState(null);
  const [user, setUser] = useState(null); // Firebase User
  const [initializing, setInitializing] = useState(true);

  // --- Onboarding Dialog State ---
  const [onboardingDialog, setOnboardingDialog] = useState({
    isOpen: false,
    dealerName: '',
    onConfirm: () => { }
  });

  const showOnboarding = (dealerName, onConfirm) => {
    setOnboardingDialog({
      isOpen: true,
      dealerName,
      onConfirm
    });
  };

  // --- Confirm Dialog State (Hoisted for Stability) ---
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    isDestructive: false
  });

  const showConfirm = (options) => {
    setConfirmDialog({
      isOpen: true,
      title: options.title || '¿Estás seguro?',
      message: options.message || 'Esta acción no se puede deshacer.',
      onConfirm: () => {
        options.onConfirm();
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      },
      isDestructive: options.isDestructive || false,
      showCancel: options.showCancel !== undefined ? options.showCancel : true,
      confirmText: options.confirmText || null
    });
  };

  const [promptDialog, setPromptDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    defaultValue: '',
    placeholder: '',
    onConfirm: () => { }
  });

  const showPrompt = (options) => {
    setPromptDialog({
      isOpen: true,
      title: options.title || 'Requiere Información',
      message: options.message || 'Por favor completa el siguiente campo.',
      defaultValue: options.defaultValue || '',
      placeholder: options.placeholder || 'Escribe aquí...',
      onConfirm: (val) => {
        options.onConfirm(val);
        setPromptDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Asegurar que el modo oscuro esté desactivado al iniciar
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
    localStorage.removeItem('carbot_theme');
  }, []);

  // Inventario y datos
  const [globalSearch, setGlobalSearch] = useState('');
  const [inventoryTab, setInventoryTab] = useState('available');
  const [inventory, setInventory] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [toast, setToast] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => {
    // 1. Safety Timeout: Si tras 6 segundos no ha cargado, forzamos el fin para mostrar Login
    const safetyTimer = setTimeout(() => {
      setInitializing(prev => {
        if (prev) console.warn("⌚ Timeout de inicialización alcanzado. Forzando UI.");
        return false;
      });
    }, 3000);

    // 2. Escuchar cambios de Auth (Estado Real de Sesión)
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      const params = new URLSearchParams(window.location.search);
      const ghlLocationId = params.get('location_id');

      try {
        if (ghlLocationId) {
          const ghlLocationName = params.get('location_name');
          const ghlUserId = params.get('user_id');
          const ghlUserName = params.get('user_name');
          const ghlUserEmail = params.get('user_email');

          console.log("🌎 GHL Detectado:", ghlUserEmail);
          await loadUserProfile(ghlLocationId, true, ghlLocationName, {
            id: ghlUserId,
            name: ghlUserName,
            email: ghlUserEmail
          });
        } else if (firebaseUser && firebaseUser.email) {
          // Si Firebase ya tiene sesión, cargamos el perfil
          await loadUserProfile(firebaseUser.email);
        } else {
          // Si no hay nada, revisamos localstorage como fallback legacy
          const savedEmail = localStorage.getItem('carbot_user_email');
          if (savedEmail) await loadUserProfile(savedEmail);
          else setInitializing(false);
        }
      } catch (err) {
        console.error("Critical Init Error:", err);
        setInitializing(false);
      } finally {
        clearTimeout(safetyTimer);
      }
    });

    return () => {
      unsubscribeAuth();
      clearTimeout(safetyTimer);
    };
  }, []);

  // 2. FUNCIÓN: CARGAR PERFIL Y DETECTAR DEALER (CORE)
  const loadUserProfile = async (emailOrId, isGHL = false, ghlName = null, ghlUser = null, rememberMe = false) => {
    try {
      let userId = emailOrId.replace(/\./g, '_').toLowerCase(); // ID por defecto
      let dealerId = '';

      if (isGHL) {
        dealerId = emailOrId; // El primer parámetro es location_id si es GHL

        // --- LÓGICA DE FUSIÓN DE CUENTAS ---
        if (ghlUser && ghlUser.email) {
          const emailId = ghlUser.email.replace(/\./g, '_').toLowerCase();
          userId = emailId;
          console.log("🔗 Intentando vincular por email:", userId);
        }
        else if (ghlUser && ghlUser.id) {
          userId = `${dealerId}_${ghlUser.id}`;
        }
      }

      const userDocRef = doc(db, "users", userId);
      const userDocSnap = await getDoc(userDocRef);

      const realDealerName = ghlName || (isGHL ? "Dealer GHL" : "Mi Dealer");
      const realEmployeeName = (ghlUser && ghlUser.name) ? ghlUser.name : (localStorage.getItem('carbot_employee_real_name') || userId);

      let profileData;

      if (userDocSnap.exists()) {
        profileData = userDocSnap.data();

        // Si vienes de GHL, actualizamos tu perfil viejo para que tenga el dealerId nuevo
        if (isGHL) {
          await updateDoc(userDocRef, {
            dealerId: dealerId,
            dealerName: realDealerName,
            lastLoginGHL: new Date().toISOString()
          });
          profileData.dealerId = dealerId;
          profileData.dealerName = realDealerName;
        } else if (!profileData.dealerName) {
          // Migración: Si es un usuario viejo sin dealerName, le asignamos uno por defecto
          await updateDoc(userDocRef, { dealerName: realDealerName });
          profileData.dealerName = realDealerName;
        }
      } else {
        // USUARIO NUEVO
        if (!isGHL || (isGHL && realEmployeeName === userId)) {
          setInitializing(false);
          showOnboarding(realDealerName, async (finalName, finalPosition) => {
            const newProfile = {
              email: userId,
              name: finalName,
              position: finalPosition,
              dealerId: isGHL ? dealerId : "",
              dealerName: realDealerName,
              role: 'sales',
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newProfile);

            // Persistir para Multi-Tenant
            localStorage.setItem('carbot_app_user_v1', JSON.stringify({
              dealer: realDealerName,
              name: finalName,
              email: userId
            }));

            setUserProfile(newProfile);
            setIsLoggedIn(true);
            showToast(`¡Bienvenido ${finalName}!`);
            setOnboardingDialog(prev => ({ ...prev, isOpen: false }));
          });
          return;
        }

        const newProfile = {
          email: userId,
          name: realEmployeeName,
          dealerId: isGHL ? dealerId : "",
          dealerName: realDealerName,
          role: 'sales',
          createdAt: new Date().toISOString()
        };

        await setDoc(userDocRef, newProfile);
        profileData = newProfile;
      }

      // Persistir para Multi-Tenant
      localStorage.setItem('carbot_app_user_v1', JSON.stringify({
        dealer: profileData.dealerName,
        name: profileData.name,
        email: profileData.email
      }));

      setUserProfile(profileData);
      setIsLoggedIn(true);
      if (!isGHL && rememberMe) localStorage.setItem('carbot_user_email', emailOrId);

    } catch (error) {
      console.error("Error cargando perfil:", error);
      showToast("Error de conexión", "error");
    } finally {
      setInitializing(false);
    }
  };



  // 3. ROBOT DE LIMPIEZA AUTOMÁTICA (Papelera > 7 Días) 🧹🤖
  useEffect(() => {
    const limpiarPapelera = async () => {
      const dealerName = userProfile?.dealerName;
      if (!dealerName) return;

      // 1. Calcular la fecha de hace 7 días
      const hace7Dias = new Date();
      hace7Dias.setDate(hace7Dias.getDate() - 7);
      const fechaLimite = hace7Dias.toISOString();

      try {
        // 2. Buscar basura vieja
        const q = query(
          collection(db, "Dealers", dealerName, "Papelera"),
          where("fechaEliminacion", "<", fechaLimite)
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.log("🧹 La papelera está limpia (nada viejo).");
          return;
        }

        // 3. Borrar todo lo viejo de un golpe
        const batch = writeBatch(db);
        snapshot.forEach((documento) => {
          batch.delete(documento.ref);
        });

        await batch.commit();
        console.log(`🗑️ Limpieza Automática: Se eliminaron ${snapshot.size} ítems viejos.`);

      } catch (error) {
        console.error("Error limpiando papelera:", error);
      }
    };

    if (userProfile?.dealerName) {
      limpiarPapelera();
    }
  }, [userProfile?.dealerName]);


  // 4. HANDLERS LOGIN / LOGOUT
  const handleLogin = (emailId, rememberMe) => {
    setInitializing(true); // Mostrar carga mientras buscamos
    loadUserProfile(emailId, false, "", null, rememberMe);
  };

  const handleLogout = () => {
    showConfirm({
      title: 'Cerrar Sesión',
      message: '¿Estás seguro que deseas salir del sistema?',
      onConfirm: async () => {
        try {
          await signOut(auth);
          localStorage.removeItem('carbot_user_email');
          localStorage.removeItem('activeTab');
          localStorage.removeItem('carbot_app_user_v1');
          setUser(null);
          setUserProfile(null);
          setIsLoggedIn(false);
          setInventory([]);
          setContracts([]);
          setQuotes([]);
        } catch (err) {
          showToast("Error al cerrar sesión", "error");
        }
      }
    });
  };

  useEffect(() => { localStorage.setItem('activeTab', activeTab); }, [activeTab]);

  useEffect(() => {
    // Si no hay usuario logueado o no tiene dealerId, no cargamos nada (Seguridad)
    if (!isLoggedIn || !userProfile || !userProfile.dealerName) {
      setInventory([]);
      setContracts([]);
      setQuotes([]);
      return;
    }

    const dealerName = userProfile.dealerName;
    console.log("🔒 Cargando datos seguros para Dealer (Rutas Privadas):", dealerName);

    // 1. Cargar SOLO mi Inventario (Vehículos)
    const qInventory = collection(db, "Dealers", dealerName, "Inventario");

    const unsubscribeInventory = onSnapshot(qInventory, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventory(data);

      const now = new Date();
      data.forEach(async (v) => {
        if (v.status === 'trash' && v.deletedAt) {
          const deleteDate = new Date(v.deletedAt);
          const diffDays = (now.getTime() - deleteDate.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 15) {
            try {
              await deleteDoc(doc(db, "Dealers", dealerName, "Inventario", v.id));
              console.log(`Auto-eliminado ${v.id} de Inventario (>15 días)`);
            } catch (e) { console.error("Error auto-limpieza", e); }
          }
        }
      });
    });

    // 2. Cargar SOLO mis Contratos
    const qContracts = collection(db, "Dealers", dealerName, "Contratos");

    const unsubscribeContracts = onSnapshot(qContracts, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setContracts(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

      const now = new Date();
      data.forEach(async (c) => {
        if (c.status === 'trash' && c.deletedAt) {
          const diffDays = (now.getTime() - new Date(c.deletedAt).getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 15) await deleteDoc(doc(db, "Dealers", dealerName, "Contratos", c.id));
        }
      });
    });

    // 3. Cargar SOLO mis Cotizaciones
    const qQuotes = collection(db, "Dealers", dealerName, "Cotizaciones");

    const unsubscribeQuotes = onSnapshot(qQuotes, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuotes(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

      const now = new Date();
      data.forEach(async (q) => {
        if (q.status === 'trash' && q.deletedAt) {
          const diffDays = (now.getTime() - new Date(q.deletedAt).getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays > 15) await deleteDoc(doc(db, "Dealers", dealerName, "Cotizaciones", q.id));
        }
      });
    });

    return () => {
      unsubscribeInventory();
      unsubscribeContracts();
      unsubscribeQuotes();
    };
  }, [userProfile]);

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center animate-pulse">
          <div className="mb-6 animate-bounce">
            <AppLogo size={80} />
          </div>
          <p className="text-slate-400 font-medium mb-4">Cargando sesión...</p>
          <button
            onClick={() => setInitializing(false)}
            className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline border border-red-100 px-4 py-2 rounded-xl bg-red-50"
          >
            Cancelar Carga (Forzar Entrada)
          </button>
        </div>
      </div>
    );
  }

  // 3. GUARDAR VEHÍCULO (Multi-Tenant)
  const handleSaveVehicle = async (vehicleData) => {
    try {
      const dealerName = userProfile?.dealerName || vehicleData.dealerName;

      if (!dealerName) {
        showToast("Error Multi-Tenant: Falta dealerName", "error");
        console.error("❌ Error Multi-Tenant: Falta dealerName");
        return;
      }

      // 1. OBTENER LOS ÚLTIMOS 4 DEL CHASIS
      const chasis = vehicleData.vin || vehicleData.chassis || "0000";
      const ultimos4 = chasis.slice(-4);

      // 2. CONSTRUIR EL ID (Incluyendo Edición)
      const idBonito = `${vehicleData.year || '0000'}_${vehicleData.make || 'GENERIC'}_${vehicleData.model || 'MODEL'}_${vehicleData.edition || 'Base'}_${vehicleData.color || 'COLOR'}_${ultimos4}`
        .replace(/\s+/g, '_')
        .toUpperCase();

      const vehicleRef = doc(db, "Dealers", dealerName, "Inventario", idBonito);

      const dataToSave = {
        ...vehicleData,
        dealerId: userProfile?.dealerId || "",
        dealerName: dealerName,
        creadoPor: userProfile?.name || "Sistema",
        createdAt: vehicleData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: vehicleData.status || 'available',
        idPersonalizado: idBonito
      };

      // Guardamos el ID original antes de borrarlo del payload
      const originalId = vehicleData.id;
      delete dataToSave.id;

      // 3. GUARDAR (Upsert)
      await setDoc(vehicleRef, dataToSave, { merge: true });

      // 4. PREVENIR DUPLICADOS AL EDITAR (Move/Rename)
      // Si es una edición (tenemos ID original) Y el ID nuevo es diferente al original
      if (originalId && originalId !== idBonito) {
        console.log(`🔄 Renombrando vehículo: ${originalId} -> ${idBonito}`);
        try {
          // Borramos el doc con el ID viejo para no dejar duplicados
          const oldVehicleRef = doc(db, "Dealers", dealerName, "Inventario", originalId);
          await deleteDoc(oldVehicleRef);
          showToast(`Vehículo actualizado y renombrado a: ${idBonito}`);
        } catch (delError) {
          console.error("⚠️ Error borrando ID antiguo:", delError);
          // No fallamos toda la operación, pero avisamos
        }
      } else {
        showToast(`Vehículo guardado: ${idBonito}`);
      }

      console.log(`✅ Operación completada: Dealers/${dealerName}/Inventario/${idBonito}`);

    } catch (error) {
      console.error("❌ Error al guardar vehículo:", error);
      showToast("Hubo un error al guardar.", "error");
    }
  };

  // 4. SOFT DELETE (Enviar a Papelera)
  const handleDeleteVehicle = async (id) => {
    try {
      const dealerName = userProfile?.dealerName;
      if (!dealerName) return;
      const vehicleRef = doc(db, "Dealers", dealerName, "Inventario", id);
      await updateDoc(vehicleRef, {
        status: 'trash',
        deletedAt: new Date().toISOString()
      });
      showToast("Vehículo movido a la papelera");
    } catch (error) {
      console.error(error);
      showToast("Error al eliminar", "error");
    }
  };

  const handleRestore = async (id, type) => {
    try {
      const dealerName = userProfile?.dealerName;
      if (!dealerName) return;
      const coll = type === 'vehicle' ? 'Inventario' : (type === 'contract' ? 'Contratos' : 'Cotizaciones');
      const docRef = doc(db, "Dealers", dealerName, coll, id);
      await updateDoc(docRef, {
        status: type === 'vehicle' ? 'available' : 'active',
        deletedAt: null,
        updatedAt: new Date().toISOString()
      });
      showToast(`${type === 'vehicle' ? 'Vehículo' : 'Documento'} restaurado con éxito`);
    } catch (error) {
      console.error("Error al restaurar:", error);
      showToast("Error al restaurar", "error");
    }
  };

  const handleRevertSale = async (vehicleId) => {
    try {
      if (!userProfile?.dealerName) return;

      const vehicleRef = doc(db, "Dealers", userProfile.dealerName, "Inventario", vehicleId);

      await updateDoc(vehicleRef, {
        status: 'available',
        salePrice: deleteField(),
        saleDate: deleteField(),
        client: deleteField(),
        cedula: deleteField(),
        updatedAt: new Date().toISOString()
      });

      showToast("Venta eliminada. Vehículo disponible nuevamente.", "success");
    } catch (error) {
      console.error("Error revirtiendo venta:", error);
      showToast("Error al eliminar venta", "error");
    }
  };

  const handleMarkAsSold = async (vehicle, clientName) => {
    try {
      const dealerName = userProfile?.dealerName;
      if (!dealerName || !clientName) {
        showToast("Faltan datos para la venta", "error");
        return;
      }

      const idVenta = `${vehicle.idPersonalizado || vehicle.id}_VENDIDO`;

      // 1. Guardar en carpeta VENDIDOS (Historial)
      await setDoc(doc(db, "Dealers", dealerName, "VehiculosVendidos", idVenta), {
        ...vehicle,
        comprador: clientName,
        fechaVenta: new Date().toISOString().split('T')[0],
        status: "sold"
      });

      // 2. Borrar de INVENTARIO
      await deleteDoc(doc(db, "Dealers", dealerName, "Inventario", vehicle.id));

      showConfirm({
        title: '¡Vehículo Vendido!',
        message: `Felicidades. El vehículo ha sido movido al historial de ventas de ${clientName}.`,
        showCancel: false,
        confirmText: 'Excelente'
      });

    } catch (error) {
      console.error("Error al vender:", error);
      showToast("Error registrando la venta", "error");
    }
  };

  const handlePermanentDelete = async (id, type) => {
    showConfirm({
      title: 'Borrado Definitivo',
      message: '¿Estás completamente seguro? Esta acción borrará el dato para siempre.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const dealerName = userProfile?.dealerName;
          if (!dealerName) return;
          const coll = type === 'vehicle' ? 'Inventario' : (type === 'contract' ? 'Contratos' : 'Cotizaciones');
          await deleteDoc(doc(db, "Dealers", dealerName, coll, id));
          showToast("Eliminado para siempre");
        } catch (error) {
          console.error("Error al eliminar:", error);
          showToast("Error al eliminar", "error");
        }
      }
    });
  };

  const handleEmptyTrash = async () => {
    showConfirm({
      title: 'Vaciar Papelera',
      message: 'Esto eliminará TODO el contenido de la papelera permanentemente.',
      isDestructive: true,
      onConfirm: async () => {
        try {
          const dealerName = userProfile?.dealerName;
          if (!dealerName) return;

          // Vaciar vehículos
          const trashV = inventory.filter(i => i.status === 'trash');
          for (const item of trashV) await deleteDoc(doc(db, "Dealers", dealerName, "Inventario", item.id));

          // Vaciar contratos
          const trashC = contracts.filter(i => i && i.status === 'trash');
          for (const item of trashC) await deleteDoc(doc(db, "Dealers", dealerName, "Contratos", item.id));

          // Vaciar cotizaciones
          const trashQ = quotes.filter(i => i && i.status === 'trash');
          for (const item of trashQ) await deleteDoc(doc(db, "Dealers", dealerName, "Cotizaciones", item.id));

          showToast("Papelera vaciada por completo");
        } catch (err) {
          console.error(err);
          showToast("Error al vaciar", "error");
        }
      }
    });
  };

  // Funciones locales (Contratos, etc.)
  const handleQuoteSent = async (quoteData) => {
    try {
      const dealerName = userProfile?.dealerName;
      if (!dealerName) return;
      const vId = quoteData.vehicleId || selectedVehicle?.id;
      const vName = quoteData.vehicle || (selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : 'Vehículo Desconocido');

      const newQuote = {
        ...quoteData,
        vehicleId: vId,
        vehicle: vName,
        dealerId: userProfile?.dealerId,
        dealerName: dealerName,
        status: 'active',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, "Dealers", dealerName, "Cotizaciones"), newQuote);

      if (vId) {
        const vehicleRef = doc(db, "Dealers", dealerName, "Inventario", vId);
        await updateDoc(vehicleRef, { status: 'quoted', updatedAt: new Date().toISOString() });
      }
      showToast("Cotización guardada");
    } catch (error) {
      console.error("Error al guardar cotización:", error);
      showToast("Error al procesar la cotización", "error");
    }
  };

  const handleGenerateContract = async (contractData) => {
    try {
      const dealerName = userProfile?.dealerName;
      if (!dealerName) return;

      const { id, ...data } = contractData;

      // SI YA VIENE CON ID (EDICION), SE MANTIENE EL FLUJO VIEJO O SE PODRIA RE-CALCULAR
      if (id) {
        const contractRef = doc(db, "Dealers", dealerName, "Contratos", id);
        await updateDoc(contractRef, {
          ...data,
          updatedAt: new Date().toISOString()
        });
        showToast("Contrato actualizado con éxito");
      } else {
        // --- LOGICA DE ID PERSONALIZADO PARA NUEVOS CONTRATOS ---

        // 1. OBTENER DATOS CLAVE
        const clienteLimpio = (contractData.client || "Cliente").replace(/\s+/g, '_').toUpperCase();
        const vehiculoLimpio = (contractData.vehicle || "Vehiculo").replace(/\s+/g, '_').toUpperCase();
        // Usamos la fecha actual en formato YYYY-MM-DD
        const fechaHoy = new Date().toISOString().split('T')[0];

        // 2. OBTENER LOS ÚLTIMOS 4 DEL CHASIS
        // Esperamos que en 'contractData' o en 'contractData.vehicleData' venga el vin.
        // Si no está directo, intentamos sacarlo de 'data'.
        const chasis = contractData.vin || contractData.chassis || "0000";
        const ultimos4 = chasis.slice(-4);

        // 3. CONSTRUIR EL ID
        const idBonito = `${clienteLimpio}_${vehiculoLimpio}_${fechaHoy}_${ultimos4}`;

        const newContract = {
          ...data,
          dealerId: userProfile?.dealerId,
          dealerName: dealerName,
          createdAt: new Date().toISOString(),
          status: "pending",
          idPersonalizado: idBonito,
          vin: chasis // Asegurar que se guarde el vin
        };

        // 4. GUARDAR CON setDoc
        await setDoc(doc(db, "Dealers", dealerName, "Contratos", idBonito), newContract);

        if (contractData.vehicleId) {
          const vehicleRef = doc(db, "Dealers", dealerName, "Inventario", contractData.vehicleId);
          await updateDoc(vehicleRef, {
            status: 'sold',
            updatedAt: new Date().toISOString(),
            salePrice: Number(contractData.price),
            saleDate: new Date().toISOString()
          });
        }

        console.log(`✅ Contrato guardado: ${idBonito}`);
        showToast(`Contrato generado: ${idBonito}`);
      }
    } catch (error) {
      console.error("Error al procesar contrato:", error);
      showToast("Error al procesar el contrato", "error");
    }
  };

  const handleDeleteContract = async (id) => {
    const dealerName = userProfile?.dealerName;
    if (!dealerName) return;
    await updateDoc(doc(db, "Dealers", dealerName, "Contratos", id), {
      status: 'trash',
      deletedAt: new Date().toISOString()
    });
    showToast("Contrato movido a la papelera");
  };

  const handleDeleteQuote = async (id) => {
    const dealerName = userProfile?.dealerName;
    if (!dealerName) return;
    await updateDoc(doc(db, "Dealers", dealerName, "Cotizaciones", id), {
      status: 'trash',
      deletedAt: new Date().toISOString()
    });
    showToast("Cotización movida a la papelera");
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleNavigate = (tab, filter = 'all') => {
    setSelectedVehicle(null);
    setActiveTab(tab);
    if (tab === 'inventory' && filter) setInventoryTab(filter);
  };

  const handleUpdateProfile = async (data) => {
    try {
      const emailId = userProfile.email.replace(/\./g, '_').toLowerCase();
      const userDocRef = doc(db, "users", emailId);
      await updateDoc(userDocRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
      const newProfile = { ...userProfile, ...data };
      setUserProfile(newProfile);

      // Sincronizar localStorage para Multi-Tenant
      localStorage.setItem('carbot_app_user_v1', JSON.stringify({
        dealer: newProfile.dealerName,
        name: newProfile.name,
        email: newProfile.email
      }));

      showToast("Perfil actualizado correctamente");
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      showToast("Error al actualizar", "error");
    }
  };

  const renderContent = () => {
    if (selectedVehicle) {
      const associatedContract = contracts.find(c => c.vehicleId === selectedVehicle.id);
      return (
        <VehicleEditView
          vehicle={selectedVehicle}
          contract={associatedContract}
          onBack={() => setSelectedVehicle(null)}
          onSave={async (data) => { await handleSaveVehicle(data); setSelectedVehicle(null); }}
          onRevert={handleRevertSale}
          onSell={handleMarkAsSold}
          showConfirm={showConfirm}
        />
      );
    }

    // Filtros Globales
    const activeInventory = (inventory || []).filter(i => i && i.status !== 'trash');
    const trashInventory = (inventory || []).filter(v => v && v.status === 'trash');
    const trashDocuments = [
      ...(contracts || []).filter(c => c && c.status === 'trash').map(c => ({ ...c, type: 'contract' })),
      ...(quotes || []).filter(q => q && q.status === 'trash').map(q => ({ ...q, type: 'quote' }))
    ];

    switch (activeTab) {
      case 'dashboard': return <DashboardView inventory={activeInventory} contracts={(contracts || []).filter(c => c && c.status !== 'trash')} quotes={quotes} onNavigate={handleNavigate} userProfile={userProfile} />;
      case 'inventory': return <InventoryView inventory={activeInventory} quotes={quotes} activeTab={inventoryTab} setActiveTab={setInventoryTab} showToast={showToast} onGenerateContract={handleGenerateContract} onGenerateQuote={handleQuoteSent} onVehicleSelect={handleVehicleSelect} onSave={handleSaveVehicle} onDelete={handleDeleteVehicle} userProfile={userProfile} searchTerm={globalSearch} showConfirm={showConfirm} onDuplicate={handleDuplicate} />;
      case 'contracts': return <ContractsView contracts={(contracts || []).filter(c => c && c.status !== 'trash')} quotes={(quotes || []).filter(q => q && q.status !== 'trash')} inventory={activeInventory} onGenerateContract={handleGenerateContract} onDeleteContract={handleDeleteContract} onGenerateQuote={handleQuoteSent} onDeleteQuote={handleDeleteQuote} userProfile={userProfile} searchTerm={globalSearch} showConfirm={showConfirm} />;
      case 'settings': return <SettingsView userProfile={userProfile} onUpdateProfile={handleUpdateProfile} onLogout={handleLogout} />;
      case 'trash': return <TrashView trashInventory={trashInventory} trashDocuments={trashDocuments} onRestore={handleRestore} onPermanentDelete={handlePermanentDelete} onEmptyTrash={handleEmptyTrash} showToast={showToast} />;
      default: return <DashboardView inventory={activeInventory} contracts={(contracts || []).filter(c => c && c.status !== 'trash')} onNavigate={handleNavigate} userProfile={userProfile} />;
    }
  };

  return (
    <>
      {(!isLoggedIn || !userProfile) ? (
        <ErrorBoundary>
          <LoginScreen onLogin={handleLogin} />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <AppLayout
            activeTab={activeTab}
            setActiveTab={handleNavigate}
            onLogout={handleLogout}
            userProfile={userProfile}
            searchTerm={globalSearch}
            onSearchChange={setGlobalSearch}
          >
            {renderContent()}
          </AppLayout>
        </ErrorBoundary>
      )}

      {/* Global Modals (Hoisted for visibility during Onboarding/Login) */}
      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        isDestructive={confirmDialog.isDestructive}
        showCancel={confirmDialog.showCancel}
        confirmText={confirmDialog.confirmText}
      />
      <PromptModal
        isOpen={promptDialog.isOpen}
        onClose={() => setPromptDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={promptDialog.onConfirm}
        title={promptDialog.title}
        message={promptDialog.message}
        defaultValue={promptDialog.defaultValue}
        placeholder={promptDialog.placeholder}
      />
      <WelcomeModal
        isOpen={onboardingDialog.isOpen}
        dealerName={onboardingDialog.dealerName}
        onConfirm={onboardingDialog.onConfirm}
      />
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}