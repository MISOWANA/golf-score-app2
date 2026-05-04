import React from 'react'
import ReactDOM from 'react-dom/client'
import GolfScoringApp from './GolfScoringApp'
import './index.css'
import '@fontsource/noto-sans-kr/300.css'
import '@fontsource/noto-sans-kr/400.css'
import '@fontsource/noto-sans-kr/500.css'
import '@fontsource/noto-sans-kr/600.css'
import '@fontsource/noto-sans-kr/700.css'
import '@fontsource/noto-sans-kr/800.css'
import '@fontsource/noto-sans-kr/900.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GolfScoringApp />
  </React.StrictMode>
)