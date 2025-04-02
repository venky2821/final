"use client"

import React from "react"
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom"
import LandingPage from "./components/LandingPage"
import LoginPage from "./components/LoginPage"
import HomePage from "./components/HomePage"
import RegisterPage from "./components/RegisterPage"
import ChangePasswordPage from "./components/ChangePasswordPage"
import PurchaseApproval from "./components/PurchaseApproval"
// import InventoryPage from "./components/InventoryPage"
// import AlertsPage from "./components/AlertsPage"
import BatchTracking from "./components/BatchTracking"
import CustomerReviewApproval from "./components/CustomerReviewApproval"
// import SuppliersPage from "./components/SuppliersPage"
// import AnalyticsPage from "./components/AnalyticsPage"

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/approve-purchases" element={<PurchaseApproval />} />
        <Route path="/approve-customer-reviews" element={<CustomerReviewApproval />} />
        <Route path="/batches" element={<BatchTracking />} />
        {/* <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} /> */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
