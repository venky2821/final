import type React from "react"
import InventoryItem from "./InventoryItem"
import { List, Plus } from "lucide-react";
import { useState, useEffect } from "react";

interface InventoryItemType {
  id: number
  name: string
  category: string
  stock_level: number
  reorder_threshold: number
  batchInfo: string
  supplier: string
  image_url: string
}

interface InventoryListProps {
  inventory: InventoryItemType[]
  refreshInventory: () => void;
}

const InventoryList: React.FC<InventoryListProps> = ({ inventory, refreshInventory }) => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    stock_level: 0,
    reserved_stock: 0,
    reorder_threshold: 0,
    cost_price: 0,
    price: 0,
    supplier_id: "",
    image_url: "",
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      const response = await fetch("http://localhost:8000/suppliers");
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    };
    fetchSuppliers();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setPreviewUrl(event.target.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    try {
      let uploadedImageUrl = formData.image_url;

      if (selectedFile) {
        const imageFormData = new FormData();
        imageFormData.append("uploaded_file", selectedFile);

        const uploadResponse = await fetch("http://localhost:8000/products/upload-image", {
          method: "POST",
          body: imageFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error("Image upload failed");
        }

        const uploadData = await uploadResponse.json();
        uploadedImageUrl = uploadData.image_url;
      }

      const productResponse = await fetch("http://localhost:8000/products/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, image_url: uploadedImageUrl }),
      });

      if (!productResponse.ok) {
        throw new Error("Failed to add product");
      }

      setShowModal(false);
      refreshInventory();
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <List className="w-6 h-6 text-blue-500 mr-2" />
          <h2 className="text-xl font-semibold">Inventory List</h2>
        </div>
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center transition-colors"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Product
        </button>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
        {inventory.map((item) => (
          <InventoryItem key={item.id} item={item} />
        ))}
      </div>

      {/* Modal for Adding Product */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-semibold mb-4">Add New Product</h2>
            <div className="space-y-3">
              <input 
                type="text" 
                name="name" 
                placeholder="Product Name" 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                onChange={handleInputChange} 
              />
              <input 
                type="text" 
                name="category" 
                placeholder="Category" 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                onChange={handleInputChange} 
              />
              <input 
                type="number" 
                name="stock_level" 
                placeholder="Stock Level" 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                onChange={handleInputChange} 
              />
              <input 
                type="number" 
                name="price" 
                placeholder="Price" 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                onChange={handleInputChange} 
              />
              <input 
                type="number" 
                name="cost_price" 
                placeholder="Cost Price" 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                onChange={handleInputChange} 
              />
              <input 
                type="number" 
                name="reorder_threshold" 
                placeholder="Reorder Threshold" 
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                onChange={handleInputChange} 
              />
              <select
                name="supplier_id"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onChange={handleInputChange}
              >
                <option value="">Select a Supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  name="image_url"
                  placeholder="No file selected"
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedFile ? selectedFile.name : ""}
                  readOnly
                />
                <button
                  onClick={() => document.getElementById("imageUpload")?.click()}
                  className="bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition-colors"
                >
                  Attach
                </button>
                <input
                  type="file"
                  id="imageUpload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>

              {/* Image Preview */}
              {previewUrl && (
                <div className="mt-2">
                  <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover rounded" />
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6 space-x-3">
              <button 
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition-colors" 
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors" 
                onClick={handleSubmit}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryList

