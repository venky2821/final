import type React from "react"
import { Link } from "react-router-dom"
import { Package } from "lucide-react"

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-400 to-purple-500 flex flex-col justify-center items-center text-white">
      <Package className="w-24 h-24 mb-8" />
      <h1 className="text-5xl font-bold mb-4">Merchandise Inventory Manager</h1>
      <p className="text-xl mb-8 text-center max-w-2xl">
        Streamline your merchandise inventory with real-time updates, stock alerts, batch tracking, supplier
        integration, and powerful analytics.
      </p>
      <Link
        to="/login"
        className="bg-white text-blue-500 px-6 py-3 rounded-full font-semibold text-lg hover:bg-blue-100 transition duration-300"
      >
        Login to Dashboard
      </Link>
    </div>
  )
}

export default LandingPage

