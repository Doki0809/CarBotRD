import re

file_path = '/Users/jean/carbotSystem/src/App.jsx'

new_settings_code = """// --- SETTINGS VIEW ---
const SettingsView = ({ userProfile, onLogout, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: userProfile?.name || '',
    jobTitle: userProfile?.jobTitle || 'Vendedor'
  });
  const [isLoading, setIsLoading] = useState(false);

  // Sync formData when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        jobTitle: userProfile.jobTitle || 'Vendedor'
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    setIsLoading(true);
    await onUpdateProfile(formData);
    setIsEditing(false);
    setIsLoading(false);
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 sm:pb-0">
      
      {/* Premium Header Banner */}
      <div className="relative w-full h-40 sm:h-48 rounded-[32px] overflow-hidden mb-8 shadow-2xl shadow-red-900/20 group">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 to-slate-800"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
        
        {/* Decorative Red Accents */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600 rounded-full blur-[80px] opacity-20 -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-600 rounded-full blur-[80px] opacity-10 -ml-20 -mb-20"></div>

        <div className="absolute inset-0 flex flex-col justify-center px-8 sm:px-12 z-10">
           <div className="flex items-center gap-3 mb-2 opacity-80">
             <AppLogo size={32} className="text-white drop-shadow-md" />
             <span className="text-xs font-bold text-slate-300 uppercase tracking-widest border-l border-slate-600 pl-3">Sistema de Gestión</span>
           </div>
           <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-lg">
             CarBot <span className="text-red-500">x</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400">{userProfile?.dealerName || 'DEALER'}</span>
           </h1>
           <p className="text-slate-400 font-medium mt-2 max-w-md">Gestiona tu perfil y configuración de usuario.</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <Card className="!p-0 overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-sm">
          {/* Card Header with Edit Button */}
          <div className="flex items-center justify-between p-6 sm:p-8 bg-white border-b border-slate-100">
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-red-50 to-white flex items-center justify-center text-red-600 font-black text-2xl border-2 border-red-50 shadow-sm">
                   {userProfile?.name?.charAt(0) || 'U'}
                </div>
                <div>
                   <h2 className="text-xl font-black text-slate-900">{isEditing ? 'Editando Perfil' : 'Perfil de Usuario'}</h2>
                   <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{userProfile?.role || 'Admin'}</p>
                </div>
             </div>
             
             {!isEditing && (
               <button 
                 onClick={() => setIsEditing(true)}
                 className="p-3 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-red-600 transition-all active:scale-95 group"
                 title="Editar Perfil"
               >
                 <Edit size={20} className="group-hover:rotate-12 transition-transform" />
               </button>
             )}
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Name Field (Editable) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                <div className="relative group">
                   <User className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isEditing ? 'text-slate-700' : 'text-slate-300'}`} size={18} />
                   <input 
                     type="text" 
                     value={formData.name}
                     onChange={(e) => setFormData({...formData, name: e.target.value})}
                     disabled={!isEditing}
                     className={`w-full pl-11 pr-4 py-3.5 rounded-2xl font-bold transition-all ${
                       isEditing 
                         ? 'bg-white border-2 border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 text-slate-900 shadow-sm' 
                         : 'bg-slate-50 border-2 border-transparent text-slate-600 cursor-not-allowed opacity-80'
                     }`}
                   />
                </div>
              </div>

              {/* Job Title Field (Editable) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Puesto de Trabajo</label>
                <div className="relative group">
                   <Briefcase className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${isEditing ? 'text-slate-700' : 'text-slate-300'}`} size={18} />
                   <input 
                     type="text" 
                     value={formData.jobTitle}
                     onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                     disabled={!isEditing}
                     className={`w-full pl-11 pr-4 py-3.5 rounded-2xl font-bold transition-all ${
                       isEditing 
                         ? 'bg-white border-2 border-slate-200 focus:border-red-500 focus:ring-4 focus:ring-red-500/10 text-slate-900 shadow-sm' 
                         : 'bg-slate-50 border-2 border-transparent text-slate-600 cursor-not-allowed opacity-80'
                     }`}
                   />
                </div>
              </div>

              {/* Email Field (Read Only) */}
              <div className="space-y-2 opacity-60">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                  Correo Electrónico <Lock size={10} />
                </label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Inbox size={18} /></div>
                   <input 
                     type="text" 
                     value={userProfile?.email || ''}
                     disabled
                     className="w-full pl-11 pr-4 py-3.5 bg-slate-100 border-2 border-transparent rounded-2xl font-bold text-slate-500 cursor-not-allowed"
                   />
                </div>
              </div>

              {/* Dealer Field (Read Only) */}
              <div className="space-y-2 opacity-60">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
                  Dealer Autorizado <Lock size={10} />
                </label>
                <div className="relative">
                   <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><Building2 size={18} /></div>
                   <input 
                     type="text" 
                     value={userProfile?.dealerName || ''}
                     disabled
                     className="w-full pl-11 pr-4 py-3.5 bg-slate-100 border-2 border-transparent rounded-2xl font-bold text-slate-500 cursor-not-allowed"
                   />
                </div>
              </div>
            </div>

            {/* Editing Actions */}
            {isEditing && (
              <div className="flex items-center gap-3 pt-4 animate-in slide-in-from-bottom-2">
                 <button 
                   onClick={() => setIsEditing(false)}
                   className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
                 >
                   Cancelar
                 </button>
                 <button 
                   onClick={handleSave}
                   disabled={isLoading}
                   className="flex-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><Check size={20} /> Guardar Cambios</>}
                 </button>
              </div>
            )}
          </div>
          
          {/* Logout Section */}
          {!isEditing && (
             <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100">
               <button onClick={onLogout} className="w-full py-4 border-2 border-red-100 text-red-600 font-black rounded-2xl hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md">
                 <LogOut size={20} /> CERRAR SESIÓN
               </button>
             </div>
          )}
        </Card>
      </div>
    </div>
  );
};
"""

