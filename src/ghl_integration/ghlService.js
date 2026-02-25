// src/ghl_integration/ghlService.js

export const prepararPayloadGHL = (cliente, vehiculo, locationId) => {
    return {
        // Datos Estándar (No necesitan ID especial)
        firstName: cliente.nombre || "",
        lastName: cliente.apellido || "",
        phone: cliente.telefono || "",
        email: cliente.email || "",
        locationId: locationId,
        dealerId: cliente.dealerId,

        // CAMPOS PERSONALIZADOS (Mapeados según tus capturas)
        customFields: [
            // INFORMACIÓN PRINCIPAL (Captura 1)
            { id: "marca", field_value: vehiculo.marca || "" },
            { id: "modelo", field_value: vehiculo.modelo || "" },
            { id: "ano", field_value: vehiculo.ano || "" },
            { id: "color", field_value: vehiculo.color || "" },
            { id: "edicin", field_value: vehiculo.edicion || "" }, // GHL lo guardó como 'edicin'
            { id: "chasis", field_value: vehiculo.chasis || "" },
            { id: "placa", field_value: vehiculo.placa || "" },
            { id: "precio", field_value: vehiculo.precio || "" },

            // FICHA TÉCNICA Y MECÁNICA (Captura 2)
            { id: "tipo_de_vehculo", field_value: vehiculo.tipo_vehiculo || "" },
            { id: "millaje", field_value: vehiculo.millaje || "" },
            { id: "combustible", field_value: vehiculo.combustible || "" },
            { id: "condicin", field_value: vehiculo.condicion || "" },
            { id: "traccin", field_value: vehiculo.traccion || "" },
            { id: "transmisin", field_value: vehiculo.transmision || "" },
            { id: "aspiracin", field_value: vehiculo.aspiracion || "" },
            { id: "cilindros", field_value: vehiculo.cilindros || "" },
            { id: "cilindrada", field_value: vehiculo.cilindrada || "" },

            // FINANZAS Y CLIENTE EXTRA (Captura 3 y 4)
            { id: "precio_de_cotizacin", field_value: vehiculo.precio_cotizacion || "" },
            { id: "a_quien_va_dirigido_banco", field_value: cliente.banco || "" },
            { id: "cdula", field_value: cliente.cedula || "" },
            { id: "inicial", field_value: vehiculo.inicial || "" }
        ]
    };
};

export const generarContratoEnGHL = async (cliente, vehiculo, locationId, templateId, dealerId) => {
    const payload = { ...prepararPayloadGHL(cliente, vehiculo, locationId), dealerId: dealerId };
    try {
        const response = await fetch('/api/ghl/generar-contrato', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contactData: payload, templateId: templateId })
        });
        if (!response.ok) throw new Error("Error al comunicar con el backend");
        const data = await response.json();
        return data.documentUrl;
    } catch (error) {
        console.error("Fallo la integración con GHL:", error);
        throw error;
    }
};
