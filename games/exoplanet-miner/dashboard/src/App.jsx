import React, { useState, useEffect, useMemo } from 'react';
import { VeritasKineticOrbital } from './VeritasKineticOrbital';

function CandidateCard({ candidate, onReevaluate, isReevaluating, isRecentlyEvaluated, reEvalProgress, lastLog }) {
  const { target, target_id, data, claim, ai_verdict, payload_hash, simbad } = candidate;
  const [oracleExpanded, setOracleExpanded] = useState(true);
  const [claimExpanded, setClaimExpanded] = useState(false);

  if (ai_verdict === "TERMINAL_SHUTDOWN" || ai_verdict === "AUTHORITY_DRIFT") {
    return (
      <div className="candidate-row glass-panel shutdown-row" style={{ borderColor: ai_verdict === 'AUTHORITY_DRIFT' ? 'var(--danger)' : '#444' }}>
        <div className="row-header">
          <h2>{target}</h2>
          <span className="verdict-badge" style={{ backgroundColor: ai_verdict === 'AUTHORITY_DRIFT' ? 'var(--danger)' : '#222', color: 'white' }}>{ai_verdict.replace('_', ' ')}</span>
        </div>
        <div style={{ padding: '20px', textAlign: 'center', color: ai_verdict === 'AUTHORITY_DRIFT' ? '#ff4444' : '#888', fontWeight: 'bold', letterSpacing: '1px' }}>
            {ai_verdict === 'TERMINAL_SHUTDOWN' ? 'CRITICAL METADATA MISSING. SYSTEM HALTED.' : 'CRYPTOGRAPHIC DISCREPANCY DETECTED. COMPONENT LOCKED.'}
        </div>
        {payload_hash && (
          <div style={{ padding: '8px 20px', fontSize: '0.6rem', color: '#555', borderTop: '1px solid #333', wordBreak: 'break-all', fontFamily: 'monospace' }}>
            <strong>ANCHOR Ω:</strong> {payload_hash}
          </div>
        )}
      </div>
    );
  }

  // Parse SIMBAD flags
  const flags = simbad?.flags || [];
  const hasRotating = flags.includes('ROTATING_VARIABLE');
  const hasEB = flags.includes('ECLIPSING_BINARY');
  const hasSubgiant = flags.includes('SUBGIANT');
  const hasKnownPlanets = flags.includes('KNOWN_PLANETS_IN_FIELD');

  // Tier Classification
  let tier = 'UNCLASSIFIED';
  if (simbad?.primary_id) {
    const simbadType = (simbad.object_type || '').toLowerCase();
    const spectralType = simbad.spectral_type || '';
    
    // Confound signatures — use string.includes() because SIMBAD types are composite
    // e.g. 'RotV*WUMa', 'EB*WUMa', 'sg*', 'LP*', 'Mi*'
    const confoundPatterns = ['ro*', 'v*', 'rg*', 'sb*', 'eb*', 'sg*', 'lp*', 'mi*'];
    const isConfounded = confoundPatterns.some(p => simbadType.includes(p)) ||
                         spectralType.includes('IV') ||
                         spectralType.includes('III') ||
                         flags.length > 0;
    
    if (isConfounded) {
      tier = 'TIER_B';
    } else if ((simbadType === '*' || simbadType === 'star') && flags.length === 0) {
      tier = 'TIER_A';
    }
  }

  return (
    <div className="candidate-row glass-panel">
      {/* === TOP BAR: Target ID + Verdict + Quick Stats === */}
      <div className="row-header">
        <div className="row-header-left">
          <h2>{target}</h2>
          <span className={`verdict-badge ${ai_verdict.toLowerCase()} ${ai_verdict !== 'PASS' ? 'heavy' : ''}`}>
            {ai_verdict === 'MODEL_BOUND' && <span className="verdict-icon">⚠</span>}
            {ai_verdict === 'INCONCLUSIVE' && <span className="verdict-icon">◌</span>}
            {ai_verdict}
          </span>
          <span className={`verdict-badge ${tier.toLowerCase()}`}>
            {tier.replace('_', ' ')}
          </span>
          {/* Verdict reason — heavier visual weight for non-PASS */}
          {ai_verdict === 'MODEL_BOUND' && (
            <span className="verdict-reason bound-reason">certainty bounded — external constraint</span>
          )}
          {ai_verdict === 'INCONCLUSIVE' && (
            <span className="verdict-reason inconc-reason">insufficient evidence to conclude</span>
          )}
          {/* SIMBAD flags as inline badges */}
          {hasRotating && <span className="flag-badge rotating">ROT★</span>}
          {hasEB && <span className="flag-badge eb">EB</span>}
          {hasSubgiant && <span className="flag-badge subgiant">IV</span>}
          {hasKnownPlanets && <span className="flag-badge planets">🪐</span>}
        </div>
        <div className="row-header-stats">
          <div className="stat-chip">
            <span className="stat-label">SNR</span>
            <span className="stat-value">{data.snr?.toFixed(2)}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-label">DEPTH</span>
            <span className="stat-value">{data.depth?.toExponential(2)}</span>
          </div>
          <div className="stat-chip">
            <span className="stat-label">PERIOD</span>
            <span className="stat-value">{data.period_days?.toFixed(3)}d</span>
          </div>
          <div className="stat-chip">
            <span className="stat-label">DURATION</span>
            <span className="stat-value">{data.duration_days?.toFixed(3)}d</span>
          </div>
          <div className="stat-chip coord-chip">
            <span className="stat-label">RA / DEC</span>
            <span className="stat-value">{data.ra !== undefined ? data.ra.toFixed(3) : 'N/A'} / {data.dec !== undefined ? data.dec.toFixed(3) : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* === MAIN CONTENT: 3-Zone Horizontal === */}
      <div className="row-body">
        {/* ZONE 1: Transit Plot (real matplotlib image) */}
        <div className="zone-visual">
          {data.plot_url ? (
            <div className="transit-plot-frame">
              <img src={data.plot_url} alt={`Transit plot for ${target}`} />
            </div>
          ) : (
            <div className="transit-plot-frame no-data">
              <span>NO TRANSIT PLOT</span>
            </div>
          )}
        </div>

        {/* ZONE 2: Orbital Visualization + SIMBAD Stellar Intel */}
        <div className="zone-orbital">
          {(data.period_days && data.depth) && (
            <VeritasKineticOrbital claimState={ai_verdict === 'PASS' ? 'SEALED' : ai_verdict} transitData={data} />
          )}
          {/* SIMBAD Stellar Card */}
          {simbad?.primary_id && (
            <div className="stellar-card">
              <div className="stellar-card-title">SIMBAD INTEL</div>
              <div className="stellar-row">
                <span className="stellar-key">HOST</span>
                <span className="stellar-val">{simbad.primary_id}</span>
              </div>
              {simbad.spectral_type && (
                <div className="stellar-row">
                  <span className="stellar-key">SpT</span>
                  <span className="stellar-val spt">{simbad.spectral_type}</span>
                </div>
              )}
              {simbad.object_type && (
                <div className="stellar-row">
                  <span className="stellar-key">TYPE</span>
                  <span className="stellar-val">{simbad.object_type}</span>
                </div>
              )}
              {simbad.distance_pc && (
                <div className="stellar-row">
                  <span className="stellar-key">DIST</span>
                  <span className="stellar-val">{simbad.distance_pc.toFixed(0)} pc</span>
                </div>
              )}
              {simbad.parallax_mas && (
                <div className="stellar-row">
                  <span className="stellar-key">PLX</span>
                  <span className="stellar-val">{simbad.parallax_mas.toFixed(4)} mas</span>
                </div>
              )}
              <div className="stellar-row">
                <span className="stellar-key">FIELD</span>
                <span className="stellar-val">{simbad.neighbor_count || 0} obj</span>
              </div>
            </div>
          )}
        </div>

        {/* ZONE 3: Claim + Oracle Intel */}
        <div className="zone-intel">
          <div className="claim-block">
            <div className="claim-title">VERITAS 1.3.1 CLAIM Ω</div>
            <div className="claim-bridge">We verify detection claims, not just generate them.</div>
            <div className="claim-id-row">
              <span className="claim-label">ID:</span>
              <span className="claim-hash">{claim ? claim.id : 'N/A'}</span>
            </div>
            <div className="claim-gates">
              <span className="gate passed">INTAKE</span>
              <span className="gate passed">EVIDENCE</span>
              <span className="gate passed">MATH</span>
              <span className="gate passed">SEALED</span>
            </div>
            <div className="claim-anchor">
              <span>ANCHOR:</span> {payload_hash}
            </div>

            {/* Collapsible Claim Structure */}
            <div className="claim-structure-toggle" onClick={() => setClaimExpanded(!claimExpanded)}>
              {claimExpanded ? '▾' : '▸'} CLAIM STRUCTURE
            </div>
            {claimExpanded && (
              <div className="claim-structure">
                <div className="struct-section">
                  <div className="struct-label">PRIMITIVES</div>
                  <div className="struct-row"><span>SNR</span><span>∈ [{data.snr?.toFixed(2)}] ± σ</span></div>
                  <div className="struct-row"><span>DEPTH</span><span>∈ [{data.depth?.toExponential(2)}]</span></div>
                  <div className="struct-row"><span>PERIOD</span><span>∈ [{data.period_days?.toFixed(3)}d]</span></div>
                  <div className="struct-row"><span>DURATION</span><span>∈ [{data.duration_days?.toFixed(3)}d]</span></div>
                </div>
                <div className="struct-section">
                  <div className="struct-label">BOUNDARIES</div>
                  <div className="struct-row"><span>SNR_THRESHOLD</span><span>SNR {'>'} 10.0</span></div>
                  <div className="struct-row"><span>DEPTH_LIMIT</span><span>DEPTH {'<'} 0.05</span></div>
                </div>
                <div className="struct-section">
                  <div className="struct-label">EVIDENCE</div>
                  <div className="struct-row"><span>SOURCE</span><span>Kepler Q1–Q17 MAST</span></div>
                  <div className="struct-row"><span>METHOD</span><span>BLS transit search</span></div>
                  <div className="struct-row"><span>TIER</span><span>B (reliable)</span></div>
                  {simbad?.primary_id && <div className="struct-row"><span>SIMBAD</span><span>{simbad.primary_id}</span></div>}
                </div>
              </div>
            )}
          </div>

          <div className="simbad-row">
            <span className="stellar-radius">
              {simbad?.spectral_type ? `${simbad.spectral_type}` : 'R: — R☉'}
              {simbad?.distance_pc ? ` · ${simbad.distance_pc.toFixed(0)} pc` : ''}
            </span>
            {(data.ra !== undefined && data.dec !== undefined) && (
              <a href={`http://simbad.u-strasbg.fr/simbad/sim-coo?Coord=${data.ra}+${data.dec}&Radius=2&Radius.unit=min`} target="_blank" rel="noreferrer" className="simbad-link">VERIFY AT SIMBAD ↗</a>
            )}
          </div>

          <div className="oracle-block">
            <div className="oracle-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <strong onClick={() => setOracleExpanded(!oracleExpanded)} style={{cursor:'pointer', flex: 1}}>
                {oracleExpanded ? '▾ ' : '▸ '}ORACLE REASONING
              </strong>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {isReevaluating && lastLog && (
                  <span style={{ fontSize: '0.75rem', color: '#ccc', fontStyle: 'italic', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastLog}
                  </span>
                )}
                
                <button
                  className={`scan-btn reeval-btn card-reeval-btn ${isReevaluating ? 'scanning' : ''} ${isRecentlyEvaluated ? 'success-pulse' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onReevaluate(target_id); }}
                  disabled={isReevaluating || isRecentlyEvaluated}
                  title="Re-evaluate with SIMBAD enrichment"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.7rem',
                    background: isRecentlyEvaluated ? 'rgba(76, 175, 80, 0.15)' : 'rgba(201, 168, 76, 0.15)',
                    color: isRecentlyEvaluated ? '#4caf50' : 'var(--gold)',
                    border: isRecentlyEvaluated ? '1px solid #4caf50' : '1px solid var(--gold)',
                    borderRadius: '4px',
                    cursor: (isReevaluating || isRecentlyEvaluated) ? 'not-allowed' : 'pointer',
                    opacity: (isReevaluating || isRecentlyEvaluated) ? 0.7 : 1,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {isReevaluating ? 'RE-EVALUATING...' : (isRecentlyEvaluated ? 'COMPLETED ✓' : 'RE-EVALUATE + SIMBAD')}
                </button>
              </div>
            </div>
            <div className={`oracle-body ${oracleExpanded ? 'expanded' : ''}`}>
              {candidate.ai_reasoning || 'No reasoning available.'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [candidates, setCandidates] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [reEvaluatingTarget, setReEvaluatingTarget] = useState(null);
  const [reEvalProgress, setReEvalProgress] = useState(null);
  const [recentlyEvaluatedTarget, setRecentlyEvaluatedTarget] = useState(null);
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const PAGE_SIZE = 8;

  const loadCandidates = () => {
    fetch('/api/candidates')
      .then(res => res.json())
      .then(data => {
        const mapped = data.map(dbRow => {
          // Parse SIMBAD flags from JSON string
          let simbadFlags = [];
          try {
            simbadFlags = dbRow.simbad_flags ? JSON.parse(dbRow.simbad_flags) : [];
          } catch { simbadFlags = []; }

          return {
            target: dbRow.target || dbRow.target_id,
            target_id: dbRow.target_id,
            ai_verdict: dbRow.verdict,
            ai_reasoning: dbRow.ai_reasoning,
            payload_hash: dbRow.claim_id,
            claim: { id: dbRow.claim_id },
            simbad: {
              primary_id: dbRow.simbad_id || null,
              spectral_type: dbRow.spectral_type || null,
              object_type: dbRow.object_type || null,
              distance_pc: dbRow.distance_pc || null,
              parallax_mas: dbRow.parallax_mas || null,
              flags: simbadFlags,
              neighbor_count: dbRow.simbad_neighbors || 0,
            },
            data: {
              snr: dbRow.snr,
              period_days: dbRow.period_days,
              duration_days: dbRow.duration_days,
              depth: dbRow.depth,
              ra: dbRow.ra,
              dec: dbRow.dec_coord,
              plot_url: dbRow.plot_url
            }
          };
        });
        setCandidates(mapped);
      })
      .catch(err => console.error("Could not fetch DB candidates", err));
  };

  useEffect(() => { loadCandidates(); }, []);

  const startScan = () => {
    console.log('[SCAN] startScan called, scanning:', scanning, 'reEvaluatingTarget:', reEvaluatingTarget);
    if (scanning || !!reEvaluatingTarget) return;
    setScanning(true);
    setLogs(['[+] Initiating scan...']);
    
    try {
      const es = new EventSource('/api/scan');
      console.log('[SCAN] EventSource created:', es.url, 'readyState:', es.readyState);
      
      es.onopen = () => {
        console.log('[SCAN] EventSource connected');
        setLogs(prev => [...prev.slice(-10), '[+] Connected to scan stream...']);
      };

      es.onmessage = (e) => {
        console.log('[SCAN] message received:', e.data.substring(0, 100));
        const event = JSON.parse(e.data);
        if (event.type === 'info') {
          setLogs(prev => [...prev.slice(-10), event.message]);
        } else if (event.type === 'candidate') {
          setCandidates(prev => {
              const existing = prev.find(c => c.target === event.data.target);
              if (existing) {
                  if (existing.payload_hash && existing.payload_hash !== event.data.payload_hash) {
                      return prev.map(c => c.target === event.data.target ? { ...c, ai_verdict: 'AUTHORITY_DRIFT' } : c);
                  }
                  return prev;
              }
              return [...prev, event.data];
          });
        } else if (event.type === 'done') {
          setLogs(prev => [...prev.slice(-10), event.message]);
          setScanning(false);
          es.close();
          loadCandidates();
        }
      };

      es.onerror = (err) => {
        console.error('[SCAN] EventSource error:', err, 'readyState:', es.readyState);
        setLogs(prev => [...prev.slice(-10), '[-] Connection to orchestrator closed or lost.']);
        setScanning(false);
        es.close();
      };
    } catch (err) {
      console.error('[SCAN] Failed to create EventSource:', err);
      setLogs(prev => [...prev.slice(-10), '[-] Failed to create scan connection: ' + err.message]);
      setScanning(false);
    }
  };

  const startReEval = (target_id) => {
    console.log('[RE-EVAL] startReEval called with target_id:', target_id, 'scanning:', scanning, 'reEvaluatingTarget:', reEvaluatingTarget);
    if (scanning || reEvaluatingTarget) return;
    setReEvaluatingTarget(target_id);
    setReEvalProgress(null);
    setLogs(['[+] Starting re-evaluation for ' + target_id + '...']);

    try {
      const url = `/api/re-evaluate/${target_id}`;
      console.log('[RE-EVAL] Creating EventSource:', url);
      const es = new EventSource(url);

      es.onopen = () => {
        console.log('[RE-EVAL] EventSource connected');
        setLogs(prev => [...prev.slice(-12), '[+] Connected to re-evaluation stream...']);
      };

      es.onmessage = (e) => {
        console.log('[RE-EVAL] message received:', e.data.substring(0, 100));
        const event = JSON.parse(e.data);
        if (event.type === 'info') {
          setLogs(prev => [...prev.slice(-12), event.message]);
        } else if (event.type === 're-eval-progress') {
          setReEvalProgress({ current: event.current, total: event.total, target: event.target, verdict: event.verdict });
        } else if (event.type === 're-eval-complete') {
          setReEvaluatingTarget(null);
          setRecentlyEvaluatedTarget(target_id);
          es.close();
          loadCandidates();
          setTimeout(() => {
            setRecentlyEvaluatedTarget(current => current === target_id ? null : current);
          }, 3000);
        }
      };

      es.onerror = (err) => {
        console.error('[RE-EVAL] EventSource error:', err, 'readyState:', es.readyState);
        setLogs(prev => [...prev.slice(-10), '[-] Re-evaluation connection lost.']);
        setReEvaluatingTarget(null);
        es.close();
        loadCandidates();
      };
    } catch (err) {
      console.error('[RE-EVAL] Failed to create EventSource:', err);
      setLogs(prev => [...prev.slice(-10), '[-] Failed: ' + err.message]);
      setReEvaluatingTarget(null);
    }
  };

  const passCt = candidates.filter(c => c.ai_verdict === 'PASS').length;
  const boundCt = candidates.filter(c => c.ai_verdict === 'MODEL_BOUND').length;
  const inconcCt = candidates.filter(c => c.ai_verdict === 'INCONCLUSIVE').length;

  // Filtered + paginated candidates
  const filteredCandidates = useMemo(() => {
    let filtered = candidates;
    if (verdictFilter !== 'ALL') {
      filtered = filtered.filter(c => c.ai_verdict === verdictFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        (c.target || '').toLowerCase().includes(q) ||
        (c.target_id || '').toString().includes(q)
      );
    }
    return filtered;
  }, [candidates, verdictFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedCandidates = filteredCandidates.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [verdictFilter, searchQuery]);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div className="top-bar-brand">
          <h1>VERITAS <span>TELEMETRY</span></h1>
          <p>Exoplanetary Candidate Dashboard</p>
        </div>
        <div className="top-bar-stats">
          <div className="summary-pill pass-pill"><span>{passCt}</span> PASS</div>
          <div className="summary-pill bound-pill"><span>{boundCt}</span> MODEL_BOUND</div>
          <div className="summary-pill inconc-pill"><span>{inconcCt}</span> INCONCLUSIVE</div>
          <div className="summary-pill total-pill"><span>{candidates.length}</span> TOTAL</div>
        </div>
        <div className="top-bar-actions">
          <button 
              className={`scan-btn ${scanning ? 'scanning' : ''}`}
              onClick={startScan}
              disabled={scanning || !!reEvaluatingTarget}
          >
              {scanning ? 'SCANNING SECTOR...' : 'INITIATE SCAN'}
          </button>
        </div>
      </header>
      
      {(scanning || !!reEvaluatingTarget) && (
        <div className="terminal-dock">
          {logs.map((log, i) => <div key={i}>{log}</div>)}
          <div className="cursor-blink">_</div>
        </div>
      )}

      {/* Search + Filter Toolbar */}
      <div className="search-toolbar">
        <div className="search-box">
          <span className="search-icon">⌕</span>
          <input
            id="candidate-search"
            type="text"
            placeholder="Search KIC targets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>
        <div className="verdict-filters">
          {['ALL', 'PASS', 'MODEL_BOUND', 'INCONCLUSIVE'].map(v => (
            <button
              key={v}
              className={`verdict-filter-btn ${verdictFilter === v ? 'active' : ''} ${v.toLowerCase()}`}
              onClick={() => setVerdictFilter(v)}
            >
              {v === 'ALL' ? `ALL (${candidates.length})` :
               v === 'PASS' ? `PASS (${passCt})` :
               v === 'MODEL_BOUND' ? `BOUND (${boundCt})` :
               `INCONC (${inconcCt})`}
            </button>
          ))}
        </div>
        <div className="page-info-inline">
          {filteredCandidates.length} result{filteredCandidates.length !== 1 ? 's' : ''}
        </div>
      </div>

      <main className="candidate-list">
        {pagedCandidates.map((candidate, idx) => (
          <CandidateCard 
            key={candidate.target_id || idx} 
            candidate={candidate} 
            onReevaluate={startReEval} 
            isReevaluating={reEvaluatingTarget === candidate.target_id}
            isRecentlyEvaluated={recentlyEvaluatedTarget === candidate.target_id}
            reEvalProgress={reEvaluatingTarget === candidate.target_id ? reEvalProgress : null}
            lastLog={reEvaluatingTarget === candidate.target_id ? logs[logs.length - 1] : null}
          />
        ))}
        {filteredCandidates.length === 0 && !scanning && (
          <div className="empty-state">
            {candidates.length === 0
              ? 'No anomalous lightcurves detected. Click INITIATE SCAN to begin.'
              : `No candidates match "${searchQuery}" with filter ${verdictFilter}.`}
          </div>
        )}
      </main>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav className="pagination-bar">
          <button
            className="page-btn page-nav"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
          >
            ‹ PREV
          </button>
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => {
              // Show first, last, current, and neighbors; ellipsis for gaps
              if (pg === 1 || pg === totalPages || (pg >= safePage - 1 && pg <= safePage + 1)) {
                return (
                  <button
                    key={pg}
                    className={`page-btn ${pg === safePage ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pg)}
                  >
                    {pg}
                  </button>
                );
              } else if (pg === safePage - 2 || pg === safePage + 2) {
                return <span key={pg} className="page-ellipsis">…</span>;
              }
              return null;
            })}
          </div>
          <button
            className="page-btn page-nav"
            disabled={safePage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            NEXT ›
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;
