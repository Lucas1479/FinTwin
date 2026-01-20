import React, { useContext, useState } from 'react';
import { WealthContext } from '../../context/WealthContext';
import WealthDashboardGrid from '../../components/wealth/WealthDashboardGrid';
import LiquidityDetailModal from '../../components/wealth/LiquidityDetailModal';
import DebtDetailModal from '../../components/wealth/DebtDetailModal';
import AllocationGoalsDetailModal from '../../components/wealth/AllocationGoalsDetailModal';
import { syncCashAssets } from '../../services/cashFlowService';
import { Loader2, Plus, Calendar, Settings2, RefreshCw, Check, AlertCircle, TrendingUp, ArrowDownRight } from 'lucide-react';

const WealthOverview = () => {
  const { data, loading } = useContext(WealthContext);
  const [isLiquidityModalOpen, setIsLiquidityModalOpen] = useState(false);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Grid (The Core Analysis) */}
      <WealthDashboardGrid 
          assets={data.assets} 
          liabilities={data.liabilities} 
          summary={data.summary} 
          goals={data.goals}
          cashFlows={data.cashFlows}
          onOpenLiquidity={() => setIsLiquidityModalOpen(true)}
          onOpenDebt={() => setIsDebtModalOpen(true)}
          onOpenAllocation={() => setIsAllocationModalOpen(true)}
      />

      {/* Drill-down Modals */}
      <LiquidityDetailModal 
        isOpen={isLiquidityModalOpen}
        onClose={() => setIsLiquidityModalOpen(false)}
        assets={data.assets}
      />

      <DebtDetailModal 
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        liabilities={data.liabilities}
        summary={data.summary}
      />

      <AllocationGoalsDetailModal
        isOpen={isAllocationModalOpen}
        onClose={() => setIsAllocationModalOpen(false)}
        goals={data.goals}
      />
    </div>
  );
};

export default WealthOverview;

