/**
 * GHL Service - Preparación de datos para GoHighLevel
 * Este servicio mapea los datos de clientes y vehículos para ser enviados al backend.
 */

export const prepareGHLPayload = (clientData, vehicleData) => {
    // Mapeo de datos del cliente
    const clientPayload = {
        firstName: clientData.name || '',
        lastName: clientData.lastname || '',
        email: clientData.email || '',
        phone: clientData.phone || '',
        address: clientData.address || '',
        city: clientData.city || '',
        state: clientData.state || '',
        postalCode: clientData.zip || '',
        customFields: {
            cedula: clientData.cedula || '',
            rnc: clientData.rnc || '',
        }
    };

    // Mapeo de datos del vehículo (excluyendo fotos)
    const vehiclePayload = {
        brand: vehicleData.brand || '',
        model: vehicleData.model || '',
        year: vehicleData.year || vehicleData.anio || '',
        color: vehicleData.color || '',
        vin: vehicleData.vin || '',
        version: vehicleData.version || '',
        mileage: vehicleData.mileage || vehicleData.millaje || '',
        fuelType: vehicleData.fuelType || vehicleData.combustible || '',
        transmission: vehicleData.transmission || vehicleData.transmision || '',
        passengers: vehicleData.passengers || vehicleData.pasajeros || '',
        price: vehicleData.price || vehicleData.precio_venta || '',
        status: vehicleData.status || ''
    };

    return {
        client: clientPayload,
        vehicle: vehiclePayload,
        timestamp: new Date().toISOString(),
        source: 'CarBot System'
    };
};

export const sendToGHL = async (payload) => {
    try {
        // Aquí se implementará la llamada real al backend/Firebase Function
        console.log('Enviando payload a GHL:', payload);

        // Ejemplo de llamada a función de Firebase (placeholder)
        // const response = await fetch('YOUR_GHL_API_ENDPOINT', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(payload)
        // });
        // return await response.json();

        return { success: true, message: 'Datos preparados exitosamente' };
    } catch (error) {
        console.error('Error enviando a GHL:', error);
        throw error;
    }
};
