import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SidebarLayout } from './layouts/SidebarLayout';
import Dashboard from './features/dashboard/Dashboard';
import Metrics from './features/metrics/Metrics';
import TradeList from './features/trades/TradeList';
import ArchiveList from './features/trades/ArchiveList';
import PositionsList from './features/positions/PositionsList';
import MassiveSettings from './features/settings/MassiveSettings';
import CashLedger from './features/settings/CashLedger';
import ThemeSettings from './features/settings/ThemeSettings';
import BrokerSettings from './features/settings/BrokerSettings';
import { ThemeProvider } from './hooks/useTheme';

function App() {
  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route element={<SidebarLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/trades" element={<TradeList />} />
            <Route path="/positions" element={<PositionsList />} />
            <Route path="/archive" element={<ArchiveList />} />
            <Route path="/settings/massive" element={<MassiveSettings />} />
            <Route path="/settings/cash-ledger" element={<CashLedger />} />
            <Route path="/settings/theme" element={<ThemeSettings />} />
            <Route path="/settings/brokers" element={<BrokerSettings />} />
            {/* Redirect any unknown routes to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
