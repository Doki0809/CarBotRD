import VehicleEditView from './VehicleEditView.jsx';
import React, { useState, useEffect, useMemo } from 'react';
import { db, auth, googleProvider } from './firebaseConfig';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'firebase/firestore';

import {
  LayoutDashboard, Car, FileText, LogOut, Plus, Search, Edit, Trash2,
  DollarSign, CheckCircle, X, Menu, User, Send, Loader2, FilePlus,
  CreditCard, FileSignature, Files, Fuel, Settings, IdCard, Trash, Undo, Printer, Eye
} from 'lucide-react';

/**
 * CARBOT - B2B SaaS para Dealers
 * VERSIÓN: ONLINE (FIREBASE)
 */

const MOCK_USER = {
  id: 'u1',
  name: 'Jean Carlos Gómez',
  role: 'Admin',
  dealerId: 'd1',
  dealerName: 'AutoPremium Punta Cana'
};

// NOTA: Eliminamos INITIAL_INVENTORY porque ahora viene de la nube.
const INITIAL_CONTRACTS = [
  { id: 101, client: 'Paula Gil', cedula: '402-0000000-1', vehicle: 'BMW X5 M-Sport', template: 'Venta al Contado', status: 'pending', date: '2023-10-25', ghl_id: 'ghl_123' },
];

const CONTRACT_TEMPLATES = [
  { id: 't1', name: 'Venta al Contado', icon: DollarSign, desc: 'Contrato estándar de compraventa.' },
  { id: 't2', name: 'Financiamiento', icon: CreditCard, desc: 'Acuerdo con plan de pagos y garantías.' },
  { id: 't3', name: 'Carta de Ruta', icon: FileSignature, desc: 'Permiso provisional de circulación.' },
];

// --- UI KIT ---
export const Button = ({ children, variant = 'primary', className = '', icon: Icon, onClick, ...props }) => {
  const baseStyle = "inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-300 transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-red-700 hover:bg-red-800 hover:shadow-lg text-white focus:ring-red-500 shadow-md",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-red-200 hover:text-red-700 focus:ring-gray-200 shadow-sm",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 focus:ring-red-500",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-red-700",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-emerald-500"
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} onClick={onClick} {...props}>
      {Icon && <Icon size={18} className="mr-2" />}
      {children}
    </button>
  );
};

const Card = ({ children, className = '', noPadding = false }) => (
  <div className={`bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden ${className}`}>
    <div className={noPadding ? '' : 'p-5'}>{children}</div>
  </div>
);

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

