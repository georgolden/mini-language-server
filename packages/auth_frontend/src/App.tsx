import { useState, useEffect } from 'react'
import { Globe, Github, LogOut } from 'lucide-react'
import './App.css'

interface User {
  id: string
  email: string
  provider: 'google' | 'github'
  accessToken: string
}

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://localhost:3000/', {
        credentials: 'include'
      })
      const data = await response.json()
      setUser(data.user)
    } catch (error) {
      console.error('Error checking auth status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('http://localhost:3000/logout', {
        method: 'POST',
        credentials: 'include'
      })
      setUser(null)
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Auth Testing</h1>
      
      {user ? (
        <div>
          <div>
            <h2>Authenticated ✓</h2>
            <p>Logged in as: {user.email}</p>
            <p>Provider: {user.provider}</p>
          </div>
          
          <button onClick={handleLogout}>
            <LogOut />
            Logout
          </button>
        </div>
      ) : (
        <div>
          <div>
            <h2>Not Authenticated</h2>
            <p>Please login to continue</p>
          </div>
          
          <a href="http://localhost:3000/login/google">
            <Globe />
            Login with Google
          </a>
          
          <a href="http://localhost:3000/login/github">
            <Github />
            Login with GitHub
          </a>
        </div>
      )}
    </div>
  )
}

export default App
