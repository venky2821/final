import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Batch {
  id: number;
  batch_number: string;
  product_name: string;
  received_date: string;
  expiration_date: string | null;
  batch_status: string;
  age_days: number;
  remaining_quantity: number;
  days_until_expiry?: number;
}

interface AgingReport {
  aging_report: Batch[];
  summary: {
    total_batches: number;
    expired_batches: number;
    active_batches: number;
    expiring_soon: number;
  };
}

interface Product {
  id: number;
  name: string;
  category: string;
  stock_level: number;
  price: number;
}

const BatchTracking = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [agingReport, setAgingReport] = useState<AgingReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "all",
    productId: "all",
    minAge: "",
    maxAge: ""
  });
  const [batchNumber, setBatchNumber] = useState("");
  const [productId, setProductId] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchBatches();
    fetchProducts();
    fetchAgingReport();
  }, [filters]);

  const fetchBatches = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.status && filters.status !== "all") queryParams.append("status", filters.status);
      if (filters.productId && filters.productId !== "all") queryParams.append("product_id", filters.productId);
      if (filters.minAge) queryParams.append("min_age", filters.minAge);
      if (filters.maxAge) queryParams.append("max_age", filters.maxAge);

      const response = await fetch(`http://localhost:8000/batches?${queryParams}`);
      const data = await response.json();
      setBatches(data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const fetchAgingReport = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Construct the URL with date range parameters if they exist
      let url = "http://localhost:8000/reports/batch-aging";
      const params = new URLSearchParams();
      
      if (dateRange.startDate) {
        params.append("start_date", dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append("end_date", dateRange.endDate);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch aging report');
      }
      const data = await response.json();
      setAgingReport(data);
      setShowDateRangeModal(false);
    } catch (error) {
      console.error("Error fetching aging report:", error);
      setError(error instanceof Error ? error.message : 'Failed to fetch aging report');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("http://localhost:8000/products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleCreateBatch = async () => {
    try {
      const response = await fetch("http://localhost:8000/add/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: productId,
          supplier_id: 123,
          batch_number: batchNumber,
          expiration_date: expirationDate,
          received_date: receivedDate,
          quantity_received: parseInt(quantity),
        }),
      });
      if (response.ok) {
        alert("Batch created successfully!");
        fetchBatches();
        fetchAgingReport();
      } else {
        alert("Failed to create batch.");
      }
    } catch (error) {
      console.error("Error creating batch:", error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Batch Management</h1>
      
      <Tabs defaultValue="batches" className="w-full">
        <TabsList>
          <TabsTrigger value="batches">Batches</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
        </TabsList>

        <TabsContent value="batches">
          <Card className="mb-4">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Create New Batch</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Batch Number</Label>
                  <Input
                    type="text"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="Enter batch number"
                  />
                </div>
                <div>
                  <Label>Product</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Expiration Date</Label>
                  <Input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Received Date</Label>
                  <Input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                  />
                </div>
              </div>
              <Button onClick={handleCreateBatch} className="mt-4 w-full">
                Create Batch
              </Button>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Filter Batches</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={filters.status} onValueChange={(value) => handleFilterChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Expired">Expired</SelectItem>
                      <SelectItem value="Sold Out">Sold Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Product</Label>
                  <Select value={filters.productId} onValueChange={(value) => handleFilterChange("productId", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All products" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id.toString()}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Min Age (days)</Label>
                  <Input
                    type="number"
                    value={filters.minAge}
                    onChange={(e) => handleFilterChange("minAge", e.target.value)}
                    placeholder="Min age"
                  />
                </div>
                <div>
                  <Label>Max Age (days)</Label>
                  <Input
                    type="number"
                    value={filters.maxAge}
                    onChange={(e) => handleFilterChange("maxAge", e.target.value)}
                    placeholder="Max age"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-4">Existing Batches</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Batch Number</th>
                      <th className="text-left py-2">Product</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Age (days)</th>
                      <th className="text-left py-2">Remaining</th>
                      <th className="text-left py-2">Expiration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => (
                      <tr key={batch.id} className="border-b">
                        <td className="py-2">{batch.batch_number}</td>
                        <td className="py-2">{batch.product_name}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded-full text-sm ${
                            batch.batch_status === "Active" ? "bg-green-100 text-green-800" :
                            batch.batch_status === "Expired" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>
                            {batch.batch_status}
                          </span>
                        </td>
                        <td className="py-2">{batch.age_days}</td>
                        <td className="py-2">{batch.remaining_quantity}</td>
                        <td className="py-2">{batch.expiration_date || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aging">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Batch Aging Report</h2>
                <button
                  onClick={() => setShowDateRangeModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Generate Report
                </button>
              </div>

              {/* Date Range Selection Modal */}
              {showDateRangeModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-lg p-6 w-96">
                    <h3 className="text-lg font-semibold mb-4">Select Date Range</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={dateRange.startDate}
                          onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={dateRange.endDate}
                          onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex justify-end space-x-3 mt-6">
                        <button
                          onClick={() => setShowDateRangeModal(false)}
                          className="px-4 py-2 text-gray-700 hover:text-gray-900"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={fetchAgingReport}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          Generate Report
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {isLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : error && !agingReport ? (
                <div className="text-red-600 text-center py-4">{error}</div>
              ) : agingReport ? (
                <div>
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-blue-800">Total Batches</h3>
                      <p className="text-2xl font-semibold text-blue-600">{agingReport.summary.total_batches}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-red-800">Expired Batches</h3>
                      <p className="text-2xl font-semibold text-red-600">{agingReport.summary.expired_batches}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-green-800">Active Batches</h3>
                      <p className="text-2xl font-semibold text-green-600">{agingReport.summary.active_batches}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-yellow-800">Expiring Soon</h3>
                      <p className="text-2xl font-semibold text-yellow-600">{agingReport.summary.expiring_soon}</p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Batch Number</th>
                          <th className="text-left py-2">Product</th>
                          <th className="text-left py-2">Age (days)</th>
                          <th className="text-left py-2">Remaining</th>
                          <th className="text-left py-2">Days Until Expiry</th>
                          <th className="text-left py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agingReport.aging_report.map((batch) => (
                          <tr key={batch.batch_number} className="border-b">
                            <td className="py-2">{batch.batch_number}</td>
                            <td className="py-2">{batch.product_name}</td>
                            <td className="py-2">{batch.age_days}</td>
                            <td className="py-2">{batch.remaining_quantity}</td>
                            <td className="py-2">
                              {batch.days_until_expiry !== undefined ? (
                                <span className={`px-2 py-1 rounded-full text-sm ${
                                  batch.days_until_expiry <= 0 ? "bg-red-100 text-red-800" :
                                  batch.days_until_expiry <= 30 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-green-100 text-green-800"
                                }`}>
                                  {batch.days_until_expiry}
                                </span>
                              ) : "N/A"}
                            </td>
                            <td className="py-2">
                              <span className={`px-2 py-1 rounded-full text-sm ${
                                batch.batch_status === "Active" ? "bg-green-100 text-green-800" :
                                batch.batch_status === "Expired" ? "bg-red-100 text-red-800" :
                                "bg-yellow-100 text-yellow-800"
                              }`}>
                                {batch.batch_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  Click "Generate Report" to view the batch aging report
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button onClick={() => navigate(-1)} className="mt-4 bg-gray-500 text-white">
        Back
      </Button>
    </div>
  );
};

export default BatchTracking;

