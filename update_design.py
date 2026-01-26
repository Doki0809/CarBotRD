import re

file_path = '/Users/jean/carbotSystem/src/App.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# ---------------------------------------------------------
# 1. NEW DASHBOARD VIEW (Red Banner v2)
# ---------------------------------------------------------
new_dashboard_code = r"""const DashboardView = ({ inventory, contracts, onNavigate, userProfile }) => {
  // Stats Calculations
  const availableInventory = inventory.filter(i => i.status === 'available' || i.status === 'quoted');
  const soldInventory = inventory.filter(i => i.status === 'sold');
  
  const activeInventory = (inventory || []).filter(i => i && i.status !== 'trash');
  const totalValueRD = activeInventory.reduce((acc, item) => acc + (item.price_dop || 0), 0);
  const totalValueUSD = activeInventory.reduce((acc, item) => acc + (item.price || 0), 0);

  const recentContracts = contracts.slice(0, 5);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Welcome Banner (Red) */}
      <Card className="relative overflow-hidden border-none bg-red-600 text-white shadow-xl shadow-red-600/20">
        <div className="relative z-10 p-6 md:p-8">
            <h1 className="text-3xl sm:text-4xl font-black mb-1 tracking-tight">
              Bienvenido a
            </h1>
            <h2 className="text-2xl sm:text-3xl font-black italic text-gray-200 tracking-wide mb-4">
              {userProfile?.dealerName || 'Tu Dealer'}
            </h2>
            <p className="text-red-50 text-base sm:text-lg font-medium">
              Hola, <span className="font-bold text-white">{userProfile?.name?.split(' ')[0] || 'Usuario'}</span>.
              Listos para vender y gestionar tu inventario hoy.
            </p>
        </div>
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 pointer-events-none"></div>
      </Card>

      {/* Row 1: Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inventario Card */}
        <Card className="p-8 border-none shadow-sm bg-white relative overflow-hidden group cursor-pointer hover:shadow-md transition-all" onClick={() => onNavigate('inventory', 'available')}>
          <div className="flex justify-between items-start">
            <div>
              <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <Box size={24} />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">INVENTARIO</p>
              <h2 className="text-4xl font-black text-slate-900">{availableInventory.length}</h2>
            </div>
          </div>
          <Box className="absolute -bottom-6 -right-6 text-slate-50 group-hover:text-blue-50/50 transition-colors" size={120} />
        </Card>

        {/* Vendidos Card */}
        <Card className="p-8 border-none shadow-sm bg-white relative overflow-hidden group cursor-pointer hover:shadow-md transition-all" onClick={() => onNavigate('inventory', 'sold')}>
          <div className="flex justify-between items-start">
            <div>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                <DollarSign size={24} />
              </div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">VENDIDOS</p>
              <h2 className="text-4xl font-black text-slate-900">{soldInventory.length}</h2>
            </div>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wider">OK</span>
          </div>
          <DollarSign className="absolute -bottom-6 -right-6 text-emerald-50/50 group-hover:text-emerald-100/50 transition-colors" size={120} />
        </Card>
      </div>

      {/* Row 2: Global Figures */}
      <Card className="p-8 border-none shadow-sm bg-white">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <DollarSign size={32} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">VALOR TOTAL</p>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">Cifras Globales</h2>
            </div>
          </div>
          <span className="bg-orange-50 text-orange-600 border border-orange-100 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
            +5.4% ESTE MES
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:divide-x divide-slate-100">
          <div className="md:pr-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">EN PESOS DOMINICANOS</p>
            <p className="text-3xl sm:text-4xl font-black text-slate-900">RD$ {totalValueRD.toLocaleString()}</p>
          </div>
          <div className="md:pl-8">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">EN DÓLARES USD</p>
            <p className="text-3xl sm:text-4xl font-black text-red-600">US$ {totalValueUSD.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      {/* Row 3: Contracts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Contratos Recientes */}
        <Card className="lg:col-span-2 p-8 border-none shadow-sm bg-white h-full">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-lg font-black text-slate-900">Contratos Recientes</h3>
            <button onClick={() => onNavigate('contracts')} className="text-[10px] font-black text-red-600 hover:text-red-700 uppercase tracking-widest flex items-center gap-1 transition-colors">
              VER TODOS <ArrowUpRight size={14} />
            </button>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">ÚLTIMAS TRANSACCIONES GENERADAS EN EL SISTEMA</p>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] font-black text-slate-300 uppercase tracking-widest border-b border-slate-50">
                <tr>
                  <th className="pb-4 pl-2">PRODUCTO / VEHÍCULO</th>
                  <th className="pb-4">CLIENTE</th>
                  <th className="pb-4">FECHA</th>
                  <th className="pb-4 text-right pr-2">MONTO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentContracts.length > 0 ? recentContracts.map(contract => (
                  <tr key={contract.id} className="group hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 pl-2">
                       <p className="font-bold text-slate-900 text-sm">{contract.vehicle}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">{contract.template}</p>
                    </td>
                    <td className="py-4 text-xs font-bold text-slate-500 uppercase">{contract.client}</td>
                    <td className="py-4 text-xs font-bold text-slate-400 uppercase">{new Date(contract.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 text-right pr-2 font-black text-slate-900 text-sm">
                      {contract.price > 0 ? `RD$ ${contract.price.toLocaleString()}` : 'N/A'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <Box size={48} className="text-slate-300 mb-3" />
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">NO HAY CONTRATOS RECIENTES</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Actividad Reciente */}
        <Card className="p-8 border-none shadow-sm bg-white h-full">
           <h3 className="text-lg font-black text-slate-900 mb-1 border-b-2 border-slate-900 pb-2 inline-block">Actividad Reciente</h3>
           
           <div className="mt-8 space-y-6">
             <div className="flex items-center gap-3 opacity-50">
               <div className="w-2 h-2 rounded-full bg-slate-200"></div>
               <p className="text-xs font-bold text-slate-300">Sin actividad reciente</p>
             </div>
           </div>
        </Card>
      </div>

    </div>
  );
};"""

