import React, { useState } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import { User, Lock } from "lucide-react"

const RegisterPage: React.FC = () => {
  const [username, setUsername] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const navigate = useNavigate()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await axios.post("http://localhost:8000/register", {
        email,
        username,
        password,
      })
      alert("Registration successful! Please log in.")
      navigate("/login")
    } catch (error) {
      alert("Registration failed. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-green-400 to-blue-500 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Register</h2>
        <form onSubmit={handleRegister}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
              Username
            </label>
            <div className="flex items-center border rounded-md">
              <User className="w-5 h-5 text-gray-400 mx-3" />
              <input
                className="appearance-none border-none w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none"
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <div className="flex items-center border rounded-md">
              <User className="w-5 h-5 text-gray-400 mx-3" />
              <input
                className="appearance-none border-none w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none"
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <div className="flex items-center border rounded-md">
              <Lock className="w-5 h-5 text-gray-400 mx-3" />
              <input
                className="appearance-none border-none w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none"
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              type="submit"
            >
              Register
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterPage
