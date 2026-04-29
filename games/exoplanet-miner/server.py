from flask import Flask, Response, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import sqlite3
import re
import time

# Ensure plots dir exists for image serving
os.makedirs("plots", exist_ok=True)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'candidates.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS candidates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target TEXT,
            target_id TEXT,
            verdict TEXT,
            ai_reasoning TEXT,
            snr REAL,
            period_days REAL,
            duration_days REAL,
            depth REAL,
            rp_rs_ratio REAL,
            stellar_rotation_period_days REAL,
            claim_id TEXT,
            payload_hash TEXT UNIQUE,
            is_novel INTEGER DEFAULT 0,
            data_source TEXT,
            ra REAL,
            dec_coord REAL,
            plot_url TEXT,
            flux_std REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    
    # Add new columns if they don't exist (for existing databases)
    migration_columns = [
        ("simbad_id", "TEXT"),
        ("spectral_type", "TEXT"),
        ("object_type", "TEXT"),
        ("distance_pc", "REAL"),
        ("parallax_mas", "REAL"),
        ("simbad_flags", "TEXT"),
        ("simbad_neighbors", "INTEGER DEFAULT 0"),
        ("stellar_radius_est", "TEXT"),
        ("flux_std", "REAL"),
        # NOTE: stellar_rotation_period_days already defined in CREATE TABLE
    ]
    
    for col_name, col_type in migration_columns:
        try:
            c.execute(f"ALTER TABLE candidates ADD COLUMN {col_name} {col_type}")
        except sqlite3.OperationalError:
            pass  # Column already exists
    
    conn.commit()
    conn.close()

init_db()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}})

@app.route('/api/health')
def health():
    return jsonify({"status": "online", "engine": "VERITAS Deep Space Discovery Engine v2.1.0"})

@app.route('/api/candidates')
def get_candidates():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM candidates ORDER BY created_at DESC')
    rows = c.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/candidates/novel')
def get_novel_candidates():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM candidates WHERE is_novel = 1 ORDER BY snr DESC')
    rows = c.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

@app.route('/api/stats')
def get_stats():
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT COUNT(*) as cnt FROM candidates')
    total = c.fetchone()['cnt']
    c.execute('SELECT COUNT(*) as cnt FROM candidates WHERE is_novel = 1')
    novel = c.fetchone()['cnt']
    c.execute("SELECT COUNT(*) as cnt FROM candidates WHERE verdict = 'PASS'")
    passed = c.fetchone()['cnt']
    c.execute("SELECT COUNT(*) as cnt FROM candidates WHERE verdict = 'PASS' AND is_novel = 1")
    novel_pass = c.fetchone()['cnt']
    conn.close()
    return jsonify({
        "total_scanned": total,
        "novel_candidates": novel,
        "passed_evaluation": passed,
        "novel_discoveries": novel_pass
    })

