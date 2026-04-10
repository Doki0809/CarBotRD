import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { I18nProvider } from './i18n/I18nContext.jsx'
import { ThemeProvider } from './ThemeContext.jsx'
import { CurrencyProvider } from './CurrencyContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <CurrencyProvider>
          <App />
        </CurrencyProvider>
      </I18nProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
