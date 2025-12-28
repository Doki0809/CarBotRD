import VehicleEditView from './VehicleEditView.jsx';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Car, 
  FileText, 
  LogOut, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  DollarSign, 
  CheckCircle, 
  X,
  Menu,
  User,
  Send,
  Loader2,
  FilePlus,
  CreditCard,
  FileSignature,
  Files,
  Fuel,
  Settings,
  IdCard,
  Trash,
  Undo
} from 'lucide-react';

/**
 * CARBOT - B2B SaaS para Dealers
 * * INSTRUCCIONES PARA EL LOGO:
 * 1. Guarda tu logo como "logo.png" en la carpeta "public" de tu proyecto.
 * 2. El sistema intentará cargar esa imagen. Si no la encuentra, usará el ícono por defecto.
 */

// --- MOCK DATA ---

const MOCK_USER = {
  id: 'u1',
  name: 'Jean Carlos Gómez',
  role: 'Admin',
  dealerId: 'd1',
  dealerName: 'AutoPremium Punta Cana'
};

const INITIAL_INVENTORY = [
  { 
    id: 1, 
    make: 'Toyota', 
    model: 'Fortuner', 
    year: 2023, 
    color: 'Blanco Perla',
    edition: 'LTD',
    transmission: 'Automática',
    traction: '4x4',
    fuel: 'Diesel',
    vin: 'JTEBU123456',
    price: 58000, 
    price_dop: 3364000,
    mileage: 15000,
    status: 'available', 
    image: 'https://images.unsplash.com/photo-1626847037657-fd3622613ce3?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 2, 
    make: 'BMW', 
    model: 'X5', 
    year: 2022, 
    color: 'Negro Zafiro',
    edition: 'M-Sport',
    transmission: 'Automática',
    traction: 'AWD',
    fuel: 'Gasolina',
    vin: 'WBA12345678',
    price: 82000, 
    price_dop: 4756000,
    mileage: 8500,
    status: 'quoted', 
    image: 'https://images.unsplash.com/photo-1556189250-72ba954522a0?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 3, 
    make: 'Mercedes-Benz', 
    model: 'GLE 450', 
    year: 2024, 
    color: 'Gris Selenita',
    edition: 'AMG Line',
    transmission: 'Automática',
    traction: '4MATIC',
    fuel: 'Híbrido',
    vin: 'WDC12345678',
    price: 95000, 
    price_dop: 5510000,
    mileage: 1200,
    status: 'sold', 
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 4, 
    make: 'Honda', 
    model: 'CR-V', 
    year: 2021, 
    color: 'Plata Lunar',
    edition: 'Touring',
    transmission: 'CVT',
    traction: 'AWD',
    fuel: 'Gasolina',
    vin: 'SHS12345678',
    price: 32000, 
    price_dop: 1856000,
    mileage: 28000,
    status: 'available', 
    image: 'https://images.unsplash.com/photo-1599908882512-320d366e679c?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 5, 
    make: 'BMW', 
    model: 'Series 3', 
    year: 2023, 
    color: 'Azul Portimao',
    edition: '330i',
    transmission: 'Automática',
    traction: 'RWD',
    fuel: 'Gasolina',
    vin: 'WBA98765432',
    price: 55000, 
    price_dop: 3190000,
    mileage: 5000,
    status: 'available', 
    image: 'https://images.unsplash.com/photo-1555215695-3004980adade?auto=format&fit=crop&q=80&w=800'
  },
];

const INITIAL_CONTRACTS = [
  { id: 101, client: 'Paula Gil', cedula: '402-0000000-1', vehicle: 'BMW X5 M-Sport', template: 'Venta al Contado', status: 'pending', date: '2023-10-25', ghl_id: 'ghl_123' },
  { id: 102, client: 'Luis Miguel', cedula: '001-0000000-2', vehicle: 'Mercedes-Benz GLE 450', template: 'Financiamiento', status: 'signed', date: '2023-10-20', ghl_id: 'ghl_124' },
];

