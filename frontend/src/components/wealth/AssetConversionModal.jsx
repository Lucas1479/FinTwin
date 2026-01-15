import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Check, Loader2, X } from 'lucide-react';
import { convertAssetToCash, convertCashToAsset } from '../../services/wealthService';

const CASH_CATEGORIES = ['Cash_Bank', 'Cash_Physical', 'Cash_TermDeposit'];
const NON_CASH_CATEGORIES = [
  'Invest_Shares',
  'Invest_ManagedFund',
  'KiwiSaver',
  'Property',
  'Vehicle',
  'Other_Asset',
];

const CATEGORY_LABELS = {
  Cash_Bank: 'Bank Account',
  Cash_TermDeposit: 'Term Deposit',
  Cash_Physical: 'Cash on Hand',
  Invest_Shares: 'Shares / ETF',
  Invest_ManagedFund: 'Managed Fund',
  KiwiSaver: 'KiwiSaver',
  Property: 'Real Estate',
  Vehicle: 'Vehicle',
  Other_Asset: 'Other Asset',
};

const AssetConversionModal = ({
  isOpen,
  onClose,
  onRefresh,
  asset,
  mode,
  cashAssets = [],
  nonCashAssets = [],
}) => {
  const [amount, setAmount] = useState('');
  const [targetMode, setTargetMode] = useState('existing');
  const [targetId, setTargetId] = useState('');
  const [cashCategory, setCashCategory] = useState('Cash_Bank');
  const [cashName, setCashName] = useState('');
  const [cashCurrency, setCashCurrency] = useState('NZD');
  const [assetName, setAssetName] = useState('');
  const [assetCategory, setAssetCategory] = useState('Invest_ManagedFund');
  const [assetLiquid, setAssetLiquid] = useState(false);
  const [assetCurrency, setAssetCurrency] = useState('NZD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAssetToCash = mode === 'asset-to-cash';
  const isCashToAsset = mode === 'cash-to-asset';

  const cashOptions = useMemo(
    () => cashAssets.filter((item) => CASH_CATEGORIES.includes(item.category)),
    [cashAssets]
  );
  const nonCashOptions = useMemo(
    () => nonCashAssets.filter((item) => !CASH_CATEGORIES.includes(item.category)),
    [nonCashAssets]
  );

  useEffect(() => {
    if (!isOpen || !asset) return;
    setError('');
    setLoading(false);
    setAmount(asset.value ?? '');
    setCashCurrency(asset.currency || 'NZD');
    setAssetCurrency(asset.currency || 'NZD');
    setCashName('Cash Account');
    setAssetName('New Asset');
    setAssetCategory('Invest_ManagedFund');
    setAssetLiquid(false);

    if (isAssetToCash) {
      const hasCash = cashOptions.length > 0;
      setTargetMode(hasCash ? 'existing' : 'create');
      setTargetId(hasCash ? cashOptions[0]._id : '');
      setCashCategory('Cash_Bank');
    }

    if (isCashToAsset) {
      const hasNonCash = nonCashOptions.length > 0;
      setTargetMode(hasNonCash ? 'existing' : 'create');
      setTargetId(hasNonCash ? nonCashOptions[0]._id : '');
    }
  }, [asset, isOpen, isAssetToCash, isCashToAsset, cashOptions, nonCashOptions]);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isAssetToCash) {
        const payload =
          targetMode === 'existing'
            ? { amount: Number(amount), target_cash_asset_id: targetId }
            : {
                amount: Number(amount),
                target_cash_category: cashCategory,
                target_cash_name: cashName,
                target_cash_currency: cashCurrency,
              };
        await convertAssetToCash(asset._id, payload);
      } else {
        const payload =
          targetMode === 'existing'
            ? { amount: Number(amount), target_asset_id: targetId }
            : {
                amount: Number(amount),
                target_asset: {
                  name: assetName,
                  category: assetCategory,
                  is_liquid: assetLiquid,
                  currency: assetCurrency,
                },
              };
        await convertCashToAsset(asset._id, payload);
      }

      onRefresh?.();
      onClose?.();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Conversion failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    Number(amount) > 0 &&
    (targetMode === 'existing'
      ? Boolean(targetId)
      : isAssetToCash
        ? Boolean(cashName)
        : Boolean(assetName && assetCategory));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 transition-opacity">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft size={18} className="text-indigo-500" />
              {isAssetToCash ? 'Convert to Cash' : 'Convert to Asset'}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {asset.name} • {CATEGORY_LABELS[asset.category] || asset.category}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <InputField
              label="Amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={setAmount}
              required
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Target</label>
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setTargetMode('existing')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${targetMode === 'existing' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Existing
              </button>
              <button
                type="button"
                onClick={() => setTargetMode('create')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${targetMode === 'create' ? 'bg-white text-brand-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Create New
              </button>
            </div>
          </div>

          {targetMode === 'existing' ? (
            <SelectField
              label={isAssetToCash ? 'Cash Account' : 'Target Asset'}
              value={targetId}
              onChange={setTargetId}
              options={(isAssetToCash ? cashOptions : nonCashOptions).map((item) => ({
                value: item._id,
                label: `${item.name} • ${CATEGORY_LABELS[item.category] || item.category}`,
              }))}
              placeholder={isAssetToCash ? 'Select a cash account' : 'Select an asset'}
            />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {isAssetToCash ? (
                <>
                  <InputField label="Cash Account Name" value={cashName} onChange={setCashName} required />
                  <InputField label="Currency" value={cashCurrency} onChange={setCashCurrency} />
                  <SelectField
                    label="Cash Category"
                    value={cashCategory}
                    onChange={setCashCategory}
                    options={CASH_CATEGORIES.map((cat) => ({ value: cat, label: CATEGORY_LABELS[cat] || cat }))}
                  />
                </>
              ) : (
                <>
                  <InputField label="Asset Name" value={assetName} onChange={setAssetName} required />
                  <InputField label="Currency" value={assetCurrency} onChange={setAssetCurrency} />
                  <SelectField
                    label="Asset Category"
                    value={assetCategory}
                    onChange={setAssetCategory}
                    options={NON_CASH_CATEGORIES.map((cat) => ({ value: cat, label: CATEGORY_LABELS[cat] || cat }))}
                  />
                  <SelectField
                    label="Liquidity"
                    value={assetLiquid ? 'true' : 'false'}
                    onChange={(value) => setAssetLiquid(value === 'true')}
                    options={[
                      { value: 'true', label: 'Liquid' },
                      { value: 'false', label: 'Illiquid' },
                    ]}
                  />
                </>
              )}
            </div>
          )}

          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-600 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-8 py-5 bg-slate-50 border-t border-slate-200 flex justify-end items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || loading}
            className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm shadow-brand-200 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const InputField = ({ label, type = 'text', placeholder, value, onChange, required }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <input
      type={type}
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl py-2.5 px-4 transition-all outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
    />
  </div>
);

const SelectField = ({ label, value, onChange, options = [], placeholder }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
    <div className="relative">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl py-2.5 pl-4 pr-8 appearance-none outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 cursor-pointer"
      >
        <option value="" disabled>{placeholder || 'Select...'}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 1L5 5L9 1" /></svg>
      </div>
    </div>
  </div>
);

export default AssetConversionModal;