const Input = ({ label, type = "text", ...props }) => (
  <div className="mb-4 group">
    <label className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-red-700 transition-colors">{label}</label>
    <input type={type} className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300" {...props} />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div className="mb-4 group">
    <label className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-red-700 transition-colors">{label}</label>
    <select className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer" {...props}>
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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
  if (!isOpen) return null;
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Bloquear botón mientras guarda
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // Convertir números
    data.price = Number(data.price);
    data.price_dop = Number(data.price_dop);
    data.year = Number(data.year);
    data.mileage = Number(data.mileage);
    // Imagen por defecto
    data.image = data.image || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800';

    await onSave(data); // Esperar a que Firebase responda
    setLoading(false);
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
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-1">Especificaciones</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select name="transmission" label="Transmisión" defaultValue={initialData?.transmission || 'Automática'} options={['Automática', 'Manual', 'CVT']} />
                <Select name="traction" label="Tracción" defaultValue={initialData?.traction || 'FWD'} options={['FWD', 'RWD', 'AWD', '4x4']} />
                <Select name="fuel" label="Combustible" defaultValue={initialData?.fuel || 'Gasolina'} options={['Gasolina', 'Diesel', 'Híbrido']} />
                <Input name="vin" label="VIN / Chasis" defaultValue={initialData?.vin} className="md:col-span-3 font-mono" required />
                <Input name="image" label="URL Imagen" defaultValue={initialData?.image} className="md:col-span-3" placeholder="https://..." />
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-1">Precios y Estado</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input name="price" label="Precio Venta (US$)" type="number" defaultValue={initialData?.price} required />
                <Input name="price_dop" label="Precio Venta (RD$)" type="number" defaultValue={initialData?.price_dop} required />
                <Select name="status" label="Estado" defaultValue={initialData?.status || 'available'} options={['available', 'quoted', 'sold']} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? <><Loader2 className="animate-spin mr-2" /> Guardando...</> : 'Guardar Vehículo'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

const QuoteModal = ({ isOpen, onClose, vehicle, onConfirm }) => {
  if (!isOpen) return null;
  const [loading, setLoading] = useState(false);
  const [bankName, setBankName] = useState('');
  const [cedula, setCedula] = useState('');

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
              Cotizar: {MOCK_USER.dealerName}
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Se enviará la ficha del <strong className="text-slate-900">{vehicle.make} {vehicle.model}</strong> a nombre de <strong className="text-slate-900">{MOCK_USER.name}</strong>.
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
  if (!isOpen) return null;
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState(initialVehicle ? initialVehicle.id : '');
  const [clientName, setClientName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientCedula, setClientCedula] = useState('');
  const [loading, setLoading] = useState(false);

  const availableVehicles = inventory.filter(v => v.status !== 'sold' || (initialVehicle && v.id === initialVehicle.id));

  useEffect(() => { if (initialVehicle) setSelectedVehicleId(initialVehicle.id); }, [initialVehicle]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTemplate || !selectedVehicleId) return;
    setLoading(true);
    const vehicle = inventory.find(v => v.id === selectedVehicleId); // Firebase IDs son strings, quitamos parseInt
    const template = CONTRACT_TEMPLATES.find(t => t.id === selectedTemplate);
    setTimeout(() => {
      onGenerate({
        client: `${clientName} ${clientLastName}`,
        cedula: clientCedula,
        vehicle: `${vehicle.make} ${vehicle.model}`,
        template: template.name,
        status: 'pending',
        date: new Date().toISOString().split('T')[0],
        ghl_id: `ghl_${Math.floor(Math.random() * 1000)}`
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
                  <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year}) - ${v.price.toLocaleString()}</option>
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

const ContractPreviewModal = ({ isOpen, onClose, contract }) => {
  if (!isOpen || !contract) return null;

  const getContractHtml = () => `
    <html>
      <head>
        <title>Contrato-${contract.id}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.6; color: #000; }
          h1 { text-align: center; font-size: 24px; margin-bottom: 20px; text-transform: uppercase; }
          h2 { font-size: 18px; margin-top: 30px; border-bottom: 1px solid #000; padding-bottom: 5px; }
          p { margin-bottom: 15px; text-align: justify; }
          .header { text-align: center; margin-bottom: 40px; }
          .firma-box { margin-top: 100px; display: flex; justify-content: space-between; }
          .firma { width: 45%; border-top: 1px solid #000; padding-top: 10px; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${MOCK_USER.dealerName}</h1>
          <p>RNC: 1-0000000-1 | Tel: 809-555-5555</p>
        </div>
        
        <h1>${contract.template.toUpperCase()}</h1>
        
        <p>En la ciudad de Punta Cana, Provincia La Altagracia, República Dominicana, a los <strong>${new Date().toLocaleDateString()}</strong>.</p>
        
        <p>
          ENTRE UNA PARTE, el señor(a) <strong>${MOCK_USER.name}</strong>, actuando en nombre y representación de <strong>${MOCK_USER.dealerName}</strong> (EL VENDEDOR).
          <br/>
          Y POR LA OTRA PARTE, el señor(a) <strong>${contract.client}</strong>, portador de la cédula <strong>${contract.cedula || 'N/A'}</strong> (EL COMPRADOR).
        </p>
        
        <h2>PRIMERO: OBJETO</h2>
        <p>EL VENDEDOR vende, cede y traspasa al COMPRADOR el siguiente vehículo:</p>
        <ul>
          <li><strong>Vehículo:</strong> ${contract.vehicle}</li>
          <li><strong>Condición:</strong> Usado / Importado</li>
        </ul>

        <h2>SEGUNDO: PRECIO Y PAGO</h2>
        <p>El precio pactado para la venta es de [PRECIO_AQUI], pagaderos de la siguiente forma: [DETALLE_PAGO].</p>
        
        <h2>TERCERO: GARANTÍA</h2>
        <p>El vehículo se vende bajo el estatus "AS IS" (como está), salvo las garantías expresas de ley sobre el motor y transmisión por 30 días.</p>

        <h2>CUARTO: JURISDICCIÓN</h2>
        <p>Para todo lo relacionado con la interpretación y ejecución del presente contrato, las partes eligen domicilio en la ciudad de Punta Cana.</p>

        <div class="firma-box">
           <div class="firma"><p>EL VENDEDOR</p><br/><br/>${MOCK_USER.dealerName}</div>
           <div class="firma"><p>EL COMPRADOR</p><br/><br/>${contract.client}</div>
        </div>
      </body>
    </html>
  `;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(getContractHtml());
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleDownload = () => {
    // Simulamos descarga abriendo print dialog (PDF)
    handlePrint();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-4xl h-[90vh] animate-in zoom-in-95 duration-200 flex flex-col">
        <Card className="flex flex-col h-full bg-slate-50">
          <div className="flex justify-between items-center mb-4 p-4 border-b bg-white rounded-t-xl shrink-0">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText size={20} className="text-red-600" /> Contrato: ${contract.client}
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>

          <div className="flex-1 p-8 overflow-y-auto bg-white shadow-inner mx-4 mb-4 border border-gray-200 rounded-lg">
            <div className="max-w-3xl mx-auto font-serif text-black leading-relaxed space-y-6" dangerouslySetInnerHTML={{
              __html: getContractHtml().replace('<html>', '').replace('</html>', '').replace('<body>', '').replace('</body>', '').replace('<head>', '').replace('</head>', '')
            }} />
          </div>

          <div className="flex justify-end gap-3 p-4 bg-white border-t rounded-b-xl shrink-0">
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
            <Button variant="secondary" onClick={handleDownload} icon={FileText} className="border-slate-300">Descargar (PDF)</Button>
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

const DashboardView = ({ inventory, contracts, onNavigate }) => {
  const stats = [
    { label: 'Inventario Total', value: inventory.length, icon: Car, color: 'text-red-600', bg: 'bg-red-50', action: () => onNavigate('inventory', 'all') },
    { label: 'Cotizados', value: inventory.filter(i => i.status === 'quoted').length, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50', action: () => onNavigate('inventory', 'available') }, // Asumimos que cotizados están en disponibles por ahora, o podríamos filtrar solo cotizados
    { label: 'Vendidos', value: inventory.filter(i => i.status === 'sold').length, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', action: () => onNavigate('inventory', 'sold') },
  ];
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div><h1 className="text-3xl font-bold text-slate-900">Dashboard</h1><p className="text-slate-500 text-sm mt-1">Datos en tiempo real de <span className="font-semibold text-red-700">Firebase</span></p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="flex items-center group cursor-pointer border-t-4 border-t-transparent hover:border-t-red-600 hover:shadow-lg active:scale-95 transition-all">
            <div className={`p-4 rounded-xl ${stat.bg} mr-5 transition-transform group-hover:scale-110 duration-300`} onClick={stat.action}><stat.icon className={stat.color} size={28} /></div>
            <div onClick={stat.action} className="flex-1">
              <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800 text-lg">Últimos Contratos</h3><span className="text-xs text-red-600 font-bold uppercase cursor-pointer hover:underline" onClick={() => onNavigate('contracts')}>Ver todos</span></div>
          <div className="space-y-4">{contracts.slice(0, 3).map(contract => (<div key={contract.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"><div className="flex items-center"><div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm mr-4">{contract.client.charAt(0)}</div><div><p className="text-sm font-bold text-slate-900">{contract.client}</p><p className="text-xs text-slate-500">{contract.vehicle}</p></div></div><Badge status={contract.status} /></div>))}</div>
        </Card>
        <Card>
          <div className="flex justify-between items-center mb-6"><h3 className="font-bold text-slate-800 text-lg">Actividad Reciente</h3></div>
          <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 py-2"><div className="ml-6 relative"><div className="absolute w-4 h-4 bg-red-600 rounded-full -left-[33px] top-0.5 border-[3px] border-white shadow-sm"></div><p className="text-sm text-slate-900 font-bold">Base de datos conectada</p><p className="text-xs text-slate-500 mt-1">Ahora mismo • Firebase</p></div></div>
        </Card>
      </div>
    </div>
  );
};

const InventoryView = ({ inventory, showToast, onGenerateContract, onVehicleSelect, onSave, onDelete, activeTab, setActiveTab }) => { // activeTab por props para control externo
  const [searchTerm, setSearchTerm] = useState('');
  // const [activeTab, setActiveTab] = useState('available'); // Levantado al padre
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState(null);

  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = `${item.make} ${item.model}`.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesTab = true;
      if (activeTab === 'available') matchesTab = item.status === 'available' || item.status === 'quoted';
      if (activeTab === 'sold') matchesTab = item.status === 'sold';
      return matchesSearch && matchesTab;
    });
  }, [inventory, searchTerm, activeTab]);

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
        <div><h1 className="text-2xl font-bold text-slate-900">Inventario: <span className="text-red-700">{MOCK_USER.dealerName}</span></h1><p className="text-slate-500 text-sm mt-1">Organizado por marcas • {filteredInventory.length} vehículos</p></div>
        <Button onClick={handleCreate} icon={Plus} className="shadow-lg shadow-red-600/20">Agregar Vehículo</Button>
      </div>

      <div className="flex space-x-1 bg-slate-100/80 p-1 rounded-xl w-full sm:w-fit backdrop-blur-sm">
        <button onClick={() => setActiveTab('available')} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'available' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Disponibles</button>
        <button onClick={() => setActiveTab('sold')} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'sold' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Vendidos</button>
        <button onClick={() => setActiveTab('all')} className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>Todos</button>
      </div>

      <div className="relative max-w-md group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 transition-colors" size={18} />
        <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                      <div className="mt-2 mb-4"><p className="text-xl font-bold text-red-700">US$ {item.price.toLocaleString()}</p></div>
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
      <QuoteModal isOpen={isQuoteModalOpen} onClose={() => setIsQuoteModalOpen(false)} vehicle={currentVehicle} onConfirm={handleQuoteSent} />
      <GenerateContractModal isOpen={isContractModalOpen} onClose={() => { setIsContractModalOpen(false); setCurrentVehicle(null); }} inventory={inventory} onGenerate={handleContractGenerated} initialVehicle={currentVehicle} />
    </div>
  );
};

const ContractsView = ({ contracts, inventory, onGenerateContract, setActiveTab }) => {
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [previewContract, setPreviewContract] = useState(null);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center"><div><h1 className="text-3xl font-bold text-slate-900">Contratos (GHL)</h1><p className="text-slate-500 text-sm mt-1">Historial de documentos generados</p></div><Button icon={FilePlus} onClick={() => setIsGenerateModalOpen(true)} className="shadow-lg shadow-red-600/20">Generar Contrato</Button></div>
      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-gray-200"><tr><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehículo</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th></tr></thead>
            <tbody className="divide-y divide-gray-100">{contracts.map(contract => (<tr key={contract.id} className="hover:bg-red-50/30 transition-colors duration-200"><td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-bold text-slate-900">{contract.client}</div></td><td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{contract.vehicle}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{contract.template}</td><td className="px-6 py-4 whitespace-nowrap"><Badge status={contract.status} /></td>
              <td className="px-6 py-4 whitespace-nowrap">
                <button onClick={() => setPreviewContract(contract)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Ver e Imprimir"><Eye size={18} /></button>
              </td>
            </tr>))}</tbody>
          </table>
        </div>
      </Card>
      <GenerateContractModal isOpen={isGenerateModalOpen} onClose={() => setIsGenerateModalOpen(false)} inventory={inventory} onGenerate={onGenerateContract} initialVehicle={null} />
      <ContractPreviewModal isOpen={!!previewContract} onClose={() => setPreviewContract(null)} contract={previewContract} />
    </div>
  );
};

// --- LAYOUT ---
const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center px-4 py-3.5 mb-1.5 rounded-xl transition-all duration-300 group ${active ? 'bg-red-700 text-white shadow-lg shadow-red-900/50 translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'}`}><Icon size={22} className={`mr-3 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} /><span className="font-medium text-sm tracking-wide">{label}</span></button>
);

const AppLayout = ({ children, activeTab, setActiveTab, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuItems = [{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'inventory', label: 'Inventario', icon: Car }, { id: 'contracts', label: 'Contratos', icon: FileText }, { id: 'trash', label: 'Papelera', icon: Trash2 }];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-red-200 selection:text-red-900">
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 border-r border-slate-800 fixed h-full z-20 shadow-2xl">
        <div className="p-8 flex items-center space-x-3"><AppLogo className="w-12 h-12" size={32} invert /><span className="text-2xl font-bold text-white tracking-tight">Carbot</span></div>
        <nav className="flex-1 px-6 mt-4"><div className="mb-6 px-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Navegación</div>{menuItems.map(item => (<SidebarItem key={item.id} icon={item.icon} label={item.label} active={activeTab === item.id} onClick={() => setActiveTab(item.id)} />))}</nav>
        <div className="p-6 border-t border-slate-800 bg-slate-900/50"><div className="flex items-center gap-3 px-2 mb-6 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50"><div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-slate-200 shadow-inner border border-slate-600"><User size={20} /></div><div className="overflow-hidden"><p className="text-sm font-bold text-white truncate">{MOCK_USER.name}</p></div></div><button onClick={onLogout} className="w-full flex items-center justify-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-sm font-medium transition-all duration-300 group"><LogOut size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Cerrar Sesión</button></div>
      </aside>
      <div className="flex-1 md:ml-72 flex flex-col min-h-screen">
        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-30"><div className="flex items-center space-x-2"><AppLogo className="w-10 h-10" size={24} /><span className="font-bold text-slate-900 text-lg">Carbot</span></div><button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors">{mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}</button></header>
        {mobileMenuOpen && (<div className="md:hidden fixed inset-0 z-20 bg-slate-900 pt-24 px-6 animate-in slide-in-from-top-10 fade-in duration-300"><nav className="space-y-3">{menuItems.map(item => (<SidebarItem key={item.id} icon={item.icon} label={item.label} active={activeTab === item.id} onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }} />))}<div className="border-t border-slate-800 my-6 pt-6"><button onClick={onLogout} className="flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 w-full px-4 py-4 rounded-xl transition-all"><LogOut size={20} className="mr-3" /> Cerrar Sesión</button></div></nav></div>)}
        <main className="flex-1 p-4 md:p-10 overflow-y-auto w-full max-w-[1600px] mx-auto">{children}</main>
      </div>
    </div>
  );
};

