import React, { useState } from "react"
import axios from "axios"
import { Lock } from "lucide-react"

const ChangePasswordPage: React.FC = () => {
  const [token, setToken] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post("http://localhost:8000/change-password", {
        token,
        new_password: newPassword,
      })
      alert("Password changed successfully!")
    } catch (error) {
      if (error.response) {
        alert(error.response.data.detail || "An error occurred.");
      } else
        alert("Failed to change password. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-yellow-400 to-red-500 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Change Password</h2>
        <form onSubmit={handleChangePassword}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="token">
              Reset Token
            </label>
            <div className="flex items-center border rounded-md">
              <input
                className="appearance-none border-none w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none"
                id="token"
                type="text"
                placeholder="Enter your reset token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
              New Password
            </label>
            <div className="flex items-center border rounded-md">
              <Lock className="w-5 h-5 text-gray-400 mx-3" />
              <input
                className="appearance-none border-none w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none"
                id="newPassword"
                type="password"
                placeholder="Enter your new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Change Password
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangePasswordPage
