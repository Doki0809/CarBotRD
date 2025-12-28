import VehicleEditView from './VehicleEditView.jsx';
import React, { useState, useEffect, useMemo } from 'react';
import { db, auth, storage } from './firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  collection,
  onSnapshot,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';

import {
  LayoutDashboard, Car, FileText, LogOut, Plus, Search, Edit, Trash2,
  DollarSign, CheckCircle, X, Menu, User, Send, Loader2, FilePlus,
  CreditCard, FileSignature, Files, Fuel, Settings, IdCard, Trash, Undo, Printer, Eye, Download,
  Box, AlertTriangle, TrendingUp, History, Bell, Calendar
} from 'lucide-react';

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

const Select = ({ label, options, ...props }) => (
  <div className="mb-4 group">
    <label className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-red-700 transition-colors">{label}</label>
    <select className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer" {...props}>
      {options.map(opt => {
        const isObj = typeof opt === 'object';
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

const ActionSelectionModal = ({ isOpen, onClose, onSelect }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-sm animate-in zoom-in-95 duration-200">
        <Card>
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

const VehicleFormModal = ({ isOpen, onClose, onSave, initialData }) => {
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
      alert(`Límite excedido. El inventario permite un máximo de 10 fotos. Actualmente tienes ${totalCurrent} y estás intentando agregar ${files.length}.`);
      return;
    }

    if (files.length > 0) {
      const newItems = files.map(file => ({
        url: URL.createObjectURL(file),
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

    if (photos.length === 0) {
      alert("Debes subir al menos 1 foto del vehículo.");
      return;
    }

    setLoading(true);

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Convertir números
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

      uploadedUrls = [...existingUrls];

      // SUBIR ARCHIVOS NUEVOS
      if (filesToUpload.length > 0) {
        setUploadProgress(`Preparando ${filesToUpload.length} imágenes...`);

        for (let i = 0; i < filesToUpload.length; i++) {
          const item = filesToUpload[i];
          setUploadProgress(`Subiendo foto ${i + 1} de ${filesToUpload.length}...`);

          try {
            const storageRef = ref(storage, `vehicles/${Date.now()}_${item.file.name}`);
            const snapshot = await uploadBytes(storageRef, item.file);
            const downloadUrl = await getDownloadURL(snapshot.ref);
            uploadedUrls.push(downloadUrl);
          } catch (err) {
            console.error(`Error al subir la imagen ${i + 1}:`, err);
            // Podríamos continuar o fallar aquí
          }
        }
        setUploadProgress('¡Carga completada!');
      }

      data.images = uploadedUrls;
      data.image = uploadedUrls[0] || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800';
      delete data.image_url_hidden;

      if (initialData?.id) {
        data.id = initialData.id;
      }

      await onSave(data);
      setLoading(false);
      setUploadProgress('');
      onClose();
    } catch (error) {
      console.error("Error crítico al guardar:", error);
      alert("Error al procesar el guardado. Revisa tu conexión.");
      setLoading(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-4xl animate-in zoom-in-95 duration-200">
        <Card className="w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 sticky top-0 bg-white z-10">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg text-red-600"><Car size={20} /></div>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2 font-bold">Galería de Fotos (Mínimo 1, Máximo 10)</label>
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

  if (!isOpen) return null;

  const handleSend = (e) => {
    e.preventDefault();
    setLoading(true);
    // Capturar datos del formulario
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      lastname: formData.get('lastname'),
      phone: formData.get('phone'),
      cedula: cedula,
      bank: bankName
    };

    setTimeout(() => {
      onConfirm(data);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-md animate-in zoom-in-95 duration-200">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <div className="p-2 bg-red-50 rounded-lg mr-3"><Send size={18} className="text-red-600" /></div>
              Cotizar: {userProfile?.dealerName}
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Se enviará la ficha del <strong className="text-slate-900">{vehicle.make} {vehicle.model}</strong> a nombre de <strong className="text-slate-900">{userProfile?.name}</strong>.
          </p>
          <form onSubmit={handleSend}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input name="name" label="Nombre Cliente" placeholder="Ej. Jean" required />
              <Input name="lastname" label="Apellido" placeholder="Ej. Gómez" required />
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input name="phone" label="Teléfono" placeholder="+1 829..." required />
              <Input
                name="cedula"
                label="Cédula"
                placeholder="001-0000000-0"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                required
              />
            </div>
            <div className="bg-red-50/50 p-3 rounded-xl border border-red-100/50 mb-4">
              <Input
                label="Banco Dirigido"
                placeholder="Ej. Banco Popular"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="mb-0 bg-white"
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} type="button" disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>{loading ? <><Loader2 className="animate-spin mr-2" size={18} /> Enviando...</> : 'Enviar Cotización'}</Button>
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
      // Find template ID by name
      const template = CONTRACT_TEMPLATES.find(t => t.name === initialVehicle.template);
      if (template) setSelectedTemplate(template.id);
    } else {
      setSelectedTemplate('');
      setSelectedVehicleId('');
      setClientName('');
      setClientLastName('');
      setClientCedula('');
    }
  }, [initialVehicle, isOpen]);

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
        price: vehicle.price_dop > 0 ? vehicle.price_dop : vehicle.price,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-2xl animate-in zoom-in-95 duration-200">
        <Card className="max-h-[90vh] overflow-y-auto">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">3. Elige una Plantilla</label>
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
        <Card className="flex flex-col h-full bg-slate-50">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {trash.map(item => (
            <div key={item.id} className="relative group opacity-80 hover:opacity-100 transition-opacity">
              <Card noPadding className="flex flex-col h-full border-red-100 bg-red-50/30">
                <div className="relative aspect-[16/10] bg-gray-200 overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-500">
                  <img src={item.image} alt={item.model} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-red-900/10 mix-blend-multiply"></div>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-slate-800 text-lg line-through decoration-red-500/50">{item.make} {item.model}</h3>
                  <p className="text-xs font-semibold text-red-400 mb-4">Eliminado: {item.deletedAt ? new Date(item.deletedAt).toLocaleDateString() : 'Hoy'}</p>
                  <div className="mt-auto grid grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={() => onRestore(item.id)} className="w-full text-xs font-bold border-green-200 text-green-700 hover:bg-green-50 flex items-center justify-center gap-1"><Undo size={14} /> RESTAURAR</Button>
                    <Button variant="secondary" onClick={() => onPermanentDelete(item.id)} className="w-full text-xs font-bold border-red-200 text-red-700 hover:bg-red-50 flex items-center justify-center gap-1"><X size={14} /> BORRAR</Button>
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

const DashboardView = ({ inventory, contracts, onNavigate, userProfile }) => {
  const stats = [
    { label: 'TOTAL INVENTARIO', value: inventory.length.toLocaleString(), icon: Car, color: 'text-blue-600', bg: 'bg-blue-50', badge: '+12 nuevos', badgeColor: 'bg-emerald-100 text-emerald-700', action: () => onNavigate('inventory', 'all') },
    { label: 'TOTAL VENDIDOS', value: inventory.filter(i => i.status === 'sold').length, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', badge: 'En crecimiento', badgeColor: 'bg-emerald-100 text-emerald-700', action: () => onNavigate('inventory', 'sold') },
    { label: 'VALOR TOTAL', value: `$${(inventory.reduce((acc, current) => acc + (current.price || 0), 0) / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50', badge: '+5.4% mes', badgeColor: 'bg-emerald-100 text-emerald-700', action: () => onNavigate('inventory', 'sold') },
  ];

  const recentContracts = contracts.slice(0, 3);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Dashboard Header / Greeting */}
      <Card className="relative overflow-hidden border-none bg-red-600 text-white shadow-xl shadow-red-600/20">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              Gestión de Inventario 📦
            </h1>
            <p className="text-red-50 mt-2 text-lg">
              Bienvenido, <span className="font-bold">{userProfile?.name?.split(' ')[0] || 'Usuario'}</span>.
              Listo para vender y gestionar tu inventario hoy.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" className="bg-white/10 border-white/20 text-white hover:bg-white/20" onClick={() => onNavigate('contracts')}>Ver Reporte</Button>
            <Button className="bg-white !text-red-600 hover:bg-red-50 shadow-xl" onClick={() => onNavigate('inventory')} icon={Plus}>Agregar Vehículo</Button>
          </div>
        </div>
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="group cursor-pointer hover:shadow-xl transition-all active:scale-[0.98]" onClick={stat.action}>
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color}`}>
                <stat.icon size={24} />
              </div>
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${stat.badgeColor}`}>
                {stat.badge}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-3xl font-black text-slate-900">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Bottom Section: Recent Contracts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <History size={20} className="text-red-600" /> Contratos Recientes
            </h3>
            <button onClick={() => onNavigate('contracts')} className="text-xs font-black text-red-600 uppercase hover:underline">Ver todo</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                <tr>
                  <th className="pb-4">Producto</th>
                  <th className="pb-4">Cliente</th>
                  <th className="pb-4">Fecha</th>
                  <th className="pb-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentContracts.length > 0 ? recentContracts.map(contract => (
                  <tr key={contract.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                          <Car size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">{contract.vehicle}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{contract.template}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 text-sm font-bold text-slate-700">{contract.client}</td>
                    <td className="py-5 text-sm text-slate-500 font-medium">{new Date(contract.createdAt).toLocaleDateString()}</td>
                    <td className="py-5 text-sm font-black text-slate-900 text-right">
                      {contract.price ? `$${contract.price.toLocaleString()}` : 'Ver Detalle'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="3" className="py-10 text-center text-slate-400 font-bold">Sin movimientos recientes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="mb-8">
            <h3 className="text-xl font-black text-slate-900">Actividad</h3>
          </div>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="relative">
                <div className="w-3 h-3 bg-red-600 rounded-full mt-1.5 ring-4 ring-red-100"></div>
                <div className="absolute top-6 bottom-0 left-[5px] w-0.5 bg-slate-100"></div>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Base de datos conectada</p>
                <p className="text-xs text-slate-500 mt-1">Sincronizado con Firebase</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-3 h-3 bg-slate-200 rounded-full mt-1.5"></div>
              <div>
                <p className="text-sm font-bold text-slate-400">Próximos reportes</p>
                <p className="text-xs text-slate-400 mt-1">Programado para mañana</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const InventoryView = ({ inventory, showToast, onGenerateContract, onVehicleSelect, onSave, onDelete, activeTab, setActiveTab, userProfile, searchTerm }) => {
  const [localSearch, setLocalSearch] = useState(''); // Search inside the view
  const [sortConfig, setSortConfig] = useState('date_desc'); // New sorting state
  // const [activeTab, setActiveTab] = useState('available'); // Levantado al padre
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState(null);

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
        case 'name_asc': return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`);
        case 'brand_asc': return a.make.localeCompare(b.make);
        default: return 0;
      }
    });

    return result;
  }, [inventory, searchTerm, localSearch, activeTab, sortConfig]);

  const groupedInventory = useMemo(() => {
    const groups = {};
    filteredInventory.forEach(item => {
      if (!groups[item.make]) groups[item.make] = [];
      groups[item.make].push(item);
    });
    return groups;
  }, [filteredInventory]);
  const sortedBrands = Object.keys(groupedInventory).sort();

  const handleCreate = () => { setCurrentVehicle(null); setIsModalOpen(true); };

  const handleSaveWrapper = (data) => {
    onSave(data);
    setIsModalOpen(false);
    setCurrentVehicle(null);
  };

  const handleDeleteWrapper = (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este vehículo de la Base de Datos?')) {
      onDelete(id);
    }
  };

  const openActionModal = (vehicle) => { setCurrentVehicle(vehicle); setIsActionModalOpen(true); };
  const handleActionSelect = (action) => {
    setIsActionModalOpen(false);
    if (action === 'quote') setIsQuoteModalOpen(true);
    else if (action === 'contract') setIsContractModalOpen(true);
  };

  const handleQuoteSent = () => {
    setIsQuoteModalOpen(false);
    showToast("Cotización enviada a GoHighLevel");
    // Actualizar estado en Firebase a 'quoted'
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 pb-6">
        <div><h1 className="text-2xl font-bold text-slate-900">Inventario: <span className="text-red-700">{userProfile?.dealerName}</span></h1><p className="text-slate-500 text-sm mt-1">Organizado por marcas • {filteredInventory.length} vehículos</p></div>
        <Button onClick={handleCreate} icon={Plus} className="shadow-lg shadow-red-600/20">Agregar Vehículo</Button>
      </div>

      <div className="flex space-x-1 bg-slate-100/80 p-1 rounded-xl w-full sm:w-fit backdrop-blur-sm">
        <button onClick={() => setActiveTab('available')} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'available' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Disponibles</button>
        <button onClick={() => setActiveTab('sold')} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'sold' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Vendidos</button>
        <button onClick={() => setActiveTab('all')} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Todos</button>
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

      <div className="space-y-10">
        {sortedBrands.map(brand => (
          <div key={brand}>
            <div className="flex items-center mb-4"><h2 className="text-xl font-bold text-slate-800 mr-3">{brand}</h2><div className="h-px flex-1 bg-gray-200"></div><span className="text-xs font-medium text-gray-500 ml-3 bg-gray-100 px-2 py-1 rounded-full">{groupedInventory[brand].length}</span></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {groupedInventory[brand].map(item => (
                <div key={item.id} onClick={() => onVehicleSelect(item)} className="cursor-pointer">
                  <Card noPadding className="group flex flex-col h-full hover:-translate-y-1">
                    <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                      <img src={item.image} alt={item.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                      <div className="absolute top-3 right-3 shadow-sm"><Badge status={item.status} /></div>
                    </div>
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="font-bold text-slate-900 text-lg">{item.make} {item.model}</h3>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{item.year} • {item.vin ? item.vin.slice(-6) : 'N/A'}</p>
                      <div className="mt-2 mb-4">
                        <p className="text-xl font-bold text-red-700">
                          {item.status === 'sold' && <span className="text-[10px] block text-slate-400 uppercase">Precio de Venta</span>}
                          {item.price_dop > 0 ? `RD$ ${item.price_dop.toLocaleString()}` : `US$ ${item.price.toLocaleString()}`}
                        </p>
                      </div>
                      <div className="mt-auto grid grid-cols-2 gap-3">
                        <Button variant="secondary" className="w-full text-xs font-bold border-red-100 text-red-700 hover:bg-red-50 flex items-center justify-center gap-1" onClick={(e) => { e.stopPropagation(); openActionModal(item); }}><Files size={14} /> GENERAR</Button>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); setCurrentVehicle(item); setIsModalOpen(true); }} className="flex-1 flex items-center justify-center bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg text-gray-500 hover:text-red-600 transition-all"><Edit size={16} /></button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteWrapper(item.id); }} className="flex-1 flex items-center justify-center bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg text-gray-500 hover:text-red-600 transition-all"><Trash2 size={16} /></button>
                        </div>
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

      <VehicleFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveWrapper} initialData={currentVehicle} />
      <ActionSelectionModal isOpen={isActionModalOpen} onClose={() => setIsActionModalOpen(false)} onSelect={handleActionSelect} />
      <QuoteModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} vehicle={currentVehicle} onConfirm={handleQuoteSent} userProfile={userProfile} />
      <GenerateContractModal isOpen={isContractModalOpen} onClose={() => { setIsContractModalOpen(false); setCurrentVehicle(null); }} inventory={inventory} onGenerate={handleContractGenerated} initialVehicle={currentVehicle} />
    </div>
  );
};

const ContractsView = ({ contracts, inventory, onGenerateContract, onDeleteContract, userProfile, searchTerm }) => {
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [previewContract, setPreviewContract] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [sortConfig, setSortConfig] = useState('date_desc');

  const groupedContracts = useMemo(() => {
    // 1. Filtrar por búsqueda
    const filtered = contracts.filter(c =>
      (c?.client || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c?.vehicle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c?.template || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 2. Ordenar
    filtered.sort((a, b) => {
      const da = new Date(a.date || a.createdAt || 0);
      const db = new Date(b.date || b.createdAt || 0);
      switch (sortConfig) {
        case 'date_desc': return db - da;
        case 'date_asc': return da - db;
        case 'client_asc': return a.client.localeCompare(b.client);
        case 'vehicle_asc': return a.vehicle.localeCompare(b.vehicle);
        default: return 0;
      }
    });

    // 3. Agrupar (Solo si es por fecha, si no, un solo grupo "RESULTADOS")
    const groups = {};
    filtered.forEach(c => {
      let groupKey = "RESULTADOS DE BÚSQUEDA";
      if (sortConfig.startsWith('date')) {
        const rawDate = c.date || c.createdAt;
        const d = rawDate ? new Date(rawDate) : new Date();
        const validDate = isNaN(d.getTime()) ? new Date() : d;
        groupKey = validDate.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' }).toUpperCase();
      }

      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(c);
    });
    return groups;
  }, [contracts, searchTerm, sortConfig]);

  const handleDelete = (id) => {
    if (window.confirm("¿ESTÁS SEGURO? Esta acción no se puede deshacer y el contrato se eliminará para siempre.")) {
      onDeleteContract(id);
    }
  };

  const handleEdit = (contract) => {
    setEditingContract(contract);
    setIsGenerateModalOpen(true);
  };

  const downloadPDF = (contract) => {
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
              Este documento certifica la transacción del vehículo arriba descrito entre ${userProfile.dealerName} y el cliente ${contract.client}.
          </div>
          <div style="margin-top: 100px; display: flex; justify-content: space-between;">
              <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 10px;">Vendedor</div>
              <div style="border-top: 1px solid #000; width: 40%; text-align: center; padding-top: 10px;">Comprador</div>
          </div>
      </div>
    `;
    const opt = { margin: 0, filename: `Contrato_${contract.client}.pdf`, jsPDF: { unit: 'mm', format: 'a4' } };
    html2pdf().set(opt).from(tempEl).save();
  };

  const printQuick = (contract) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<html><body style="font-family: serif; padding: 40px;"><h1>${userProfile.dealerName}</h1><hr/><h2>${contract.template}</h2><p>Cliente: ${contract.client}</p><p>Vehículo: ${contract.vehicle}</p></body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Contratos (GHL)</h1>
          <p className="text-slate-500 text-sm mt-1">Historial organizado • {(groupedContracts ? Object.values(groupedContracts).flat().length : 0)} documentos</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select
            value={sortConfig}
            onChange={(e) => setSortConfig(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 cursor-pointer shadow-sm"
          >
            <option value="date_desc">Nuevos Primero</option>
            <option value="date_asc">Antiguos Primero</option>
            <option value="client_asc">Cliente (A-Z)</option>
            <option value="vehicle_asc">Vehículo</option>
          </select>
          <Button icon={FilePlus} onClick={() => { setEditingContract(null); setIsGenerateModalOpen(true); }} className="shadow-lg shadow-red-600/20">
            Generar Contrato
          </Button>
        </div>
      </div>

      <div className="space-y-12">
        {Object.keys(groupedContracts).map(monthYear => (
          <div key={monthYear} className="space-y-6">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-black text-slate-400 tracking-[0.2em] whitespace-nowrap">{monthYear}</h2>
              <div className="h-px w-full bg-slate-100"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedContracts[monthYear].map(contract => (
                <Card key={contract.id} noPadding className="group hover:-translate-y-1 transition-all">
                  <div className="p-6 border-b border-slate-50">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                        <FileText size={20} />
                      </div>
                      <Badge status={contract.status} />
                    </div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight mb-1">{contract.client}</h3>
                    <p className="text-xs font-bold text-slate-400 mb-4">{contract.vehicle}</p>
                    <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {new Date(contract.date || contract.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="text-[10px] font-black text-red-600/70">{contract.template}</span>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex gap-1">
                      <button onClick={() => setPreviewContract(contract)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm shadow-transparent hover:shadow-slate-200/50" title="Vista Previa"><Eye size={16} /></button>
                      <button onClick={() => downloadPDF(contract)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm shadow-transparent hover:shadow-slate-200/50" title="Descargar"><Download size={16} /></button>
                      <button onClick={() => printQuick(contract)} className="p-2 text-slate-400 hover:text-green-600 hover:bg-white rounded-lg transition-all shadow-sm shadow-transparent hover:shadow-slate-200/50" title="Imprimir"><Printer size={16} /></button>
                    </div>
                    <div className="flex gap-1 border-l border-slate-200 pl-2">
                      <button onClick={() => handleEdit(contract)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all shadow-sm shadow-transparent hover:shadow-slate-200/50" title="Editar"><Edit size={16} /></button>
                      <button onClick={() => handleDelete(contract.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm shadow-transparent hover:shadow-slate-200/50" title="Eliminar"><Trash2 size={16} /></button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {Object.keys(groupedContracts || {}).length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
          <FileText size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-bold">No hay contratos generados</p>
        </div>
      )}

      <GenerateContractModal
        isOpen={isGenerateModalOpen}
        onClose={() => { setIsGenerateModalOpen(false); setEditingContract(null); }}
        inventory={inventory}
        onGenerate={onGenerateContract}
        initialVehicle={editingContract ? { ...editingContract, contractId: editingContract.id } : null}
      />
      <ContractPreviewModal isOpen={!!previewContract} onClose={() => setPreviewContract(null)} contract={previewContract} userProfile={userProfile} />
    </div>
  );
};

// --- LAYOUT ---
const AppLayout = ({ children, activeTab, setActiveTab, onLogout, userProfile, searchTerm, onSearchChange }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Box },
    { id: 'contracts', label: 'Contratos', icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans selection:bg-red-200 selection:text-red-900">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm px-6 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          {/* Left: Logo & Brand */}
          <div className="flex-1 flex items-center">
            <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <AppLogo size={65} className="" />
              <span className="text-lg font-black text-slate-900 tracking-tight hidden sm:block">
                <span className="text-red-600">Inventario</span>
              </span>
            </div>
          </div>

          {/* Center: Main Nav Items */}
          <nav className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black transition-all duration-300 ${activeTab === item.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white'
                  }`}
              >
                <item.icon size={18} />
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Side: Search, Trash, User */}
          <div className="flex-1 flex items-center gap-4 justify-end">
            {/* Search Bar */}
            <div className="relative max-w-[200px] w-full hidden xl:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/10 focus:border-red-500/50 transition-all font-bold"
              />
            </div>

            {/* Trash instead of Bell */}
            <button
              onClick={() => setActiveTab('trash')}
              className={`p-2 rounded-xl transition-all ${activeTab === 'trash' ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
              title="Ir a Basurero"
            >
              <Trash2 size={20} />
            </button>

            {/* User Profile Info */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 leading-tight">{userProfile?.name?.split(' ')[0] || 'Jean C.'}</p>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-tighter">{userProfile?.dealerName || 'Almacén'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center text-red-600 font-black border-2 border-white shadow-sm ring-1 ring-red-100">
                {userProfile?.name?.charAt(0) || 'J'}
              </div>
              <button onClick={onLogout} className="p-2 text-slate-300 hover:text-red-600 transition-colors">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-8 w-full max-w-[1600px] mx-auto animate-in fade-in duration-500">
        {children}
      </main>
    </div>
  );
};

// --- Reemplaza tu LoginScreen actual con este ---
const LoginScreen = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');



  // 2. Lógica para correo/contraseña (Simulada por ahora, pero pasamos el email)
  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    const email = e.target.elements.email.value;
    // Simulamos delay de red
    setTimeout(() => {
      onLogin({ email });
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl border border-gray-100">
        <div className="text-center mb-10 flex flex-col items-center">
          <AppLogo size={120} className="mb-6" />
          <p className="text-slate-500 font-medium">Sistema Inteligente para Dealers</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center">
            <span className="mr-2">⚠️</span> {error}
          </div>
        )}

        <div className="space-y-6">


          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="email" label="Correo" placeholder="usuario@dealer.com" type="email" required />
            <Input label="Contraseña" type="password" required />
            <button type="submit" disabled={loading} className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl shadow-lg transition-all">
              {loading ? 'Cargando...' : 'Ingresar'}
            </button>
          </form>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="text-sm text-gray-600 font-medium">Recordarme</span>
            </label>
          </div>

        </div>
      </div>
    </div>
  );
};

// --- LOGICA PRINCIPAL (CEREBRO) ---
export default function CarbotApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  // Nuevo Estado: Filtro de Inventario (Levantamos el estado para controlarlo desde Dashboard)
  const [inventoryTab, setInventoryTab] = useState('available');

  // 1. ESTADO DE DATOS (Vacío al inicio, se llena desde Firebase)
  const [inventory, setInventory] = useState([]);
  const [contracts, setContracts] = useState([]);

  const [userProfile, setUserProfile] = useState(null);

  const [toast, setToast] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => { localStorage.setItem('activeTab', activeTab); }, [activeTab]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  // 1.b AUTH STATE LISTENER
  const [initializing, setInitializing] = useState(true);
  const [currentUserEmail, setCurrentUserEmail] = useState(localStorage.getItem('lastUserEmail') || '');

  useEffect(() => {
    // Como eliminamos Google Auth, solo "simulamos" verificación via localStorage o estado
    // Si queremos persistir, usamos localStorage
    const savedEmail = localStorage.getItem('lastUserEmail');
    if (savedEmail) {
      setIsLoggedIn(true);
      setCurrentUserEmail(savedEmail);
    }
    setInitializing(false);
  }, []);

  // Fetch user profile when logged in (usando email ya que no hay auth.currentUser real)
  useEffect(() => {
    if (isLoggedIn && currentUserEmail) {
      const fetchUserProfile = async () => {
        // Usamos el email como ID del documento para simplificar
        const userId = currentUserEmail.replace(/\./g, '_'); // Sanitizar email para ID
        const userDocRef = doc(db, "users", userId);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          setUserProfile(userDocSnap.data());
        } else {
          // Crear perfil por defecto
          const defaultProfile = {
            name: currentUserEmail.split('@')[0],
            email: currentUserEmail,
            dealerId: 'defaultDealer',
            dealerName: 'Mi Dealer',
            role: 'Admin',
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, defaultProfile);
          setUserProfile(defaultProfile);
        }
      };
      fetchUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [isLoggedIn, currentUserEmail]);

  // ... (keep existing firebase connection useEffect)

  // ... (rest of functions)

  const handleLogin = ({ email }) => {
    localStorage.setItem('lastUserEmail', email);
    setCurrentUserEmail(email);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
    localStorage.removeItem('lastUserEmail');
    setIsLoggedIn(false);
    setUserProfile(null);
    setCurrentUserEmail('');
  };

  useEffect(() => {
    // Escuchar TODO el inventario, incluyendo trash
    const unsubscribe = onSnapshot(collection(db, "vehicles"), (snapshot) => {
      const vehiclesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setInventory(vehiclesData);

      // AUTO-LIMPIEZA: Revisar ítems en basura viejos (>15 días)
      const now = new Date();
      vehiclesData.forEach(async (v) => {
        if (v.status === 'trash' && v.deletedAt) {
          const deleteDate = new Date(v.deletedAt);
          const diffDays = (now - deleteDate) / (1000 * 60 * 60 * 24);
          if (diffDays > 15) {
            // Eliminar permanentemente
            try {
              await deleteDoc(doc(db, "vehicles", v.id));
              console.log(`Auto-eliminado vehículo trash ${v.id} (>15 días)`);
            } catch (e) { console.error("Error auto-limpieza", e); }
          }
        }
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Escuchar Contratos de Firebase en tiempo real
    const unsubscribeContracts = onSnapshot(collection(db, "contracts"), (snapshot) => {
      const contractsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Ordenar por fecha de creación descendente
      setContracts(contractsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    });
    return () => unsubscribeContracts();
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center animate-pulse">
          <AppLogo className="w-16 h-16 mb-4" size={64} />
          <p className="text-slate-400 font-medium">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn || !userProfile) return <LoginScreen onLogin={handleLogin} />;

  // 3. GUARDAR (Crear o Editar en Firebase)
  const handleSaveVehicle = async (vehicleData) => {
    console.log("Intentando guardar vehículo:", vehicleData.id ? `Editando ID: ${vehicleData.id}` : "Creando nuevo (SIN ID)");

    // Asegurar que si hay ID, se use updateDoc
    const existingId = vehicleData.id;
    try {
      if (existingId) {
        // Editar existente
        const vehicleRef = doc(db, "vehicles", existingId);
        const { id: _removedId, ...dataToUpdate } = vehicleData;
        console.log("Actualizando documento Firestore:", existingId);
        await updateDoc(vehicleRef, {
          ...dataToUpdate,
          updatedAt: new Date().toISOString()
        });
        showToast("Vehículo actualizado con éxito");
      } else {
        // Crear nuevo
        const newVehicle = {
          ...vehicleData,
          createdAt: new Date().toISOString(),
          status: vehicleData.status || 'available'
        };
        await addDoc(collection(db, "vehicles"), newVehicle);
        showToast("Vehículo guardado con éxito");
      }
    } catch (error) {
      console.error("Error detallado al guardar:", error);
      showToast("Error al guardar en la base de datos", "error");
    }
  };

  // 4. SOFT DELETE (Enviar a Papelera)
  const handleDeleteVehicle = async (id) => {
    // Soft Delete: update status to 'trash'
    try {
      const vehicleRef = doc(db, "vehicles", id);
      await updateDoc(vehicleRef, {
        status: 'trash',
        deletedAt: new Date().toISOString()
      });
      showToast("Vehículo movido a la papelera (se borrará en 15 días)");
    } catch (error) {
      console.error(error);
      showToast("Error al mover a papelera", "error");
    }
  };

  const handleRestoreVehicle = async (id) => {
    try {
      const vehicleRef = doc(db, "vehicles", id);
      await updateDoc(vehicleRef, {
        status: 'available',
        deletedAt: null
      });
      showToast("Vehículo restaurado al inventario");
    } catch (e) {
      console.error("Error al restaurar:", e);
      showToast("Error al restaurar", "error");
    }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm("¿ESTAS SEGURO? Esto eliminará el vehículo PARA SIEMPRE. No se puede deshacer.")) return;
    try {
      await deleteDoc(doc(db, "vehicles", id));
      showToast("Vehículo eliminado permanentemente");
    } catch (error) {
      console.error("Error al eliminar:", error);
      showToast("Error al eliminar", "error");
    }
  };

  const handleEmptyTrash = async () => {
    if (!window.confirm("¿Vaciar TODA la papelera? Se perderán todos los datos.")) return;
    const trashItems = inventory.filter(i => i.status === 'trash');
    for (const item of trashItems) {
      await deleteDoc(doc(db, "vehicles", item.id));
    }
    showToast("Papelera vaciada");
  };

  // Funciones locales (Contratos, etc.)
  const handleGenerateContract = async (contractData) => {
    try {
      const { id, ...data } = contractData;
      if (id) {
        // Editar existente
        const contractRef = doc(db, "contracts", id);
        await updateDoc(contractRef, {
          ...data,
          updatedAt: new Date().toISOString()
        });
        showToast("Contrato actualizado con éxito");
      } else {
        // Crear nuevo
        const newContract = { ...data, createdAt: new Date().toISOString() };
        await addDoc(collection(db, "contracts"), newContract);

        // 2. Si hay un vehículo asociado, marcarlo como vendido
        if (contractData.vehicleId) {
          const vehicleRef = doc(db, "vehicles", contractData.vehicleId);
          await updateDoc(vehicleRef, { status: 'sold', updatedAt: new Date().toISOString() });
        }
        showToast("Contrato generado y vehículo marcado como vendido");
      }
    } catch (error) {
      console.error("Error al procesar contrato:", error);
      showToast("Error al procesar el contrato", "error");
    }
  };

  const handleDeleteContract = async (id) => {
    try {
      await deleteDoc(doc(db, "contracts", id));
      showToast("Contrato eliminado permanentemente");
    } catch (error) {
      console.error("Error al eliminar contrato:", error);
      showToast("Error al eliminar", "error");
    }
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleNavigate = (tab, filter = 'all') => {
    setSelectedVehicle(null);
    setActiveTab(tab);
    if (tab === 'inventory' && filter) setInventoryTab(filter);
  };





  // Filtros Globales
  const activeInventory = (inventory || []).filter(i => i && i.status !== 'trash');
  const trashInventory = (inventory || []).filter(i => i && i.status === 'trash');

  const renderContent = () => {
    if (selectedVehicle) {
      const associatedContract = contracts.find(c => c.vehicleId === selectedVehicle.id);
      return (
        <VehicleEditView
          vehicle={selectedVehicle}
          contract={associatedContract}
          onBack={() => setSelectedVehicle(null)}
          onSave={async (data) => { await handleSaveVehicle(data); setSelectedVehicle(null); }}
        />
      );
    }
    switch (activeTab) {
      case 'dashboard': return <DashboardView inventory={activeInventory} contracts={contracts || []} onNavigate={handleNavigate} userProfile={userProfile} />;
      case 'inventory': return <InventoryView inventory={activeInventory} activeTab={inventoryTab} setActiveTab={setInventoryTab} showToast={showToast} onGenerateContract={handleGenerateContract} onVehicleSelect={handleVehicleSelect} onSave={handleSaveVehicle} onDelete={handleDeleteVehicle} userProfile={userProfile} searchTerm={globalSearch} />;
      case 'contracts': return <ContractsView contracts={contracts || []} inventory={activeInventory} onGenerateContract={handleGenerateContract} onDeleteContract={handleDeleteContract} setActiveTab={setActiveTab} userProfile={userProfile} searchTerm={globalSearch} />;
      case 'trash': return <TrashView trash={trashInventory} onRestore={handleRestoreVehicle} onPermanentDelete={handlePermanentDelete} onEmptyTrash={handleEmptyTrash} showToast={showToast} />;
      default: return <DashboardView inventory={activeInventory} contracts={contracts} onNavigate={handleNavigate} userProfile={userProfile} />;
    }
  };

  return (
    <>
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
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}