import React, { useState } from 'react';
import { ChevronDown, Wallet, Building2, TrendingUp, CreditCard, PiggyBank } from 'lucide-react';

const GroupHeader = ({ title, total, count, icon: Icon, colorClass, isOpen, toggle }) => (
  <div 
    onClick={toggle}
    className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 cursor-pointer border-b border-slate-100 first:rounded-t-3xl transition-colors duration-200 group"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-xl ${colorClass} transition-transform group-hover:scale-105 duration-200`}>
        <Icon size={18} />
      </div>
      <div>
        <h4 className="text-sm font-bold text-slate-900">{title}</h4>
        <p className="text-xs text-slate-400 font-medium">{count} item{count !== 1 ? 's' : ''}</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <span className="font-bold text-slate-900 text-lg tracking-tight">
        ${new Intl.NumberFormat('en-NZ').format(total)}
      </span>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-slate-100 rotate-180' : 'bg-transparent'}`}>
        <ChevronDown size={16} className="text-slate-400" />
      </div>
    </div>
  </div>
);

const AssetItem = ({ item, isLiability = false }) => {
  const details = item.asset_details || {};
  const subLabel = details.bank_name || details.provider || details.platform || details.lender || item.category.replace(/_/g, ' ');
  
  return (
    <div className="flex items-center justify-between px-4 py-3.5 bg-slate-50/50 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group">
      <div className="flex items-center gap-4 pl-2">
        {/* Compact Indicator Line */}
        <div className={`w-1 h-8 rounded-full ${isLiability ? 'bg-rose-400' : 'bg-indigo-600'} opacity-60 group-hover:opacity-100 transition-opacity`}></div>
        
        <div>
          <h5 className="text-sm font-bold text-slate-900">{item.name}</h5>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-500">
              {subLabel}
            </span>
            {(details.interest_rate !== undefined) && (
              <span className="text-[10px] font-medium text-slate-400">
                {details.interest_rate}% p.a.
              </span>
            )}
            {item.is_liquid && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">
                Liquid
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="text-right pr-1">
        <div className="font-bold text-slate-900 text-base">
          ${new Intl.NumberFormat('en-NZ').format(item.value)}
        </div>
      </div>
    </div>
  );
};

const AssetLiabilityList = ({ assets, liabilities }) => {
  const [openSections, setOpenSections] = useState({
    cash: true, invest: true, property: true, liabilities: true
  });
  const toggle = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };
  const grouped = {
    cash: assets.filter(a => ['Cash_Bank', 'Cash_Physical', 'Cash_TermDeposit'].includes(a.category)),
    invest: assets.filter(a => ['Invest_Shares', 'Invest_ManagedFund', 'KiwiSaver'].includes(a.category)),
    property: assets.filter(a => ['Property', 'Vehicle', 'Other_Asset'].includes(a.category)),
    liabilities: liabilities || []
  };
  const totals = {
    cash: grouped.cash.reduce((s, a) => s + a.value, 0),
    invest: grouped.invest.reduce((s, a) => s + a.value, 0),
    property: grouped.property.reduce((s, a) => s + a.value, 0),
    liabilities: grouped.liabilities.reduce((s, a) => s + a.value, 0),
  };
  const hasCash = grouped.cash.length > 0;
  const hasInvest = grouped.invest.length > 0;
  const hasProperty = grouped.property.length > 0;
  const hasLiabilities = grouped.liabilities.length > 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300">
        {hasCash && <><GroupHeader title="Cash & Savings" total={totals.cash} count={grouped.cash.length} icon={Wallet} colorClass="bg-emerald-50 text-emerald-600" isOpen={openSections.cash} toggle={() => toggle('cash')} />{openSections.cash && grouped.cash.map(item => <AssetItem key={item._id} item={item} />)}</>}
        {hasInvest && <><GroupHeader title="Investment Portfolio" total={totals.invest} count={grouped.invest.length} icon={TrendingUp} colorClass="bg-indigo-50 text-indigo-600" isOpen={openSections.invest} toggle={() => toggle('invest')} />{openSections.invest && grouped.invest.map(item => <AssetItem key={item._id} item={item} />)}</>}
        {hasProperty && <><GroupHeader title="Property & Assets" total={totals.property} count={grouped.property.length} icon={Building2} colorClass="bg-blue-50 text-blue-600" isOpen={openSections.property} toggle={() => toggle('property')} />{openSections.property && grouped.property.map(item => <AssetItem key={item._id} item={item} />)}</>}
        {hasLiabilities && <><GroupHeader title="Liabilities & Loans" total={totals.liabilities} count={grouped.liabilities.length} icon={CreditCard} colorClass="bg-rose-50 text-rose-600" isOpen={openSections.liabilities} toggle={() => toggle('liabilities')} />{openSections.liabilities && grouped.liabilities.map(item => <AssetItem key={item._id} item={item} isLiability={true} />)}</>}
        {!hasCash && !hasInvest && !hasProperty && !hasLiabilities && (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><PiggyBank size={24} className="text-slate-300" /></div>
            <h4 className="text-base font-bold text-slate-700 mb-1">No assets yet</h4>
            <p className="text-xs text-slate-500">Start building your wealth profile.</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default AssetLiabilityList;