def persist_candidate(candidate_data):
    """Save a candidate to the SQLite database."""
    try:
        data = candidate_data.get('data', {})
        simbad = candidate_data.get('simbad', {})
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute('''
            INSERT OR IGNORE INTO candidates
            (target, target_id, verdict, ai_reasoning, snr, period_days, duration_days,
             depth, rp_rs_ratio, stellar_rotation_period_days, claim_id, payload_hash, is_novel, data_source, ra, dec_coord, plot_url,
             flux_std,
             simbad_id, spectral_type, object_type, distance_pc, parallax_mas, simbad_flags, simbad_neighbors, stellar_radius_est)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            candidate_data.get('target', ''),
            str(data.get('target_id', '')),
            candidate_data.get('ai_verdict', 'INCONCLUSIVE'),
            candidate_data.get('ai_reasoning', '')[:4000],
            data.get('snr', 0),
            data.get('period_days', 0),
            data.get('duration_days', 0),
            data.get('depth', 0),
            data.get('rp_rs_ratio', 0),
            data.get('stellar_rotation_period_days'),
            candidate_data.get('claim', {}).get('id', '') if candidate_data.get('claim') else '',
            candidate_data.get('payload_hash', ''),
            1 if candidate_data.get('is_novel', False) else 0,
            candidate_data.get('data_source', ''),
            data.get('ra', 0),
            data.get('dec', 0),
            data.get('plot_url', ''),
            data.get('flux_std'),
            simbad.get('primary_id', ''),
            simbad.get('spectral_type', ''),
            simbad.get('object_type', ''),
            simbad.get('distance_pc'),
            simbad.get('parallax_mas'),
            json.dumps(simbad.get('flags', [])),
            simbad.get('neighbor_count', 0),
            simbad.get('stellar_radius_est', ''),
        ))
        conn.commit()
        conn.close()
        print(f"[DB] Persisted: {candidate_data.get('target', '?')} ({candidate_data.get('ai_verdict', '?')})", flush=True)
    except Exception as e:
        print(f"[DB] Persistence error: {e}", flush=True)

@app.route('/api/scan')
def scan():
    from bulk_orchestrator import run_bulk_scan

    def generate():
        for event in run_bulk_scan():
            if event.get('type') == 'candidate':
                persist_candidate(event['data'])
            yield f"data: {json.dumps(event, default=str)}\n\n"
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/re-evaluate/<target_id>')
def re_evaluate(target_id):
    """Re-evaluate all existing candidates with SIMBAD enrichment + fixed oracle."""
    from transit_evaluator import evaluate_transit_data
    from simbad_lookup import enrich_candidate, format_for_oracle
    
    def generate():
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        c = conn.cursor()
        c.execute('SELECT id, target, snr, depth, period_days, duration_days, ra, dec_coord, target_id, stellar_rotation_period_days, flux_std FROM candidates WHERE target_id = ? ORDER BY id', (target_id,))
        rows = c.fetchall()
        total = len(rows)
        
        yield f"data: {json.dumps({'type': 'info', 'message': f'[RE-EVAL] Starting re-evaluation of {total} candidates with SIMBAD enrichment...'})}\n\n"
        
        for i, row in enumerate(rows):
            row = dict(row)
            cid = row['id']
            target = row.get('target', '?')
            
            yield f"data: {json.dumps({'type': 'info', 'message': f'[RE-EVAL] ({i+1}/{total}) Processing {target}...'})}\n\n"
            
            # Step 1: SIMBAD enrichment
            ra = row.get('ra', 0)
            dec = row.get('dec_coord', 0)
            simbad_data = {}
            stellar_context_text = None
            
            if ra is not None and dec is not None:
                try:
                    simbad_data = enrich_candidate(ra, dec)
                    stellar_context_text = format_for_oracle(simbad_data)
                    sid = simbad_data.get('primary_id', 'no match')
                    spt = simbad_data.get('spectral_type', '?')
                    sfl = str(simbad_data.get('flags', []))
                    msg = f'    SIMBAD: {sid} | {spt} | flags: {sfl}'
                    yield f"data: {json.dumps({'type': 'info', 'message': msg})}\n\n"
                except Exception as e:
                    emsg = f'    SIMBAD lookup failed: {str(e)}'
                    yield f"data: {json.dumps({'type': 'info', 'message': emsg})}\n\n"
            
            # Step 2: Re-run oracle with stellar context
            stored_depth = row.get('depth', 0)
            stored_rotation = row.get('stellar_rotation_period_days', None)
            stored_flux_std = row.get('flux_std', None)
            # Use actual flux_std if available, fall back to conservative estimate
            effective_flux_std = stored_flux_std if stored_flux_std is not None else (stored_depth * 0.3)
            
            data_for_oracle = {
                'target_id': row.get('target_id', target),
                'coordinate': f"{ra}, {dec}",
                'period_days': row.get('period_days', 0),
                'duration_days': row.get('duration_days', 0),
                'depth': stored_depth,
                'max_power': 0,
                'snr': row.get('snr', 0),
                'flux_std': effective_flux_std,
                'stellar_rotation_period_days': stored_rotation,
            }
            
            try:
                verdict_text = evaluate_transit_data(data_for_oracle, stellar_context=stellar_context_text)
            except Exception as e:
                verdict_text = f"[VERDICT: INCONCLUSIVE] Oracle error: {str(e)}"
            
            # Extract verdict from last line
            verdict = "INCONCLUSIVE"
            lines = [l.strip() for l in verdict_text.strip().splitlines() if l.strip()]
            if lines:
                last_line = lines[-1]
                match = re.search(r'\[VERDICT:\s*(PASS|MODEL_BOUND|INCONCLUSIVE|VIOLATION)\]', last_line, re.IGNORECASE)
                if match:
                    verdict = match.group(1).upper()
            
            # Step 3: Update DB
            update_conn = sqlite3.connect(DB_PATH)
            uc = update_conn.cursor()
            uc.execute('''
                UPDATE candidates SET 
                    verdict = ?,
                    ai_reasoning = ?,
                    simbad_id = ?,
                    spectral_type = ?,
                    object_type = ?,
                    distance_pc = ?,
                    parallax_mas = ?,
                    simbad_flags = ?,
                    simbad_neighbors = ?,
                    stellar_radius_est = ?
                WHERE id = ?
            ''', (
                verdict,
                verdict_text[:4000],
                simbad_data.get('primary_id', ''),
                simbad_data.get('spectral_type', ''),
                simbad_data.get('object_type', ''),
                simbad_data.get('distance_pc'),
                simbad_data.get('parallax_mas'),
                json.dumps(simbad_data.get('flags', [])),
                simbad_data.get('neighbor_count', 0),
                '',
                cid
            ))
            update_conn.commit()
            update_conn.close()
            
            yield f"data: {json.dumps({'type': 'info', 'message': f'    Oracle: {verdict} | reasoning: {len(verdict_text)} chars'})}\n\n"
            yield f"data: {json.dumps({'type': 're-eval-progress', 'current': i+1, 'total': total, 'target': target, 'verdict': verdict})}\n\n"
            
            # Rate limit SIMBAD queries (be nice to the service)
            time.sleep(1)
        
        conn.close()
        yield f"data: {json.dumps({'type': 'info', 'message': f'[RE-EVAL] Complete. {total} candidates re-evaluated with SIMBAD enrichment.'})}\n\n"
        yield f"data: {json.dumps({'type': 're-eval-complete', 'total': total})}\n\n"
    
    return Response(generate(), mimetype='text/event-stream')

@app.route('/api/plots/<path:filename>')
def serve_plot(filename):
    plots_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'plots')
    return send_from_directory(plots_dir, filename)

if __name__ == "__main__":
    print(" === VERITAS Deep Space Discovery Engine v2.1.0 ===")
    print(f" Database: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM candidates')
    print(f" Existing candidates: {c.fetchone()[0]}")
    conn.close()
    print(f" API: http://127.0.0.1:5050")
    print(f" Endpoints: /api/health, /api/scan, /api/candidates, /api/stats, /api/re-evaluate")
    # threaded=True is critical for SSE + concurrent API access
    app.run(host='127.0.0.1', port=5050, threaded=True)
