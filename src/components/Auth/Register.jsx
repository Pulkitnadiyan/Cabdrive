import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Car, User, Mail, Lock, AlertCircle } from "lucide-react";
import api from '../../apiClient';

const Register = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    isDriver: false,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const result = await register(formData);
      if (result.success) {
        navigate("/dashboard");
      } else {
        setError(result.error || "Unable to create account.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4"
    >
      <div className="bg-white dark:bg-gray-800 w-full max-w-md p-10 rounded-3xl shadow-2xl space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-5 rounded-full shadow-lg">
              <Car className="h-10 w-10 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 dark:text-white">Join CabRide</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Create your account</p>
        </div>

        {/* Error */}
        {error && (
          <div
            className="bg-red-50 dark:bg-red-900/50 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-5 py-3 rounded-lg flex items-center"
            role="alert"
          >
            <AlertCircle className="h-6 w-6 mr-3" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Username
            </label>
            <div className="mt-1 relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="username"
                name="username"
                type="text"
                required
                placeholder="Enter your username"
                value={formData.username}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address
            </label>
            <div className="mt-1 relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm Password
            </label>
            <div className="mt-1 relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-400 text-white font-semibold rounded-lg shadow-md disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        {/* Driver Signup Link */}
        <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 my-4">or</p>
            <Link 
              to="/register-driver" 
              className="w-full py-3 px-6 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 disabled:opacity-50 transition-colors inline-block"
            >
              Sign up as a Driver
            </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
