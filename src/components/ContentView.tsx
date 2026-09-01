import { useState } from 'react'
import { GamesView } from './GamesView'
import { OmbView } from './OmbView'
import { TournamentsView } from './TournamentsView'
import { Gamepad2, Swords, Trophy } from 'lucide-react'

interface ContentViewProps {
  initialSection?: 'games' | 'ombs' | 'tournaments'
  initialGameId?: string
}

export function ContentView({ initialSection = 'ombs', initialGameId }: ContentViewProps) {
  const [activeSection, setActiveSection] = useState<'games' | 'ombs' | 'tournaments'>(initialSection)
  const [targetGameId, setTargetGameId] = useState<string | undefined>(initialGameId)

  function handleNavigateToOmb(gameId?: string) {
    setTargetGameId(gameId)
    setActiveSection('ombs')
  }

  function handleNavigateToTournament(gameId?: string) {
    setTargetGameId(gameId)
    setActiveSection('tournaments')
  }

  return (
    <div className="content-view-wrapper">
      {/* Top domain segment switcher */}
      <div className="domain-segmented-control">
        <button
          id="nav-tab-games"
          className={`segment-btn ${activeSection === 'games' ? 'active games-active' : ''}`}
          onClick={() => setActiveSection('games')}
        >
          <Gamepad2 size={16} />
          <span>Game Catalog</span>
        </button>

        <button
          id="nav-tab-ombs"
          className={`segment-btn ${activeSection === 'ombs' ? 'active omb-active' : ''}`}
          onClick={() => setActiveSection('ombs')}
        >
          <Swords size={16} />
          <span>OMB Matches (1v1)</span>
        </button>

        <button
          id="nav-tab-tournaments"
          className={`segment-btn ${activeSection === 'tournaments' ? 'active tournament-active' : ''}`}
          onClick={() => setActiveSection('tournaments')}
        >
          <Trophy size={16} />
          <span>Tournament Leagues</span>
        </button>
      </div>

      {/* Render active domain view */}
      <div className="domain-view-content">
        {activeSection === 'games' && (
          <GamesView
            onNavigateToOmb={handleNavigateToOmb}
            onNavigateToTournament={handleNavigateToTournament}
          />
        )}
        {activeSection === 'ombs' && <OmbView initialGameId={targetGameId} />}
        {activeSection === 'tournaments' && (
          <TournamentsView initialGameId={targetGameId} />
        )}
      </div>
    </div>
  )
}
