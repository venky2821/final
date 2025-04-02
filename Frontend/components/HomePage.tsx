"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Package, LogOut, Calendar } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"
import { useUser } from "../hooks/useUser"
import CustomerPage from "./CustomerPage"

import InventoryList from "./InventoryList"
import StockAlerts from "./StockAlerts"
import BatchTracking from "./BatchTracking"
import SupplierIntegration from "./SupplierIntegration"
import Analytics from "./Analytics"

interface Photo {
  id: number;
  url: string;
  category: string;
  approved: number;
}

interface ReportType {
  id: string;
  name: string;
  endpoint: string;
}

const reportTypes: ReportType[] = [
  { id: 'stock-turnover', name: 'Stock Turnover', endpoint: 'reports/stock-turnover' },
  { id: 'profit-analysis', name: 'Profit Analysis', endpoint: 'reports/profit-analysis' },
  { id: 'batch-aging', name: 'Batch Aging Report', endpoint: 'reports/batch-aging' },
  { id: 'top-selling-products', name: 'Top Selling Products', endpoint: 'reports/top-selling-products' }
];

const HomePage: React.FC = () => {
  const { user } = useUser()
  const [inventory, setInventory] = useState([])
  const [photosToApprove, setPhotosToApprove] = useState<Photo[]>([])
  const [showDateRangeModal, setShowDateRangeModal] = useState(false)
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: ""
  })
  const [selectedReport, setSelectedReport] = useState<string>('');
  const navigate = useNavigate()

  // Format date for display in input fields
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    } catch (error) {
      return "";
    }
  };

  // Format date for API request
  const formatDateForApi = (dateString: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split('T')[0];
    } catch (error) {
      return "";
    }
  };

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
    const interval = setInterval(fetchProducts, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchPhotosToApprove = async () => {
      try {
        const response = await fetch('http://localhost:8000/photos/all')
        const data = await response.json()
        setPhotosToApprove(data.filter((photo: Photo) => photo.approved === 0))
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
    try {
      const response = await fetch(`http://localhost:8000/photos/${photoId}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("token")}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        alert('Photo approved successfully!');
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
        const updatedPhotos = photosToApprove.filter(photo => photo.id !== photoId);
        setPhotosToApprove(updatedPhotos);
      } else {
        alert('Failed to reject photo.');
      }
    } catch (error) {
      console.error('Error rejecting photo:', error)
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'startDate' | 'endDate') => {
    const value = e.target.value;
    console.log(`Setting ${field} to:`, value); // Debug log
    setDateRange(prev => {
      const newState = {
        ...prev,
        [field]: value
      };
      console.log('New date range state:', newState); // Debug log
      return newState;
    });
  };

  const handleExport = (type: 'csv' | 'pdf') => {
    if (!selectedReport) {
      alert('Please select a report type');
      return;
    }

    const reportType = reportTypes.find(r => r.id === selectedReport);
    if (!reportType) {
      alert('Invalid report type');
      return;
    }

    const baseUrl = "http://localhost:8000";
    const url = `${baseUrl}/${reportType.endpoint}/export/${type}`;
    const queryParams = new URLSearchParams();
    
    console.log('Exporting with date range:', dateRange);
    
    if (dateRange.startDate) {
      queryParams.append('start_date', formatDateForApi(dateRange.startDate));
    }
    if (dateRange.endDate) {
      queryParams.append('end_date', formatDateForApi(dateRange.endDate));
    }

    const finalUrl = `${url}?${queryParams.toString()}`;
    console.log('Final URL:', finalUrl);
    window.open(finalUrl, "_blank");
    setShowDateRangeModal(false);
    setSelectedReport(''); // Reset selection
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
            <div className="flex items-center gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowDateRangeModal(true)}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors"
                >
                  <Calendar className="w-5 h-5" />
                  Export Reports
                </button>
                {showDateRangeModal && (
                  <div className="absolute right-0 mt-2 w-96 bg-gray-800 rounded-lg shadow-lg p-4 z-10 border border-gray-700">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-white">Export Report</h3>
                      <button
                        onClick={() => {
                          setShowDateRangeModal(false);
                          setDateRange({ startDate: "", endDate: "" });
                          setSelectedReport(''); // Reset selection
                        }}
                        className="text-gray-300 hover:text-white"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-1">Report Type</label>
                        <select
                          value={selectedReport}
                          onChange={(e) => setSelectedReport(e.target.value)}
                          className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Select a report type</option>
                          {reportTypes.map((report) => (
                            <option key={report.id} value={report.id}>
                              {report.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-1">Start Date</label>
                        <input
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) => handleDateChange(e, 'startDate')}
                          className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-200 mb-1">End Date</label>
                        <input
                          type="date"
                          value={dateRange.endDate}
                          onChange={(e) => handleDateChange(e, 'endDate')}
                          className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleExport('csv')}
                          className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Export CSV
                        </button>
                        <button
                          onClick={() => handleExport('pdf')}
                          className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                          Export PDF
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={handleLogout} className="flex items-center bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded">
                <LogOut className="w-5 h-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </nav>
        <div className="container mx-auto p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow">
              <InventoryList inventory={inventory} refreshInventory={fetchProducts} />
            </div>

            <Link to="/alerts" className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow">
              <StockAlerts inventory={inventory} />
            </Link>
            <div className="bg-white shadow-md rounded-lg p-4 hover:shadow-lg transition-shadow overflow-visible">
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