const CONTRACT_TEMPLATES = [
  { id: 't1', name: 'Venta al Contado', icon: DollarSign, desc: 'Contrato estándar de compraventa.' },
  { id: 't2', name: 'Financiamiento', icon: CreditCard, desc: 'Acuerdo con plan de pagos y garantías.' },
  { id: 't3', name: 'Carta de Ruta', icon: FileSignature, desc: 'Permiso provisional de circulación.' },
];

// --- COMPONENTS ATÓMICOS & UI KIT ---

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
    <div className={noPadding ? '' : 'p-5'}>
      {children}
    </div>
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

  const labels = {
    available: "Disponible",
    quoted: "Cotizado",
    sold: "Vendido",
    pending: "Pendiente Firma",
    signed: "Firmado"
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[status] || styles.sold}`}>
      {labels[status] || status}
    </span>
  );
};

const Input = ({ label, type = "text", ...props }) => (
  <div className="mb-4 group">
    <label className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-red-700 transition-colors">{label}</label>
    <input 
      type={type} 
      className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300"
      {...props}
    />
  </div>
);

const Select = ({ label, options, ...props }) => (
    <div className="mb-4 group">
      <label className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-red-700 transition-colors">{label}</label>
      <select 
        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all cursor-pointer"
        {...props}
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
);

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-xl shadow-2xl transform transition-all duration-500 animate-in slide-in-from-top-5 fade-in ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>
      <CheckCircle size={20} className="mr-3" />
      <span className="font-medium tracking-wide">{message}</span>
    </div>
  );
};

// --- LOGO COMPONENT ---
// Componente inteligente que muestra el logo si existe, o un ícono por defecto
const AppLogo = ({ className, size = 32, invert = false }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center ${invert ? 'text-white' : 'text-red-600'} ${className}`}>
        <Car size={size} />
      </div>
    );
  }

  return (
    <img 
      src="/logo.png" 
      alt="Carbot" 
      className={`${className} object-contain`} 
      style={{ height: size, width: 'auto' }}
      onError={() => setHasError(true)} 
    />
  );
};

// --- MODALES (Formularios y Acciones) ---

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
                        <button 
                            onClick={() => onSelect('quote')}
                            className="flex items-center p-4 rounded-xl border border-gray-200 hover:border-red-500 hover:bg-red-50 transition-all group"
                        >
                            <div className="p-3 bg-red-100 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <Send size={24} />
                            </div>
                            <div className="ml-4 text-left">
                                <h4 className="font-bold text-slate-800 group-hover:text-red-700">Cotización</h4>
                                <p className="text-xs text-slate-500">Enviar ficha técnica y precio</p>
                            </div>
                        </button>
                        
                        <button 
                            onClick={() => onSelect('contract')}
                            className="flex items-center p-4 rounded-xl border border-gray-200 hover:border-red-500 hover:bg-red-50 transition-all group"
                        >
                            <div className="p-3 bg-red-100 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <FilePlus size={24} />
                            </div>
                            <div className="ml-4 text-left">
                                <h4 className="font-bold text-slate-800 group-hover:text-red-700">Contrato</h4>
                                <p className="text-xs text-slate-500">Generar documento legal</p>
                            </div>
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

