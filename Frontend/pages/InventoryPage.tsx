"use client"

import type React from "react"
import { useRouter } from "next/router"
import InventoryList from "../components/InventoryList"
import { ArrowLeft } from "lucide-react"

const InventoryPage: React.FC = () => {
  const router = useRouter()

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => router.push("/home")} className="mb-4 flex items-center text-blue-600 hover:text-blue-800">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </button>
      <h1 className="text-2xl font-bold mb-4">Inventory Management</h1>
      <InventoryList inventory={[]} /> {/* Pass the actual inventory data here */}
    </div>
  )
}

export default InventoryPage