// --- Reemplaza tu LoginScreen actual con este ---
const LoginScreen = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  // 1. Lógica para entrar con Google
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithPopup(auth, googleProvider);
      onLogin();
    } catch (err) {
      console.error("Error de Google:", err);
      let msg = `Error: ${err.message}`;
      if (err.code === 'auth/popup-closed-by-user') msg = "Proceso cancelado por el usuario.";
      if (err.code === 'auth/operation-not-allowed') msg = "Habilita Google Auth en Firebase Console -> Authentication -> Sign-in methods.";
      if (err.code === 'auth/unauthorized-domain') msg = "Dominio no autorizado. Agrega este dominio en Firebase Console.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // 2. Lógica para correo/contraseña (Simulada por ahora)
  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => { onLogin(); setLoading(false); }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl border border-gray-100">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-slate-900">Carbot</h1>
          <p className="text-slate-500 mt-2">Sistema Inteligente para Dealers</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center">
            <span className="mr-2">⚠️</span> {error}
          </div>
        )}

        <div className="space-y-6">
          {/* BOTÓN DE GOOGLE REAL */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 bg-white border border-gray-300 text-slate-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? 'Conectando...' : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                Acceder con Google
              </>
            )}
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">O INGRESA CON CORREO</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Correo" placeholder="usuario@dealer.com" type="email" required />
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
            <a href="#" className="text-sm text-red-600 hover:text-red-800 font-semibold">¿Ayuda?</a>
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

  // Nuevo Estado: Filtro de Inventario (Levantamos el estado para controlarlo desde Dashboard)
  const [inventoryTab, setInventoryTab] = useState('available');

  // 1. ESTADO DE DATOS (Vacío al inicio, se llena desde Firebase)
  const [inventory, setInventory] = useState([]);
  const [contracts, setContracts] = useState(INITIAL_CONTRACTS);
  // const [trash, setTrash] = useState([]); // Ya no necesitamos trash local, filtramos del inventory global

  const [toast, setToast] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  useEffect(() => { localStorage.setItem('activeTab', activeTab); }, [activeTab]);

  const showToast = (message, type = 'success') => setToast({ message, type });

  // 1.b AUTH STATE LISTENER
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribeAuth();
  }, []);

  // 2. CONEXIÓN A FIREBASE (Escuchar cambios en tiempo real)
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

  // 3. GUARDAR (Crear o Editar en Firebase)
  const handleSaveVehicle = async (vehicleData) => {
    try {
      if (vehicleData.id) {
        // Editar existente
        const vehicleRef = doc(db, "vehicles", vehicleData.id);
        await updateDoc(vehicleRef, vehicleData);
        showToast("Vehículo actualizado en la nube");
      } else {
        // Crear nuevo
        await addDoc(collection(db, "vehicles"), { ...vehicleData, createdAt: new Date().toISOString() });
        showToast("Vehículo guardado en Firebase");
      }
    } catch (error) {
      console.error(error);
      showToast("Error al guardar", "error");
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
    } catch (e) { showToast("Error al restaurar", "error"); }
  };

  const handlePermanentDelete = async (id) => {
    if (!window.confirm("¿ESTAS SEGURO? Esto eliminará el vehículo PARA SIEMPRE. No se puede deshacer.")) return;
    try {
      await deleteDoc(doc(db, "vehicles", id));
      showToast("Vehículo eliminado permanentemente");
    } catch (error) {
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
  const handleGenerateContract = (contractData) => {
    const newContract = { id: Date.now(), ...contractData };
    setContracts([newContract, ...contracts]);
    showToast("Contrato generado exitosamente");
  };

  const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleNavigate = (tab, filter = 'all') => {
    setActiveTab(tab);
    if (tab === 'inventory' && filter) setInventoryTab(filter);
  };

  if (!isLoggedIn) return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;

  // Filtros Globale
  const activeInventory = inventory.filter(i => i.status !== 'trash');
  const trashInventory = inventory.filter(i => i.status === 'trash');

  const renderContent = () => {
    if (selectedVehicle) return <VehicleEditView vehicle={selectedVehicle} onBack={() => setSelectedVehicle(null)} />;
    switch (activeTab) {
      case 'dashboard': return <DashboardView inventory={activeInventory} contracts={contracts} onNavigate={handleNavigate} />;
      case 'inventory': return <InventoryView inventory={activeInventory} activeTab={inventoryTab} setActiveTab={setInventoryTab} showToast={showToast} onGenerateContract={handleGenerateContract} onVehicleSelect={handleVehicleSelect} onSave={handleSaveVehicle} onDelete={handleDeleteVehicle} />;
      case 'contracts': return <ContractsView contracts={contracts} inventory={activeInventory} onGenerateContract={handleGenerateContract} setActiveTab={setActiveTab} />;
      case 'trash': return <TrashView trash={trashInventory} onRestore={handleRestoreVehicle} onPermanentDelete={handlePermanentDelete} onEmptyTrash={handleEmptyTrash} showToast={showToast} />;
      default: return <DashboardView inventory={activeInventory} contracts={contracts} onNavigate={handleNavigate} />;
    }
  };

  return (
    <>
      <AppLayout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>{renderContent()}</AppLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}