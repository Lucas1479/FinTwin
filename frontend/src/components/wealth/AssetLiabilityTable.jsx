import { ArrowUpRight, ArrowDownRight, MoreHorizontal, Plus, Trash2 } from 'lucide-react';

const TableRow = ({ item, isAsset }) => (
    <tr className="group hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-none">
        <td className="py-4 pl-4">
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isAsset ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {isAsset ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </div>
                <div>
                    <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                    <div className="text-xs text-slate-400">{item.asset_details?.bank_name || item.asset_details?.provider || item.asset_details?.issuer || 'Personal'}</div>
                </div>
            </div>
        </td>
        <td className="py-4">
            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                {item.category.replace(/_/g, ' ')}
            </span>
        </td>
        <td className="py-4 text-right pr-8">
            <div className={`font-bold text-sm ${isAsset ? 'text-emerald-600' : 'text-slate-900'}`}>
                ${item.value.toLocaleString()}
            </div>
            {item.currency !== 'NZD' && <div className="text-[10px] text-slate-400">{item.currency}</div>}
        </td>
        <td className="py-4 pr-4 text-right">
             <button className="p-2 rounded-full hover:bg-slate-200 text-slate-300 hover:text-slate-500 transition-colors">
                <MoreHorizontal size={16} />
            </button>
        </td>
    </tr>
);

export default function AssetLiabilityTable({ assets, liabilities, onAddClick }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Assets Panel */}
        <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Assets</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Cash, Investments, Property</p>
                </div>
                <button 
                    onClick={() => onAddClick?.('Asset')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-all"
                >
                    <Plus size={14} /> Add
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50/50 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">
                        <tr>
                            <th className="py-3 pl-4 font-medium">Name</th>
                            <th className="py-3 font-medium">Category</th>
                            <th className="py-3 pr-8 text-right font-medium">Value</th>
                            <th className="py-3 pr-4 text-right font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {assets.map(item => <TableRow key={item._id} item={item} isAsset={true} />)}
                        {assets.length === 0 && (
                            <tr>
                                <td colSpan="4" className="py-8 text-center text-slate-400 text-sm">No assets found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Liabilities Panel */}
        <div className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Liabilities</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Loans, Mortgages, Credit Cards</p>
                </div>
                <button 
                    onClick={() => onAddClick?.('Liability')}
                    className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition-all"
                >
                    <Plus size={14} /> Add
                </button>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50/50 text-xs font-semibold text-slate-400 uppercase tracking-wider text-left">
                        <tr>
                            <th className="py-3 pl-4 font-medium">Name</th>
                            <th className="py-3 font-medium">Category</th>
                            <th className="py-3 pr-8 text-right font-medium">Value</th>
                            <th className="py-3 pr-4 text-right font-medium">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                         {liabilities.map(item => <TableRow key={item._id} item={item} isAsset={false} />)}
                         {liabilities.length === 0 && (
                            <tr>
                                <td colSpan="4" className="py-8 text-center text-slate-400 text-sm">No liabilities found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
}