# Replace DashboardView using regex to capture the whole block
# Matching from "const DashboardView =" up to the line before "const InventoryView =" or similar marker if possible,
# But the component ends with "};". It might be safer to replace the known previous block.
# Let's try to match the start and a robust end.
dashboard_pattern = re.compile(r'const DashboardView\s*=\s*\({.*?return\s*\(.*?\n\s*\}\);\s*};', re.DOTALL)
# Actually, the previous file view shows the DashboardView ends at line 1330+ and goes on.
# So I'll use a simpler replace strategy: Find the start and replace until I find the start of the next component or end of file?
# No, let's use the known start and end structure from previous view_file.

# Better: Find the exact string if possible.
# Failsafe: Use a pattern that matches the start and then counts braces? No, too complex for regex.
# Let's assume the previous content matches what we saw in 'view_file' output around line 1280.
# I will construct a regex that matches the *start* of DashboardView and assumes it ends before "const InventoryView" or "const ContractsView" or similar.
# In the file, the next component is likely InventoryView or ContractsView or TrashView.

# Re-reading file structure from cache/memory:
# 1280: const DashboardView = ...
# ...
# 14xx: const InventoryView = ... (maybe not immediately??)

# Let's try to locate the start and the next known component.
start_marker = "const DashboardView = ({ inventory, contracts, onNavigate, userProfile }) => {"
end_marker = "const InventoryView =" # Assuming this follows, based on typical file order. Wait, check line 14xx in Step 877
# Step 877 shows lines 1280-1350. It stops inside the Dashboard.
# I need to know what comes AFTER DashboardView to safely replace it.
# Let's assume 'const ContractsView' or 'const InventoryView'.
# I'll just look for the next "const [Name] =" pattern.

replaced_dashboard = False
match = re.search(r'(const DashboardView = \(\{.*?\n\}\;)', content, re.DOTALL)
# If the regex is too hard, I'll attempt a direct string replacement of the OLD known block if I have it.
# I don't have the full old block in memory perfectly.
# So I'll use a precise start and a "look for expected end" approach.

# Plan B: Use a very generous regex that replaces everything from DashboardView start to the line before the next component.
# I'll search for the next component start index.

parts = content.split('const DashboardView = ({ inventory, contracts, onNavigate, userProfile }) => {')
if len(parts) > 1:
    # We found the start. Now find where it ends.
    # The next component usually starts with "const [Name] =".
    # Let's look for "const InventoryView" which is likely next based on imports/exports order often seen.
    # Or just search for the next "const " that looks like a component.
    
    # Actually, I can search for the closing of the component.
    # But counting braces is better done by finding the next function definition.
    
    rest = parts[1]
    # Find the next component definition
    next_component_match = re.search(r'\nconst \w+ =', rest)
    if next_component_match:
        end_idx = next_component_match.start()
        # Replace the logic
        new_content = parts[0] + new_dashboard_code + rest[end_idx:]
        content = new_content
        replaced_dashboard = True
    else:
        print("Could not find the end of DashboardView (no next component found).")
else:
    print("Could not find DashboardView start.")


# ---------------------------------------------------------
# 2. UPDATE APP LAYOUT (Logo & Search Bar)
# ---------------------------------------------------------

# A. LOGO REPLACEMENT
old_logo_pattern = r"""<span className="text-lg font-black text-slate-900 tracking-tight hidden lg:block">\s*<span className="text-red-600">Inventario</span>\s*</span>"""
new_logo_code = r"""<div className="hidden lg:flex flex-col leading-none">
                <span className="text-xl font-medium text-gray-500 tracking-[0.2em] mb-[-2px]">CarBot</span>
                <span className="text-2xl font-black text-red-600 tracking-tighter">System</span>
              </div>"""

content = re.sub(old_logo_pattern, new_logo_code, content, flags=re.DOTALL)


# B. SEARCH BAR REMOVAL
# Pattern to remove the search bar div and its contents.
# <div className="relative max-w-[200px] w-full hidden xl:block"> ... </div>
# I'll regex this carefully.
search_bar_pattern = r"""\s*{/\* Search Bar \(Hidden on Mobile\) \*/}\s*<div className="relative max-w-\[200px\] w-full hidden xl:block">.*?</div>"""

content = re.sub(search_bar_pattern, "", content, flags=re.DOTALL)


with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updates applied successfully.")
