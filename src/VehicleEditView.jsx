import React, { useState } from 'react';
import { ArrowLeft, Calendar, Gauge, Fuel, Settings, Save } from 'lucide-react';
import FileUpload from './FileUpload.jsx';

export default function VehicleEditView({ vehicle, onBack }) {
  if (!vehicle) return null;

  const [formData, setFormData] = useState({
    ...vehicle,
    photos: vehicle.photos || [],
    documents: vehicle.documents || [],
  });

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newFormData = { ...prev };
      if (name === 'priceUS' && value) {
        newFormData.priceUS = value;
        newFormData.priceRD = '';
      } else if (name === 'priceRD' && value) {
        newFormData.priceRD = value;
        newFormData.priceUS = '';
      } else {
        newFormData[name] = value;
      }
      return newFormData;
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFilesChange = (field) => (files) => {
    setFormData(prev => ({ ...prev, [field]: files }));
  };

  return (
    <div className='animate-in slide-in-from-right duration-300 p-6'>
      <button onClick={onBack} className='flex items-center text-slate-500 hover:text-red-700 mb-6'>
        <ArrowLeft size={20} className='mr-2' /> Volver
      </button>
      <form>
        <div className='bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden'>
          <div className='h-64 w-full relative'>
            <img src={formData.image} className='w-full h-full object-cover' />
            <div className='absolute bottom-4 left-4 text-white bg-black/50 px-3 py-1 rounded'>
              <h1 className='text-2xl font-bold'>{formData.make} {formData.model}</h1>
            </div>
          </div>
          <div className='p-6 grid grid-cols-2 gap-4'>
            <div className='flex items-center gap-2'>
              <Calendar size={18} className='text-red-600'/>
              <input type='text' name='year' value={formData.year} onChange={handleChange} className='p-2 border rounded-md w-full'/>
            </div>
            <div className='flex items-center gap-2'>
              <Settings size={18} className='text-red-600'/>
              <input type='text' name='transmission' value={formData.transmission} onChange={handleChange} className='p-2 border rounded-md w-full'/>
            </div>
            <div className='flex items-center gap-2'>
              <Fuel size={18} className='text-red-600'/>
              <input type='text' name='fuel' value={formData.fuel} onChange={handleChange} className='p-2 border rounded-md w-full'/>
            </div>
            <div className='flex items-center gap-2'>
              <Gauge size={18} className='text-red-600'/>
              <input type='text' name='mileage' value={formData.mileage} onChange={handleChange} className='p-2 border rounded-md w-full'/>
            </div>
            <div className='col-span-2'>
              <label className='font-bold'>Edición:</label>
              <input type='text' name='edition' value={formData.edition} onChange={handleChange} className='p-2 border rounded-md w-full mt-1'/>
            </div>
            <div className='col-span-2'>
              <label className='font-bold'>Chasis:</label>
              <input type='text' name='chassis' value={formData.chassis} onChange={handleChange} className='p-2 border rounded-md w-full mt-1'/>
            </div>
            <div className='col-span-2 grid grid-cols-2 gap-4'>
                <div>
                    <label className='font-bold text-red-700'>Precio US$</label>
                    <input 
                        type='number' 
                        name='priceUS' 
                        value={formData.priceUS} 
                        onChange={handlePriceChange} 
                        disabled={!!formData.priceRD}
                        className='p-2 border rounded-md w-full mt-1'
                    />
                </div>
                <div>
                    <label className='font-bold text-red-700'>Precio RD$</label>
                    <input 
                        type='number' 
                        name='priceRD' 
                        value={formData.priceRD} 
                        onChange={handlePriceChange} 
                        disabled={!!formData.priceUS}
                        className='p-2 border rounded-md w-full mt-1'
                    />
                </div>
            </div>
          </div>
        </div>
        
        <div className='mt-6'>
            <FileUpload 
                title="Fotos del Vehículo"
                accepts="image/*"
                files={formData.photos}
                onFilesChange={handleFilesChange('photos')}
            />
        </div>

        <div className='mt-6'>
            <FileUpload 
                title="Documentos"
                accepts=".pdf,.doc,.docx"
                files={formData.documents}
                onFilesChange={handleFilesChange('documents')}
            />
        </div>

        <div className='mt-6 flex justify-end'>
            <button type='submit' className='bg-red-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-red-800'>
                <Save size={18}/> Guardar
            </button>
        </div>
      </form>
    </div>
  );
}
