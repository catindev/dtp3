import { IsometricDesk } from './components/IsometricDesk'
import './App.css'

function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Stacksy</p>
          <h1>Floating desk</h1>
        </div>
        <div className="status-pill">React + PixiJS + Zustand + GSAP</div>
      </header>

      <section className="stage" aria-label="Interactive board">
        <IsometricDesk />
      </section>
    </main>
  )
}

export default App
