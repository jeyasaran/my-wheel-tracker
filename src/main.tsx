import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { TradeProvider } from './hooks/useTradeStore';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TradeProvider>
      <App />
    </TradeProvider>
  </StrictMode>,
)
