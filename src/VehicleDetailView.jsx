import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Truck } from 'lucide-react'; // Assuming lucide-react is used, or replace with available icon library

// --- 1. FUNCIÓN DE AYUDA ---
const TASA_CAMBIO = 60; // Ajustable

const getPrecioEnPesos = (precio, moneda) => {
    if (!precio) return 0;
    if (moneda === 'USD' || moneda === 'US$') {
        return parseFloat(precio) * TASA_CAMBIO;
    }
    return parseFloat(precio);
};

// Mock data helper if not provided vertically
// In a real app, this would come from context or props
const useInventory = () => {
    // Placeholder: Fetch or use context here
    return [];
}

const VehicleDetailView = ({ vehicles = [] }) => {
    const { dealerID, vehicleID } = useParams();
    const navigate = useNavigate();

    // Find current vehicle
    const vehicle = vehicles.find(v => v.id === vehicleID);

    const [relacionados, setRelacionados] = useState([]);

    useEffect(() => {
        if (!vehicle || !vehicles.length) return;

        const precioBase = getPrecioEnPesos(vehicle.price, vehicle.currency);
        const tipoBase = vehicle.bodyType || vehicle.type;
        const asientosBase = vehicle.seatRows;

        const encontrados = vehicles.filter((item) => {
            // 1. No incluir el mismo carro
            if (item.id === vehicle.id) return false;

            // 2. Solo disponibles
            // if (item.status !== 'Disponible') return false; // Uncomment if status exists

            // --- FILTRO DE PRECIO (Regla de los 200k) ---
            const precioItem = getPrecioEnPesos(item.price, item.currency);
            const diferencia = Math.abs(precioBase - precioItem);
            const estaEnRango = diferencia <= 200000;

            // --- FILTRO DE TIPO ---
            const tipoItem = item.bodyType || item.type;
            const esMismoTipo = tipoItem && tipoBase && (tipoItem.toLowerCase() === tipoBase.toLowerCase());
            const mismosAsientos = item.seatRows && asientosBase && (item.seatRows === asientosBase);

            // REGLA FINAL
            return estaEnRango && (esMismoTipo || mismosAsientos);
        });

        setRelacionados(encontrados.slice(0, 4));

    }, [vehicle, vehicles]);

    if (!vehicle) return <div className="p-10 text-center">Vehículo no encontrado</div>;

    return (
        <div className="container mx-auto p-4">
            {/* Detail View Header / Main Content Placeholder */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold">{vehicle.brand} {vehicle.model}</h1>
                {/* ... Rest of detail view ... */}
            </div>

            {/* --- PASO 2: MOSTRAR TARJETAS --- */}
            <div className="mt-12">
                <div className="flex items-center gap-2 mb-6 border-b pb-4">
                    <Truck className="w-6 h-6 text-red-600" />
                    <h2 className="text-xl font-bold text-gray-800 uppercase">
                        Vehículos Relacionados
                    </h2>
                </div>

                {relacionados.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {relacionados.map((item) => (
                            <div
                                key={item.id}
                                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer border border-gray-100"
                                onClick={() => navigate(`/catalogo?dealerID=${dealerID}&vehicleID=${item.id}`)}
                            >
                                {/* FOTO */}
                                <div className="h-40 bg-gray-200 relative">
                                    <img
                                        src={item.mainImage || item.imageUrls?.[0] || 'https://via.placeholder.com/300x200?text=Sin+Imagen'}
                                        alt={`${item.brand} ${item.model}`}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                                        {item.year}
                                    </div>
                                </div>

                                {/* DATOS */}
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-800 text-sm truncate uppercase">
                                        {item.brand} {item.model} {item.version}
                                    </h3>

                                    <div className="mt-2 flex justify-between items-center">
                                        <span className="text-red-600 font-black text-lg">
                                            {item.currency === 'USD' ? 'US$' : 'RD$'} {new Intl.NumberFormat('en-US').format(item.price)}
                                        </span>
                                    </div>

                                    <div className="mt-3 flex gap-2">
                                        <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                            {item.bodyType || 'Vehículo'}
                                        </span>
                                        <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                                            Similar Precio
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-gray-400 italic text-center py-10 bg-gray-50 rounded-lg">
                        No encontramos vehículos similares en este rango de precio por ahora.
                    </div>
                )}
            </div>
        </div>
    );
};

export default VehicleDetailView;
