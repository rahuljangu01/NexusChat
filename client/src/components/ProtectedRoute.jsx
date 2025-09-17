import React, { useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"
import { getCurrentUser, logout } from "../store/slices/authSlice"

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, user, token } = useSelector((state) => state.auth)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    if (!token) {
      dispatch(logout())
      navigate("/")
      return
    }

    if (!user) {
      dispatch(getCurrentUser())
    }
  }, [isAuthenticated, user, token, navigate, dispatch])

  if (!isAuthenticated && !token) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading...</div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute