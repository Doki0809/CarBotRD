// src/ghl_integration/ghlService.js

export const prepararPayloadGHL = (cliente, vehiculo, locationId) => {
    const payload = {
        // Datos Estándar (No necesitan ID especial)
        firstName: cliente.nombre || "Cliente",
        lastName: cliente.apellido || "CarBot",
        locationId: locationId,
        // CAMPOS PERSONALIZADOS (Mapeados según tus capturas)
        customFields: [
            // INFORMACIÓN PRINCIPAL
            { id: "marca", field_value: vehiculo.marca || vehiculo.make || "" },
            { id: "modelo", field_value: vehiculo.modelo || vehiculo.model || "" },
            { id: "ano", field_value: vehiculo.ano || vehiculo.year || "" },
            { id: "color", field_value: vehiculo.color || "" },
            { id: "edicin", field_value: vehiculo.edicion || vehiculo.trim || "" },
            { id: "chasis", field_value: vehiculo.chasis || vehiculo.vin || "" },
            { id: "placa", field_value: vehiculo.placa || "" },
            { id: "precio", field_value: String(cliente.precioFinal || vehiculo.precio || "") },

            // FICHA TÉCNICA Y MECÁNICA
            { id: "tipo_de_vehculo", field_value: vehiculo.tipo_vehiculo || vehiculo.bodyType || "" },
            { id: "millaje", field_value: String(vehiculo.millaje || vehiculo.mileage || "") },
            { id: "combustible", field_value: vehiculo.combustible || vehiculo.fuelType || "" },
            { id: "condicin", field_value: vehiculo.condicion || vehiculo.condition || "" },
            { id: "traccin", field_value: vehiculo.traccion || vehiculo.driveTrain || "" },
            { id: "transmisin", field_value: vehiculo.transmision || vehiculo.transmission || "" },
            { id: "aspiracin", field_value: vehiculo.aspiracion || "" },
            { id: "cilindros", field_value: String(vehiculo.cilindros || "") },
            { id: "cilindrada", field_value: vehiculo.cilindrada || "" },

            // FINANZAS Y CLIENTE EXTRA
            { id: "precio_de_cotizacin", field_value: String(cliente.precioFinal || "") },
            { id: "a_quien_va_dirigido_banco", field_value: cliente.banco || "" },
            { id: "cdula", field_value: cliente.cedula || "" },
            { id: "inicial", field_value: String(cliente.inicial || "") }
        ]
    };

    if (cliente.email && cliente.email.trim()) {
        payload.email = cliente.email.trim();
    }

    if (cliente.telefono) {
        // Normalizar teléfono: solo números (y + opcional al inicio)
        const normalizedPhone = cliente.telefono.replace(/[^\d+]/g, '');
        if (normalizedPhone.length >= 7) {
            payload.phone = normalizedPhone;
        }
    }

    return payload;
};

export const generarContratoEnGHL = async (cliente, vehiculo, locationId, templateId, dealerId, accessToken) => {
    const payload = prepararPayloadGHL(cliente, vehiculo, locationId);
    try {
        const response = await fetch('/api/ghl/generar-contrato', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactData: payload, templateId: templateId, ghl_access_token: accessToken, dealerId: dealerId })
        });
        if (!response.ok) throw new Error("Error al comunicar con el backend");
        const data = await response.json();
        return data.documentUrl;
    } catch (error) {
        console.error("Fallo la integración con GHL:", error);
        throw error;
    }
};
