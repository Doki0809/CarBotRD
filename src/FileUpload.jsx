import React, { useState, useRef } from 'react';
import { Upload, File, Trash2, Paperclip } from 'lucide-react';

export default function FileUpload({ title, accepts, files, onFilesChange }) {
  const [fileList, setFileList] = useState(files || []);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const updatedFiles = [...fileList, ...newFiles];
    setFileList(updatedFiles);
    if (onFilesChange) {
      onFilesChange(updatedFiles);
    }
  };

  const handleRemoveFile = (index) => {
    const updatedFiles = fileList.filter((_, i) => i !== index);
    setFileList(updatedFiles);
    if (onFilesChange) {
      onFilesChange(updatedFiles);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
      <div className='flex justify-between items-center mb-4'>
        <h2 className='text-xl font-bold flex items-center'>
          <Paperclip size={24} className='mr-2 text-red-600'/> {title}
        </h2>
        <button onClick={triggerFileInput} className='bg-red-100 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-200'>
          <Upload size={18}/> Subir
        </button>
        <input 
          type="file" 
          multiple 
          accept={accepts} 
          ref={fileInputRef} 
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      <div className='space-y-3'>
        {fileList.length > 0 ? (
          fileList.map((file, index) => (
            <div key={index} className='flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200'>
              <div className='flex items-center gap-3'>
                <File size={20} className='text-slate-500'/>
                <span className='text-sm font-medium text-slate-700'>{file.name}</span>
              </div>
              <button onClick={() => handleRemoveFile(index)} className='text-red-500 hover:text-red-700'>
                <Trash2 size={18}/>
              </button>
            </div>
          ))
        ) : (
          <p className='text-slate-500 text-center py-4'>No hay archivos subidos.</p>
        )}
      </div>
    </div>
  );
}
