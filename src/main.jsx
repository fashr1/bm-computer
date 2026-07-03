import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { ThemeProvider } from './theme/ThemeContext'
import { LanguageProvider } from './i18n/LanguageContext'
import { AuthProvider } from './auth/AuthContext'
import { CatalogProvider } from './catalog/CatalogContext'
import { WishlistProvider } from './wishlist/WishlistContext'
import { CartProvider } from './cart/CartContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <CatalogProvider>
            <WishlistProvider>
              <CartProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </CartProvider>
            </WishlistProvider>
          </CatalogProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>,
)
