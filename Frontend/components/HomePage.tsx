"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Package, LogOut } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"
import { useUser } from "../hooks/useUser"
import CustomerPage from "./CustomerPage"

import InventoryList from "./InventoryList"
import StockAlerts from "./StockAlerts"
import BatchTracking from "./BatchTracking"
import SupplierIntegration from "./SupplierIntegration"
import Analytics from "./Analytics"

const HomePage: React.FC = () => {
  const { user } = useUser()
  const [inventory, setInventory] = useState([])
  const [photosToApprove, setPhotosToApprove] = useState([])
  const navigate = useNavigate()

  const fetchProducts = async () => {
    try {
      const response = await fetch("http://localhost:8000/products")
      const data = await response.json()
      setInventory(data)
    } catch (error) {
      console.error("Error fetching products:", error)
    }
  }

  useEffect(() => {
    fetchProducts()
    const interval = setInterval(fetchProducts, 5000) // Fetch every 5 seconds
    return () => clearInterval(interval) // Cleanup on unmount
  }, [])

  useEffect(() => {
    const fetchPhotosToApprove = async () => {
      try {
        const response = await fetch('http://localhost:8000/photos/all')
        const data = await response.json()
        setPhotosToApprove(data.filter(photo => photo.approved === 0)) // Only get unapproved photos
      } catch (error) {
        console.error('Error fetching photos for approval:', error)
      }
    }

    fetchPhotosToApprove()
  }, [])

  const handleLogout = () => {
    navigate("/")
  }

  const handleApprovePhoto = async (photoId: number) => {
    console.log("PHOTO ID", photoId)
    try {
      const response = await fetch(`http://localhost:8000/photos/${photoId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json'
        }
        // ,
        // body: JSON.stringify({ category })
      });
      if (response.ok) {
        alert('Photo approved successfully!');
        // Refresh the list of photos to approve
        const updatedPhotos = photosToApprove.filter(photo => photo.id !== photoId);
        setPhotosToApprove(updatedPhotos);
      } else {
        alert('Failed to approve photo.');
      }
    } catch (error) {
      console.error('Error approving photo:', error)
    }
  };

  const handleRejectPhoto = async (photoId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/photos/${photoId}/reject`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (response.ok) {
        alert('Photo rejected successfully!');
        // Refresh the list of photos to approve
        const updatedPhotos = photosToApprove.filter(photo => photo.id !== photoId);
        setPhotosToApprove(updatedPhotos);
      } else {
        alert('Failed to reject photo.');
      }
    } catch (error) {
      console.error('Error rejecting photo:', error)
    }
  };

  if (user?.role_id === 1) {
    return (
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-blue-600 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center">
              <Package className="w-8 h-8 mr-2" />
              <h1 className="text-2xl font-bold">Merchandise Inventory Manager</h1>
            </div>
    <div className="export-options">
        <h3 className="text-lg font-bold">Export Reports</h3>
        <button
            onClick={() => window.open("http://localhost:8000/reports/export/csv", "_blank")}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg mt-2"
        >
            Export as CSV
        </button>
        <button
            onClick={() => window.open("http://localhost:8000/reports/export/pdf", "_blank")}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg mt-2 ml-2"
        >
            Export as PDF
        </button>
    </div>
            <button onClick={handleLogout} className="flex items-center bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded">
              <LogOut className="w-5 h-5 mr-2" />
              Logout
            </button>
          </div>
        </nav>
        <div className="container mx-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link to="/inventory" className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow">
              <InventoryList inventory={inventory} />
            </Link>
            <Link to="/alerts" className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow">
              <StockAlerts inventory={inventory} />
            </Link>
            <div className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow">
              <SupplierIntegration inventory={inventory} fetchInventory={fetchProducts} />
            </div>
            <Link to="/batches" className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-semibold">Batch Tracking</h2>
            </Link>
            <Link to="/approve-purchases" className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-semibold">Approve Purchases</h2>
            </Link>
            <Link to="/approve-customer-reviews" className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow">
              <h2 className="text-lg font-semibold">Approve Customer Reviews</h2>
            </Link>
            <Link
              to="/analytics"
              className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow col-span-full"
            >
              <Analytics inventory={inventory} />
            </Link> 
          </div>
          <div className="container mx-auto p-6 bg-gray-100 mt-6">
            <h1 className="text-3xl font-bold mt-6 text-center text-gray-800">Photos Pending Approval</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
              {photosToApprove.map(photo => (
                <div key={photo.id} className="bg-white shadow-md rounded-lg p-4">
                  <img src={photo.url} alt="Uploaded" className="w-full h-48 object-cover rounded-lg mb-2" />
                  <p className="text-gray-600">Category: {photo.category}</p>
                  <div className="flex justify-between mt-4">
                    <button onClick={() => handleApprovePhoto(photo.id)} className="bg-green-500 text-white px-4 py-2 rounded-lg">Approve</button>
                    <button onClick={() => handleRejectPhoto(photo.id)} className="bg-red-500 text-white px-4 py-2 rounded-lg">Reject</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  } else if (user?.role_id === 2) {
    return <CustomerPage />
  }

  return <div>Please log in.</div>
}

export default HomePage
