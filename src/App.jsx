import React, { Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import SalesFunnel from './components/SalesFunnel'
import SessionInitializer from './components/SessionInitializer'
import Sitemap from './components/Sitemap'
import Scorm from './components/Scorm'
import EqModule from './components/EqModule'
import PeopleGamesModule from './components/PeopleGamesModule'
import Cabinet from './components/Cabinet'
import CabinetShelf from './components/CabinetShelf'
import AboutUser from './components/AboutUser'
import {
  HomeRoute,
  ProfileRoute,
  DiagnosticsRoute,
  AlchemyRoute,
  PersonReportRoute,
  BlockDetailRoute,
  AdminSettingsRoute,
  AdminChatsRoute,
  AdminDashboardRoute
} from './components/RouteWrappers'
import './App.css'

const PageLoader = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '18px'
  }}>
    Загрузка…
  </div>
)

const AppContainer = ({ children }) => (
  <SessionInitializer>
    <div className="container">{children}</div>
  </SessionInitializer>
)

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
        <Routes>
        <Route path="/sitemap" element={<Sitemap />} />
        <Route path="/scorm" element={<Scorm />} />
        <Route path="/eq-module" element={<SessionInitializer><EqModule /></SessionInitializer>} />
        <Route path="/people-games-module" element={<SessionInitializer><PeopleGamesModule /></SessionInitializer>} />
        <Route path="/cabinet" element={<AppContainer><Cabinet /></AppContainer>} />
        <Route path="/cabinet/shelf" element={<AppContainer><CabinetShelf /></AppContainer>} />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<AppContainer><HomeRoute /></AppContainer>} />
        <Route path="/profile" element={<AppContainer><ProfileRoute /></AppContainer>} />
        <Route path="/profile/about" element={<AppContainer><AboutUser /></AppContainer>} />
        <Route path="/profile/*" element={<AppContainer><ProfileRoute /></AppContainer>} />
        <Route path="/diagnostics" element={<AppContainer><DiagnosticsRoute /></AppContainer>} />
        <Route path="/alchemy" element={<AppContainer><AlchemyRoute /></AppContainer>} />
        <Route path="/alchemy/:toolId" element={<AppContainer><AlchemyRoute /></AppContainer>} />
        <Route path="/funnel" element={<AppContainer><SalesFunnel /></AppContainer>} />
        <Route path="/block/:id" element={<AppContainer><BlockDetailRoute /></AppContainer>} />
        <Route path="/personreport" element={<AppContainer><PersonReportRoute /></AppContainer>} />
        <Route path="/admin" element={<AppContainer><AdminDashboardRoute /></AppContainer>} />
        <Route path="/admin/bot" element={<AppContainer><AdminSettingsRoute /></AppContainer>} />
        <Route path="/admin/chats" element={<AppContainer><AdminChatsRoute /></AppContainer>} />
        <Route path="/admin/settings" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App

