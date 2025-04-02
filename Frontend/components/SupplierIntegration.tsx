"use client"

import { useState, useEffect } from "react"
import { Truck } from "lucide-react"

interface InventoryItemType {
  id: number
  name: string
  quantity: number
  lowStockThreshold: number
  supplier: string
}

interface SupplierIntegrationProps {
  inventory: InventoryItemType[]
  fetchInventory: () => void
}

const SupplierIntegration: React.FC<SupplierIntegrationProps> = ({ inventory, fetchInventory }) => {
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState("")
  const [quantity, setQuantity] = useState(0)
  const [supplier, setSupplier] = useState("")
  const [suppliers, setSuppliers] = useState([])
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("http://localhost:8000/products")
        const data = await response.json()
        setProducts(data)
      } catch (error) {
        console.error("Error fetching products:", error)
      }
    }

    const fetchSuppliers = async () => {
      try {
        const response = await fetch("http://localhost:8000/suppliers")
        const data = await response.json()
        setSuppliers(data)
      } catch (error) {
        console.error("Error fetching suppliers:", error)
      }
    }

    fetchProducts()
    fetchSuppliers()
  }, [])

  const validateEmail = (email) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.name || !newSupplier.contact_person || !newSupplier.phone || !newSupplier.email || !newSupplier.address) {
      alert("Please fill all fields");
      return;
    }
    
    if (!validateEmail(newSupplier.email)) {
      alert("Please enter a valid email address");
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/suppliers/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSupplier),
      });

      if (!response.ok) throw new Error("Failed to add supplier");

      // Refresh suppliers list
      const updatedSuppliers = await fetch("http://localhost:8000/suppliers").then(res => res.json());
      setSuppliers(updatedSuppliers);

      // Reset form and hide it
      setNewSupplier({ name: "", contact_person: "", phone: "", email: "", address: "" });
      setShowAddSupplier(false);

      // Show success message
      alert("Supplier added successfully");
    } catch (error) {
      console.error("Error adding supplier:", error);
      alert("Failed to add supplier");
    }
  };


  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProduct) {
      alert("Please select a product.")
      return
    }

    const supplierObj = suppliers.find((s) => s.name === supplier);
    if (!supplierObj) {
      alert("Invalid supplier selection.");
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: selectedProduct,
          stock_level: quantity,
          supplier_id: supplierObj.id,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to add product")
      }

      // Clear form fields
      setSelectedProduct("")
      setQuantity(0)
      setSupplier("")

      // Comment out fetchInventory() and test again
      fetchInventory()
    } catch (error) {
      console.error("Error adding product:", error)
      alert("Failed to add product")
    }
  }

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center mb-4">
        <Truck className="w-6 h-6 text-green-500 mr-2" />
        <h2 className="text-xl font-semibold">Supplier Integration</h2>
      </div>

      {/* Product Form */}
      <form onSubmit={handleAddProduct} className="mb-4">
        <div className="mb-2">
          <label className="block text-gray-700">Product Name</label>
          <select
            className="w-full p-2 border rounded"
            value={selectedProduct}
            onChange={(e) => {
              if (e.target.value !== "") {
                setSelectedProduct(e.target.value);
              }
            }}
            required
          >
            <option value="" disabled>Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.name}>{product.name}</option>
            ))}
          </select>
        </div>

        <div className="mb-2">
          <label className="block text-gray-700">Quantity</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={quantity}
            onChange={(e) => {
              setQuantity(Number(e.target.value))
            }}
            required
          />
        </div>

        {/* <div className="mb-2">
          <label className="block text-gray-700">Supplier</label>
          <select
            className="w-full p-2 border rounded"
            value={supplier}
            onChange={(e) => {
              setSupplier(e.target.value);
            }}
            required
          >
            <option value="" disabled>Select a supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
            ))}
          </select>
        </div> */}

        <div className="mb-2">
          <label className="block text-gray-700">Supplier</label>
          <div className="flex space-x-2">
            <select
              className="w-full p-2 border rounded"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              required
            >
              <option value="" disabled>Select a supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.name}>{supplier.name}</option>
              ))}
            </select>
            <button
              type="button"
              className="bg-green-500 text-white px-3 py-2 rounded"
              onClick={() => setShowAddSupplier(true)}
            >
              + Add
            </button>
          </div>
        </div>

        {/* Add Supplier Form (Shown Conditionally) */}
        {showAddSupplier && (
          <div className="bg-gray-100 p-3 rounded-md mt-2">
            <h3 className="text-sm font-semibold mb-2">Add New Supplier</h3>
            <input
              type="text"
              placeholder="Supplier Name"
              className="w-full p-2 border rounded mb-2"
              value={newSupplier.name}
              onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Contact Person"
              className="w-full p-2 border rounded mb-2"
              value={newSupplier.contact_person}
              onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
            />
            <input
              type="text"
              placeholder="Phone"
              className="w-full p-2 border rounded mb-2"
              value={newSupplier.phone}
              onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full p-2 border rounded mb-2"
              value={newSupplier.email}
              onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
            />
            <input
              type="text"
              placeholder="Address"
              className="w-full p-2 border rounded mb-2"
              value={newSupplier.address}
              onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
            />

            <div className="flex justify-between">
              <button
                className="bg-blue-500 text-white px-3 py-1 rounded"
                onClick={handleAddSupplier}
              >
                Save
              </button>
              <button
                className="bg-red-500 text-white px-3 py-1 rounded"
                onClick={() => setShowAddSupplier(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}


        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-lg mt-2" disabled={!selectedProduct}>
          Add Product
        </button>
      </form>
    </div>
  )
}

export default SupplierIntegration
