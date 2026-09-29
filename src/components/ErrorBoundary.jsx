import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '3rem 2rem',
          maxWidth: '600px',
          margin: '4rem auto',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
          textAlign: 'center',
          border: '1px solid #fee2e2'
        }}>
          <span style={{ fontSize: '3rem' }}>🤖⚠️</span>
          <h2 style={{ color: '#0f172a', margin: '1rem 0 0.5rem' }}>Oups ! Reachy a eu une petite hésitation</h2>
          <p style={{ color: '#64748b', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Une erreur est survenue lors de l'affichage du module. Pas d'inquiétude, cliquez ci-dessous pour reprendre.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '9999px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.95rem'
            }}
          >
            🔄 Revenir à l'accueil
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
