import re

file_path = '/Users/jean/carbotSystem/src/App.jsx'

new_modal_code = """// --- CONFIRMATION MODAL ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", isDestructive = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-[380px] relative overflow-hidden scale-100 animate-in zoom-in-95 duration-300 border border-white/20">
        
        {/* Red Top Accent */}
        <div className="h-2 w-full bg-gradient-to-r from-red-600 to-red-500"></div>

        <div className="p-8 text-center">
          {/* Logo Section */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative mb-3">
              <div className="absolute inset-0 bg-red-500 blur-xl opacity-20 rounded-full"></div>
              <AppLogo size={50} className="relative z-10 drop-shadow-sm" />
            </div>
            <div className="flex items-center gap-0.5">
               <span className="text-xl font-black text-red-600 tracking-tighter">Car</span>
               <span className="text-xl font-black text-slate-900 tracking-tighter">Bot</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">SISTEMA</p>
          </div>

          <h3 className="text-xl font-black text-slate-900 mb-3 leading-tight">{title}</h3>
          
          <div className="bg-red-50/50 rounded-2xl p-4 mb-8 border border-red-100/50">
            <p className="text-sm text-slate-600 font-medium leading-relaxed">{message}</p>
          </div>

          <div className="flex flex-col gap-3">
             <button 
               onClick={() => { onConfirm(); onClose(); }} 
               className={`w-full py-3.5 rounded-xl text-white font-bold shadow-lg shadow-red-600/20 hover:shadow-red-600/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isDestructive ? 'bg-gradient-to-r from-red-600 to-red-500' : 'bg-slate-900'}`}
             >
               {isDestructive && <AlertTriangle size={18} className="text-white/90" />}
               {confirmText}
             </button>
             <button 
               onClick={onClose} 
               className="w-full py-3 rounded-xl text-slate-400 font-bold hover:text-slate-600 hover:bg-slate-50 transition-colors text-xs uppercase tracking-widest"
             >
               {cancelText}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
"""

with open(file_path, 'r') as f:
    content = f.read()

# Pattern to find the existing ConfirmationModal block
# We look for "// --- CONFIRMATION MODAL ---" and capture everything until "// --- SETTINGS VIEW ---"
pattern = r"// --- CONFIRMATION MODAL ---.*?// --- SETTINGS VIEW ---"

# We need to make sure we don't accidentally consume the Settings View header, so we use lookahead or just replace up to it
# Actually, since dot matches all with re.DOTALL, we want to be careful.
# Let's find start and end indices.

start_marker = "// --- CONFIRMATION MODAL ---"
end_marker = "// --- SETTINGS VIEW ---"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    print(f"Found block from {start_idx} to {end_idx}")
    new_content = content[:start_idx] + new_modal_code + "\n\n" + content[end_idx:]
    
    with open(file_path, 'w') as f:
        f.write(new_content)
    print("Successfully replaced ConfirmationModal.")
else:
    print("Could not find start or end markers.")
    print(f"Start found: {start_idx}")
    print(f"End found: {end_idx}")
    # Fallback: try to find just the const definition if comment differs
    if start_idx == -1:
        alt_start = "const ConfirmationModal ="
        start_idx = content.find(alt_start)
        if start_idx != -1:
             print(f"Found alternative start at {start_idx}")
             # Look for the closing brace before SettingsView
             # This is riskier, but let's try to assume end_marker is found
             if end_idx != -1:
                 new_content = content[:start_idx] + new_modal_code + "\n\n" + content[end_idx:]
                 with open(file_path, 'w') as f:
                    f.write(new_content)
                 print("Successfully replaced ConfirmationModal (fallback).")
