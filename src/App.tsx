import { IsometricDesk } from './components/IsometricDesk'
import { AbstractBackground } from './components/AbstractBackground'
import { DebugOverlay } from './components/DebugOverlay'
import logotypeUrl from './assets/logotype.svg'
import './App.css'

function App() {
  return (
    <main className="app-shell">
      <AbstractBackground />
      <header className="topbar">
        <h1 className="brand-logo">
          <img src={logotypeUrl} alt="Stacksy" />
        </h1>
      </header>

      <section className="stage" aria-label="Interactive board">
        <IsometricDesk />
      </section>

      <DebugOverlay />
    </main>
  )
}

export default App
