import { useAuth0 } from '@auth0/auth0-react';

export function AuthButtons() {
  const { loginWithRedirect, logout, isAuthenticated, user } = useAuth0();

  return (
    <div className="auth-controls">
      {!isAuthenticated ? (
        <button onClick={() => loginWithRedirect()}>Login</button>
      ) : (
        <div>
          <span>Welcome, {user?.name}</span>
          <button onClick={() => logout({ 
            logoutParams: {
              returnTo: window.location.origin
            }
          })}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
