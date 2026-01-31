import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import SalesFunnel from './components/SalesFunnel'
import SessionInitializer from './components/SessionInitializer'
import Sitemap from './components/Sitemap'
import {
  HomeRoute,
  ProfileRoute,
  DiagnosticsRoute,
  AlchemyRoute,
  PersonReportRoute,
  BlockDetailRoute
} from './components/RouteWrappers'
import './App.css'

const AppContainer = ({ children }) => (
  <SessionInitializer>
    <div className="container">{children}</div>
  </SessionInitializer>
)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sitemap" element={<Sitemap />} />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<AppContainer><HomeRoute /></AppContainer>} />
        <Route path="/profile" element={<AppContainer><ProfileRoute /></AppContainer>} />
        <Route path="/profile/*" element={<AppContainer><ProfileRoute /></AppContainer>} />
        <Route path="/diagnostics" element={<AppContainer><DiagnosticsRoute /></AppContainer>} />
        <Route path="/alchemy" element={<AppContainer><AlchemyRoute /></AppContainer>} />
        <Route path="/alchemy/:toolId" element={<AppContainer><AlchemyRoute /></AppContainer>} />
        <Route path="/funnel" element={<AppContainer><SalesFunnel /></AppContainer>} />
        <Route path="/block/:id" element={<AppContainer><BlockDetailRoute /></AppContainer>} />
        <Route path="/personreport" element={<AppContainer><PersonReportRoute /></AppContainer>} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