with open(file_path, 'r') as f:
    content = f.read()

# Pattern: Find from "// --- SETTINGS VIEW ---" up to the end of the component
# Since SettingsView ends before the next large component or export, we can try to find the start 
# and then find the closing brace that matches the indentation of the function.
# Or simpler: find "// --- SETTINGS VIEW ---" and check what follows until the next known component start or end.

# Let's search for start
start_marker = "// --- SETTINGS VIEW ---"
start_idx = content.find(start_marker)

if start_idx == -1:
    print("Could not find start marker.")
else:
    # We need to find where the component ends. 
    # Usually it's followed by another component or just continues.
    # In `replacement_content` we see `};` at end.
    
    # Let's try to assume we replace until we see something that indicates the next block.
    # Checking file structure...
    
    # Just after SettingsView, we might have `const LoginScreen` or `const CarbotApp`?
    # No, usually SettingsView is defined before LoginScreen.
    
    # Let's find the next component definition "const " or "export default"
    # Or rely on indentation.
    
    # Let's try to capture the block using brace counting if regex is risky.
    # Or use a simpler regex for "const SettingsView = ... };"
    
    # Regex attempt:
    # Match `// --- SETTINGS VIEW ---` followed by `const SettingsView` ... until `};`
    # This is hard because of nested braces.
    
    # Heuristic: 
    # SettingsView is likely followed by `// ---` comment or `const` or `export`.
    # Let's look for "// ---" that is NOT "SETTINGS VIEW" or "CONFIRMATION MODAL" (which is before).
    
    # Find next marker starting with `// ---`
    next_marker_regex = r"\n// --- [A-Z]"
    matches = [m.start() for m in re.finditer(next_marker_regex, content)]
    
    # Filter matches > start_idx
    next_starts = [x for x in matches if x > start_idx]
    
    end_idx = -1
    if next_starts:
        end_idx = next_starts[0]
    else:
        # If no marker, maybe `const LoginScreen`
        login_idx = content.find("const LoginScreen =", start_idx)
        if login_idx != -1:
            end_idx = login_idx
    
    if end_idx != -1:
         # Replace
         new_content = content[:start_idx] + new_settings_code + "\n\n" + content[end_idx:]
         with open(file_path, 'w') as f:
             f.write(new_content)
         print("Successfully replaced SettingsView provided by next marker.")
    else:
         print("Could not determine end of SettingsView block.")
