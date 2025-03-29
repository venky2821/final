"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import BatchTracking from "../components/BatchTracking"
import { ArrowLeft } from "lucide-react"
import dynamic from "next/dynamic"

// const BatchesPage: React.FC = () => {
const BatchesPage = dynamic(() => Promise.resolve(BatchesPageComponent), { ssr: false })

const BatchesPageComponent = () => {
  const router = useRouter()

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => router.push("/home")} className="mb-4 flex items-center text-blue-600 hover:text-blue-800">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </button>
      <h1 className="text-2xl font-bold mb-4">Batch Tracking</h1>
      <BatchTracking inventory={[]} /> {/* Pass the actual inventory data here */}
    </div>
  )
}

export default BatchesPage

