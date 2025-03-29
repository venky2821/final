import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BatchTracking = () => {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [batchNumber, setBatchNumber] = useState("");
  const [productId, setProductId] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [quantity, setQuantity] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchBatches();
    fetchProducts();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await fetch("http://localhost:8000/batches");
      const data = await response.json();
      setBatches(data);
    } catch (error) {
      console.error("Error fetching batches:", error);
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
      } else {
        alert("Failed to create batch.");
      }
    } catch (error) {
      console.error("Error creating batch:", error);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Batch Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold mb-2">Create New Batch</h2>
            <input
              type="text"
              placeholder="Batch Number"
              value={batchNumber}
              onChange={(e) => setBatchNumber(e.target.value)}
              className="w-full p-2 border rounded mb-2"
            />
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full p-2 border rounded mb-2"
            >
              <option value="">Select Product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              className="w-full p-2 border rounded mb-2"
            />
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="w-full p-2 border rounded mb-2"
            />
            <input
              type="number"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full p-2 border rounded mb-2"
            />
            <Button onClick={handleCreateBatch} className="w-full bg-blue-500 text-white">
              Create Batch
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold mb-2">Existing Batches</h2>
            <ul>
              {batches.map((batch) => (
                <li key={batch.id} className="p-2 border-b">
                  <strong>Batch:</strong> {batch.batch_number} - <strong>Product:</strong> {batch.product_name} - <strong>Exp:</strong> {batch.expiration_date}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <Button onClick={() => navigate(-1)} className="mt-4 bg-gray-500 text-white">
        Back
      </Button>
    </div>
  );
};

export default BatchTracking;

