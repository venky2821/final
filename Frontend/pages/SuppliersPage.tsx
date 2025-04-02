"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import SupplierIntegration from "../components/SupplierIntegration"
import { ArrowLeft } from "lucide-react"

const SuppliersPage: React.FC = () => {
  const router = useRouter()

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => navigate("/home")} className="mb-4 flex items-center text-blue-600 hover:text-blue-800">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </button>
      <h1 className="text-2xl font-bold mb-4">Supplier Integration</h1>
      <SupplierIntegration inventory={[]} /> {/* Pass the actual inventory data here */}
    </div>
  )
}

export default SuppliersPage