const VehicleFormModal = ({ isOpen, onClose, onSave, initialData }) => {
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    // Parse numeric values
    data.price = Number(data.price);
    data.price_dop = Number(data.price_dop);
    data.year = Number(data.year);
    data.mileage = Number(data.mileage);
    
    // Default image if missing
    data.image = initialData?.image || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&q=80&w=800'; 
    onSave(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-4xl animate-in zoom-in-95 duration-200">
        <Card className="w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4 sticky top-0 bg-white z-10">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <div className="p-2 bg-red-100 rounded-lg text-red-600"><Car size={20}/></div>
              {initialData ? 'Editar Vehículo' : 'Nuevo Vehículo'}
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Sección 1: Datos Principales */}
            <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-1">Datos Principales</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input name="make" label="Marca" defaultValue={initialData?.make} placeholder="Ej. Toyota" required />
                    <Input name="model" label="Modelo" defaultValue={initialData?.model} placeholder="Ej. Corolla" required />
                    <Input name="year" label="Año" type="number" defaultValue={initialData?.year} required />
                    <Input name="color" label="Color Exterior" defaultValue={initialData?.color} placeholder="Ej. Blanco Perla" required />
                    <Input name="edition" label="Edición" defaultValue={initialData?.edition} placeholder="Ej. Limited / SE" />
                    <Input name="mileage" label="Millaje" type="number" defaultValue={initialData?.mileage} placeholder="0" required />
                </div>
            </div>

            {/* Sección 2: Especificaciones Técnicas */}
            <div>
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-100 pb-1">Especificaciones</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select 
                        name="transmission" 
                        label="Transmisión" 
                        defaultValue={initialData?.transmission || 'Automática'}
                        options={['Automática', 'Manual', 'Tiptronic', 'CVT', 'DCT']} 
                    />
                    <Select 
                        name="traction" 
                        label="Tracción" 
                        defaultValue={initialData?.traction || 'FWD'}
                        options={['FWD (Delantera)', 'RWD (Trasera)', 'AWD', '4x4', '4MATIC', 'Quattro']} 
                    />
                    <Select 
                        name="fuel" 
                        label="Combustible" 
                        defaultValue={initialData?.fuel || 'Gasolina'}
                        options={['Gasolina', 'Diesel', 'Híbrido', 'Eléctrico', 'Gas GLP']} 
                    />
                    <Input name="vin" label="Chasis / VIN" defaultValue={initialData?.vin} className="md:col-span-3 font-mono" required />
                </div>
            </div>

            {/* Sección 3: Precios y Estado */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-1">Precios y Estado</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input name="price" label="Precio Venta (US$)" type="number" defaultValue={initialData?.price} required />
                    <Input name="price_dop" label="Precio Venta (RD$)" type="number" defaultValue={initialData?.price_dop} required />
                    <Select 
                        name="status" 
                        label="Estado Inventario" 
                        defaultValue={initialData?.status || 'available'}
                        options={['available', 'quoted', 'sold']} 
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" onClick={onClose} type="button">Cancelar</Button>
              <Button type="submit">Guardar Vehículo</Button>
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

  const handleSend = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
        onConfirm();
        setLoading(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-md animate-in zoom-in-95 duration-200">
        <Card>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center">
              <div className="p-2 bg-red-50 rounded-lg mr-3">
                 <Send size={18} className="text-red-600" />
              </div>
              Cotizar en GoHighLevel
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Se enviará la ficha técnica del <strong>{vehicle.make} {vehicle.model}</strong>.
          </p>
          <form onSubmit={handleSend}>
            <div className="grid grid-cols-2 gap-3">
                <Input label="Nombre" placeholder="Ej. Jean" required />
                <Input label="Apellido" placeholder="Ej. Gómez" required />
            </div>
            <Input label="Teléfono (WhatsApp)" placeholder="+1 829..." required />
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} type="button" disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                  {loading ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Enviando...
                      </>
                  ) : 'Enviar Cotización'}
              </Button>
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
  
  // Nuevos estados para los datos del cliente
  const [clientName, setClientName] = useState('');
  const [clientLastName, setClientLastName] = useState('');
  const [clientCedula, setClientCedula] = useState('');
  
  const [loading, setLoading] = useState(false);

  const availableVehicles = inventory.filter(v => v.status !== 'sold' || (initialVehicle && v.id === initialVehicle.id));

  useEffect(() => {
    if (initialVehicle) {
      setSelectedVehicleId(initialVehicle.id);
    }
  }, [initialVehicle]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTemplate || !selectedVehicleId) return;
    
    setLoading(true);
    const vehicle = inventory.find(v => v.id === parseInt(selectedVehicleId));
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
              <div className="p-2 bg-red-50 rounded-lg mr-3">
                 <FilePlus size={20} className="text-red-600" />
              </div>
              Generar Nuevo Contrato
            </h3>
            <button onClick={onClose}><X size={20} className="text-gray-400 hover:text-red-500 transition-colors" /></button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Paso 1: Seleccionar Vehículo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">1. Selecciona el Vehículo</label>
              <select 
                className="w-full px-3 py-3 border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                required
              >
                <option value="">-- Seleccionar vehículo disponible --</option>
                {availableVehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.make} {v.model} ({v.year}) - ${v.price.toLocaleString()}</option>
                ))}
              </select>
            </div>

            {/* Paso 2: Datos del Cliente (DIVIDIDO) */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
               <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                 <User size={16} /> 2. Datos del Cliente
               </label>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <Input 
                     label="Nombre" 
                     placeholder="Ej. Juan" 
                     value={clientName}
                     onChange={(e) => setClientName(e.target.value)}
                     required 
                   />
                   <Input 
                     label="Apellido" 
                     placeholder="Ej. Pérez" 
                     value={clientLastName}
                     onChange={(e) => setClientLastName(e.target.value)}
                     required 
                   />
               </div>
               <Input 
                 label="Cédula / Pasaporte" 
                 placeholder="001-0000000-0" 
                 value={clientCedula}
                 onChange={(e) => setClientCedula(e.target.value)}
                 required 
               />
            </div>

            {/* Paso 3: Elegir Plantilla */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">3. Elige una Plantilla</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CONTRACT_TEMPLATES.map(template => {
                  const Icon = template.icon;
                  const isSelected = selectedTemplate === template.id;
                  return (
                    <div 
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 relative overflow-hidden ${
                        isSelected 
                        ? 'border-red-600 bg-red-50 shadow-md' 
                        : 'border-gray-100 bg-gray-50 hover:bg-white hover:border-gray-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 text-red-600">
                          <CheckCircle size={16} fill="currentColor" className="text-white" />
                        </div>
                      )}
                      <Icon className={`mb-3 ${isSelected ? 'text-red-600' : 'text-gray-400'}`} size={24} />
                      <h4 className={`font-bold text-sm ${isSelected ? 'text-red-700' : 'text-gray-700'}`}>{template.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{template.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="ghost" onClick={onClose} type="button" disabled={loading}>Cancelar</Button>
              <Button type="submit" disabled={loading || !selectedTemplate || !selectedVehicleId}>
                  {loading ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Generando...
                      </>
                  ) : 'Generar y Guardar'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

// --- VISTAS PRINCIPALES ---

const TrashView = ({ trash, setTrash, setInventory, showToast }) => {

  const restoreItem = (itemToRestore) => {
    setInventory(prev => [itemToRestore, ...prev]);
    setTrash(prev => prev.filter(item => item.id !== itemToRestore.id));
    showToast("Vehículo restaurado al inventario");
  };

  const deletePermanently = (itemToDelete) => {
    if (window.confirm('Este vehículo se eliminará permanentemente. ¿Estás seguro?')) {
      setTrash(prev => prev.filter(item => item.id !== itemToDelete.id));
      showToast("Vehículo eliminado permanentemente", "info");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Papelera</h1>
        <p className="text-slate-500 text-sm mt-1">Vehículos eliminados. Se pueden restaurar o eliminar permanentemente.</p>
      </div>

      {trash.length > 0 ? (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehículo</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Precio</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {trash.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors duration-200">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <img src={item.image} alt={item.model} className="w-16 h-10 object-cover rounded-md" />
                        <div>
                          <div className="text-sm font-bold text-slate-900">{item.make} {item.model}</div>
                          <div className="text-xs text-slate-400">{item.year} • {item.vin}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-700">US$ {item.price.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" className="text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50" onClick={() => restoreItem(item)}>
                          <Undo size={16} className="mr-2" /> Restaurar
                        </Button>
                        <Button variant="ghost" className="text-red-600 hover:text-red-800 hover:bg-red-50" onClick={() => deletePermanently(item)}>
                           <Trash size={16} className="mr-2" /> Borrar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-gray-200">
          <Trash2 size={48} className="mb-4 text-slate-300" />
          <p className="text-lg font-medium">La papelera está vacía.</p>
        </div>
      )}
    </div>
  );
};


const DashboardView = ({ inventory, contracts, setActiveTab }) => {
  const stats = [
    { label: 'Inventario Total', value: inventory.length, icon: Car, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Cotizados (Mes)', value: inventory.filter(i => i.status === 'quoted').length, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Ventas (Mes)', value: inventory.filter(i => i.status === 'sold').length, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Resumen de actividad de <span className="font-semibold text-red-700">{MOCK_USER.dealerName}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="flex items-center group cursor-pointer border-t-4 border-t-transparent hover:border-t-red-600">
            <div className={`p-4 rounded-xl ${stat.bg} mr-5 transition-transform group-hover:scale-110 duration-300`}>
              <stat.icon className={stat.color} size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-lg">Últimos Contratos (GHL)</h3>
            <span className="text-xs text-red-600 font-bold uppercase tracking-wider cursor-pointer hover:underline" onClick={() => setActiveTab('contracts')}>Ver todos</span>
          </div>
          <div className="space-y-4">
            {contracts.slice(0, 3).map(contract => (
              <div key={contract.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-white hover:shadow-md transition-all duration-300 cursor-default">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm mr-4 shadow-sm">
                    {contract.client.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{contract.client}</p>
                    <p className="text-xs text-slate-500">{contract.vehicle}</p>
                  </div>
                </div>
                <Badge status={contract.status} />
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-lg">Actividad Reciente</h3>
          </div>
          <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 py-2">
             <div className="ml-6 relative">
                <div className="absolute w-4 h-4 bg-red-600 rounded-full -left-[33px] top-0.5 border-[3px] border-white shadow-sm"></div>
                <p className="text-sm text-slate-900 font-bold">Nueva cotización enviada</p>
                <p className="text-xs text-slate-500 mt-1">Hace 10 minutos • Paula Gil</p>
             </div>
             <div className="ml-6 relative">
                <div className="absolute w-4 h-4 bg-slate-300 rounded-full -left-[33px] top-0.5 border-[3px] border-white shadow-sm"></div>
                <p className="text-sm text-slate-900 font-bold">Vehículo vendido</p>
                <p className="text-xs text-slate-500 mt-1">Ayer • Mercedes-Benz GLE</p>
             </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

const InventoryView = ({ inventory, setInventory, setTrash, showToast, onGenerateContract, onVehicleSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('available');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // States para el nuevo flujo de acción
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState(null);

  // Filtrado inicial por búsqueda y tab
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = `${item.make} ${item.model}`.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesTab = true;
      if (activeTab === 'available') matchesTab = item.status === 'available' || item.status === 'quoted';
      if (activeTab === 'sold') matchesTab = item.status === 'sold';
      
      return matchesSearch && matchesTab;
    });
  }, [inventory, searchTerm, activeTab]);

  // Agrupación por marca (Alfabético)
  const groupedInventory = useMemo(() => {
    const groups = {};
    filteredInventory.forEach(item => {
      if (!groups[item.make]) {
        groups[item.make] = [];
      }
      groups[item.make].push(item);
    });
    return groups;
  }, [filteredInventory]);

  const sortedBrands = Object.keys(groupedInventory).sort();

  const handleSaveVehicle = (vehicleData) => {
    if (currentVehicle?.id) {
      setInventory(prev => prev.map(v => v.id === currentVehicle.id ? { ...v, ...vehicleData } : v));
      showToast("Vehículo actualizado correctamente");
    } else {
      const newId = (inventory.length > 0 ? Math.max(...inventory.map(i => i.id)) : 0) + 1;
      setInventory([...inventory, { id: newId, ...vehicleData }]);
      showToast("Vehículo creado exitosamente");
    }
    setIsModalOpen(false);
    setCurrentVehicle(null);
  };

  const handleDelete = (id) => {
    if(window.confirm('¿Seguro que deseas enviar este vehículo a la papelera?')) {
      const itemToTrash = inventory.find(v => v.id === id);
      setTrash(prev => [itemToTrash, ...prev]);
      setInventory(prev => prev.filter(v => v.id !== id));
      showToast("Vehículo enviado a la papelera", "info");
    }
  };

  // Abre el modal de selección de acción
  const openActionModal = (vehicle) => {
    setCurrentVehicle(vehicle);
    setIsActionModalOpen(true);
  };

  // Maneja la selección del usuario en el modal intermedio
  const handleActionSelect = (action) => {
      setIsActionModalOpen(false);
      if (action === 'quote') {
          setIsQuoteModalOpen(true);
      } else if (action === 'contract') {
          setIsContractModalOpen(true);
      }
  };

  const handleQuoteSent = () => {
    setIsQuoteModalOpen(false);
    showToast("Cotización enviada a GoHighLevel");
    setInventory(prev => prev.map(v => v.id === currentVehicle.id ? { ...v, status: 'quoted' } : v));
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
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Inventario: <span className="text-red-700">{MOCK_USER.dealerName}</span></h1>
            <p className="text-slate-500 text-sm mt-1">Organizado por marcas • {filteredInventory.length} vehículos</p>
        </div>
        <Button onClick={() => { setCurrentVehicle(null); setIsModalOpen(true); }} icon={Plus} className="shadow-lg shadow-red-600/20">
          Agregar Vehículo
        </Button>
      </div>

      <div className="flex space-x-1 bg-slate-100/80 p-1 rounded-xl w-full sm:w-fit backdrop-blur-sm">
        <button 
            onClick={() => setActiveTab('available')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'available' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
            Disponibles
        </button>
        <button 
            onClick={() => setActiveTab('sold')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'sold' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
            Vendidos
        </button>
        <button 
            onClick={() => setActiveTab('all')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
        >
            Todos
        </button>
      </div>

      <div className="relative max-w-md group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-red-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por marca, modelo o VIN..." 
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all duration-300 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
      </div>

      {/* Renderizado por Grupos de Marcas */}
      <div className="space-y-10">
        {sortedBrands.map(brand => (
            <div key={brand}>
                <div className="flex items-center mb-4">
                    <h2 className="text-xl font-bold text-slate-800 mr-3">{brand}</h2>
                    <div className="h-px flex-1 bg-gray-200"></div>
                    <span className="text-xs font-medium text-gray-500 ml-3 bg-gray-100 px-2 py-1 rounded-full">{groupedInventory[brand].length} vehículos</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {groupedInventory[brand].map(item => (
                        <div key={item.id} onClick={() => onVehicleSelect(item)} className="cursor-pointer">
                            <Card noPadding className="group flex flex-col h-full hover:-translate-y-1">
                                <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
                                    <img src={item.image} alt={item.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                                    <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="absolute top-3 right-3 shadow-sm">
                                        <Badge status={item.status} />
                                    </div>
                                    <div className="absolute bottom-3 left-3 flex gap-1">
                                        {item.transmission && <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] rounded-md flex items-center gap-1"><Settings size={10}/> {item.transmission}</span>}
                                        {item.fuel && <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] rounded-md flex items-center gap-1"><Fuel size={10}/> {item.fuel}</span>}
                                    </div>
                                </div>
                                <div className="p-5 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg">{item.make} {item.model}</h3>
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{item.year} • {item.edition || item.vin.slice(-6)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 mb-4">
                                        <p className="text-xl font-bold text-red-700">
                                            US$ {item.price.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-400 font-medium">
                                            RD$ {(item.price_dop || (item.price * 58)).toLocaleString()}
                                        </p>
                                    </div>
                                    
                                    <div className="mt-auto grid grid-cols-2 gap-3">
                                        <Button variant="secondary" className="w-full text-xs font-bold border-red-100 text-red-700 hover:bg-red-50 flex items-center justify-center gap-1" onClick={(e) => { e.stopPropagation(); openActionModal(item); }}>
                                            <Files size={14} /> GENERAR
                                        </Button>
                                        <div className="flex gap-2">
                                            <button onClick={(e) => { e.stopPropagation(); setCurrentVehicle(item); setIsModalOpen(true); }} className="flex-1 flex items-center justify-center bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg text-gray-500 hover:text-red-600 transition-all">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="flex-1 flex items-center justify-center bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg text-gray-500 hover:text-red-600 transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    ))}
                </div>
            </div>
        ))}
        
        {sortedBrands.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-gray-200">
            <Car size={48} className="mb-4 text-slate-200" />
            <p className="text-lg font-medium">No hay vehículos en esta categoría.</p>
          </div>
        )}
      </div>

      {/* Modales */}
      <VehicleFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveVehicle}
        initialData={currentVehicle}
      />

      <ActionSelectionModal 
        isOpen={isActionModalOpen}
        onClose={() => setIsActionModalOpen(false)}
        onSelect={handleActionSelect}
      />

      <QuoteModal 
        isOpen={isQuoteModalOpen} 
        onClose={() => setIsQuoteModalOpen(false)} 
        vehicle={currentVehicle}
        onConfirm={handleQuoteSent}
      />

      <GenerateContractModal 
        isOpen={isContractModalOpen} 
        onClose={() => {setIsContractModalOpen(false); setCurrentVehicle(null);}}
        inventory={inventory}
        onGenerate={handleContractGenerated}
        initialVehicle={currentVehicle}
      />
    </div>
  );
};

const ContractsView = ({ contracts, inventory, onGenerateContract, setActiveTab }) => {
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-bold text-slate-900">Contratos (GHL)</h1>
           <p className="text-slate-500 text-sm mt-1">Historial de documentos generados</p>
        </div>
        <Button icon={FilePlus} onClick={() => setIsGenerateModalOpen(true)} className="shadow-lg shadow-red-600/20">
            Generar Contrato
        </Button>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehículo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plantilla / Tipo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {contracts.map(contract => (
                <tr key={contract.id} className="hover:bg-red-50/30 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-slate-900">{contract.client}</div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">ID: {contract.ghl_id}</div>
                    {contract.cedula && <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><IdCard size={10}/> {contract.cedula}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{contract.vehicle}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                      {contract.template || contract.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge status={contract.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button variant="ghost" className="text-red-600 hover:text-red-800 hover:bg-red-50 text-sm p-2 rounded-full">
                      <FileText size={18} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 p-4 text-center border-t border-slate-200">
           <p className="text-xs text-slate-500 flex items-center justify-center gap-2 font-medium">
             <CheckCircle size={14} className="text-green-500" /> Sincronizado en tiempo real con GoHighLevel API
           </p>
        </div>
      </Card>

      <GenerateContractModal 
        isOpen={isGenerateModalOpen} 
        onClose={() => setIsGenerateModalOpen(false)}
        inventory={inventory}
        onGenerate={onGenerateContract}
        initialVehicle={null}
      />
    </div>
  );
};

// --- APP SHELL & LAYOUT ---

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center px-4 py-3.5 mb-1.5 rounded-xl transition-all duration-300 group ${
      active 
      ? 'bg-red-700 text-white shadow-lg shadow-red-900/50 translate-x-1' 
      : 'text-slate-400 hover:bg-slate-800 hover:text-white hover:translate-x-1'
    }`}
  >
    <Icon size={22} className={`mr-3 transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
    <span className="font-medium text-sm tracking-wide">{label}</span>
  </button>
);

const AppLayout = ({ children, activeTab, setActiveTab, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Car },
    { id: 'contracts', label: 'Contratos', icon: FileText },
    { id: 'trash', label: 'Papelera', icon: Trash2 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans selection:bg-red-200 selection:text-red-900">
      {/* Sidebar Desktop - Negro/Rojo Elegante */}
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 border-r border-slate-800 fixed h-full z-20 shadow-2xl">
        <div className="p-8 flex items-center space-x-3">
          <AppLogo className="w-12 h-12" size={32} invert />
          <span className="text-2xl font-bold text-white tracking-tight">Carbot</span>
        </div>
        
        <nav className="flex-1 px-6 mt-4">
          <div className="mb-6 px-2 text-xs font-bold text-slate-500 uppercase tracking-widest">Navegación</div>
          {menuItems.map(item => (
            <SidebarItem 
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </nav>

        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 px-2 mb-6 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-slate-200 shadow-inner border border-slate-600">
              <User size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-white truncate">{MOCK_USER.name}</p>
              <p className="text-xs text-slate-400 truncate font-medium">{MOCK_USER.dealerName}</p>
            </div>
          </div>
          <button onClick={onLogout} className="w-full flex items-center justify-center px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl text-sm font-medium transition-all duration-300 group">
            <LogOut size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 md:ml-72 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden bg-white/80 backdrop-blur-md border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-30">
          <div className="flex items-center space-x-2">
            <AppLogo className="w-10 h-10" size={24} />
            <span className="font-bold text-slate-900 text-lg">Carbot</span>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-600 p-2 hover:bg-slate-100 rounded-lg transition-colors">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-20 bg-slate-900 pt-24 px-6 animate-in slide-in-from-top-10 fade-in duration-300">
            <nav className="space-y-3">
              {menuItems.map(item => (
                <SidebarItem 
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  active={activeTab === item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                />
              ))}
              <div className="border-t border-slate-800 my-6 pt-6">
                 <div className="flex items-center gap-3 px-2 mb-6">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                      <User size={20} />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-sm font-bold text-white truncate">{MOCK_USER.name}</p>
                      <p className="text-xs text-slate-400 truncate">{MOCK_USER.dealerName}</p>
                    </div>
                  </div>
                <button onClick={onLogout} className="flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 w-full px-4 py-4 rounded-xl transition-all">
                  <LogOut size={20} className="mr-3" />
                  Cerrar Sesión
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-10 overflow-y-auto w-full max-w-[1600px] mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

// --- LOGIN SCREEN ---

const LoginScreen = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    // Simular API delay
    setTimeout(() => {
      onLogin();
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-red-200">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-500">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
             <AppLogo className="w-24 h-24" size={48} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Bienvenido a Carbot</h1>
          <p className="text-slate-500 mt-2 font-medium">Sistema Inteligente para Dealers</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input label="Correo Corporativo" placeholder="usuario@dealer.com" type="email" required />
          <Input label="Contraseña" type="password" required />
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3.5 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 hover:shadow-red-600/50 transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Ingresar al Dashboard'}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-400 font-medium">
          <p>Protegido por autenticación Multi-tenant</p>
          <div className="flex items-center justify-center gap-2 mt-2 opacity-60">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
             <span>Sistemas Operativos</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---

export default function CarbotApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);
  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [trash, setTrash] = useState([]);
  const [contracts, setContracts] = useState(INITIAL_CONTRACTS);
    const [toast, setToast] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);

    const handleVehicleSelect = (vehicle) => {
    setSelectedVehicle(vehicle);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleGenerateContract = (contractData) => {
    const newContract = {
      id: (contracts.length > 0 ? Math.max(...contracts.map(c => c.id)) : 0) + 1,
      ...contractData
    };
    setContracts([newContract, ...contracts]);
    showToast("Contrato generado exitosamente");
  };

  if (!isLoggedIn) {
    return <LoginScreen onLogin={() => setIsLoggedIn(true)} />;
  }

  const renderContent = () => {
    if (selectedVehicle) {
      return <VehicleEditView vehicle={selectedVehicle} onBack={() => setSelectedVehicle(null)} />;
    }
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView inventory={inventory} contracts={contracts} setActiveTab={setActiveTab} />;
      case 'inventory':
        return <InventoryView inventory={inventory} setInventory={setInventory} setTrash={setTrash} showToast={showToast} onGenerateContract={handleGenerateContract} onVehicleSelect={handleVehicleSelect} />;
      case 'contracts':
        return <ContractsView contracts={contracts} inventory={inventory} onGenerateContract={handleGenerateContract} setActiveTab={setActiveTab} />;
      case 'trash':
        return <TrashView trash={trash} setTrash={setTrash} setInventory={setInventory} showToast={showToast} />;
      default:
        return <DashboardView inventory={inventory} contracts={contracts} />;
    }
  };

  return (
    <>
      <AppLayout activeTab={activeTab} setActiveTab={setActiveTab} onLogout={() => setIsLoggedIn(false)}>
        {renderContent()}
      </AppLayout>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}